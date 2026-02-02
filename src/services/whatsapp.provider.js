const { default: makeWASocket, DisconnectReason, fetchLatestBaileysVersion, downloadMediaMessage } = require('@whiskeysockets/baileys');
const pino = require('pino');
const { getIo } = require('../features/Chat/chat.socket');
const { usePostgresAuthState } = require('./whatsapp.auth');

// Map to store active sessions: tenantId -> socketInstance
const sessions = new Map();

// Function to get or create a session
const getSession = (tenantId) => {
    return sessions.get(tenantId);
};

// Function to connect a tenant
const connectToWhatsApp = async (tenantId) => {
    const logger = pino({ level: 'silent' }); // Set to 'debug' for detailed logs

    const { state, saveCreds } = await usePostgresAuthState(tenantId);
    const { version, isLatest } = await fetchLatestBaileysVersion();

    console.log(`[WhatsApp] Connecting Tenant ${tenantId} using Baileys v${version.join('.')}`);

    const sock = makeWASocket({
        version,
        logger,
        printQRInTerminal: false,
        auth: state,
        browser: ['Salao24h', 'Chrome', '1.0.0'],
        generateHighQualityLinkPreview: true,
        // Mark online logic can be added here
    });

    // Store session
    sessions.set(tenantId, sock);

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        const io = getIo();

        if (qr) {
            console.log(`[WhatsApp] QR Code generated for Tenant ${tenantId}`);
            if (io) {
                // Emit to the specific tenant room
                io.to(`tenant:${tenantId}`).emit('whatsapp:qr', { tenantId, qr });
            }
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(`[WhatsApp] Connection closed for Tenant ${tenantId}. Reconnecting: ${shouldReconnect}`);

            if (io) io.to(`tenant:${tenantId}`).emit('whatsapp:status', { tenantId, status: 'disconnected', reason: lastDisconnect?.error });

            if (shouldReconnect) {
                setTimeout(() => connectToWhatsApp(tenantId), 3000); // Retry logic
            } else {
                console.log(`[WhatsApp] Tenant ${tenantId} logged out. Session removed.`);
                sessions.delete(tenantId);
                if (fs.existsSync(authPath)) {
                    fs.rmSync(authPath, { recursive: true, force: true });
                }
                if (io) io.to(`tenant:${tenantId}`).emit('whatsapp:status', { tenantId, status: 'logged_out' });
            }
        } else if (connection === 'open') {
            console.log(`[WhatsApp] Connection opened for Tenant ${tenantId}`);
            if (io) io.to(`tenant:${tenantId}`).emit('whatsapp:status', { tenantId, status: 'connected' });
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        try {
            const msg = m.messages[0];
            if (!msg.message || m.type !== 'notify') return; // Ignore if no message content or not a notify event (e.g. initial sync)
            if (msg.key.fromMe) return; // Ignore own messages
            if (msg.key.remoteJid === 'status@broadcast') return; // Ignore status updates

            const isGroup = msg.key.remoteJid.endsWith('@g.us');
            if (isGroup) return; // Filter out groups as per requirement

            console.log(`[WhatsApp] New message for Tenant ${tenantId}`, msg.key.remoteJid);

            // Dynamic import to avoid circular dependency
            const aiController = require('../features/AI/ai.controller');

            const phone = msg.key.remoteJid.replace('@s.whatsapp.net', '');

            // Extract content
            const messageType = Object.keys(msg.message)[0];
            let text = '';
            let isAudio = false;
            let audioBuffer = null;

            if (messageType === 'conversation') {
                text = msg.message.conversation;
            } else if (messageType === 'extendedTextMessage') {
                text = msg.message.extendedTextMessage.text;
            } else if (messageType === 'audioMessage') {
                isAudio = true;
                // Download audio
                try {
                    // buffer
                    audioBuffer = await downloadMediaMessage(
                        msg,
                        'buffer',
                        { logger }, // Pass logger
                        {
                            // reuploadRequest: sock.updateMediaMessage
                        }
                    );
                } catch (e) {
                    console.error('Error downloading audio:', e);
                }
            }

            if (text || isAudio) {
                await aiController.handleInternalMessage(tenantId, phone, text, isAudio, audioBuffer);
            }

        } catch (err) {
            console.error('Error in messages.upsert:', err);
        }
    });

    return sock;
};

// Helpers
const deleteSession = (tenantId) => {
    const session = sessions.get(tenantId);
    if (session) {
        session.end(undefined);
        sessions.delete(tenantId);
    }
    // Auth data in DB is preserved unless explicitly deleted via another method (e.g. "disconnect completely")
    // For now, we keep it to allow reconnection without scanning QR provided the session is valid
};

const sendMessage = async (tenantId, phone, content, options = {}) => {
    const session = sessions.get(tenantId);
    if (!session) {
        throw new Error('WhatsApp not connected for this tenant');
    }

    // Ensure phone format
    const jid = phone.includes('@s.whatsapp.net') ? phone : `${phone.replace(/\D/g, '')}@s.whatsapp.net`;

    // Handle different content types
    if (typeof content === 'string') {
        return await session.sendMessage(jid, { text: content }, options);
    } else {
        // Assume content is object compatible with Baileys sendMessage (audio, image, etc)
        // Check for specific fields like 'audio'
        if (content.audio && Buffer.isBuffer(content.audio)) {
            // Baileys sendMessage supports Buffer directly
            return await session.sendMessage(jid, content, options);
        }
        return await session.sendMessage(jid, content, options);
    }
};

const getStatus = (tenantId) => {
    const session = sessions.get(tenantId);
    return session ? 'connected' : 'disconnected';
};

module.exports = {
    connectToWhatsApp,
    getSession,
    sendMessage,
    deleteSession,
    getStatus
};
