const { default: makeWASocket, DisconnectReason, fetchLatestBaileysVersion, downloadMediaMessage } = require('@whiskeysockets/baileys');
const pino = require('pino');
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
        const { getIo } = require('../features/Chat/chat.socket');
        const io = getIo();

        if (qr) {
            console.log(`[WhatsApp] QR Code generated for Tenant ${tenantId}`);
            if (io) {
                console.log(`[WhatsApp] Emitting QR to tenant:${tenantId}`);
                // Emit to the specific tenant room
                io.to(`tenant:${tenantId}`).emit('whatsapp:qr', { tenantId, qr });
            } else {
                console.error('[WhatsApp] IO instance not found when trying to emit QR');
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
                // Auth data in DB is preserved or handled by Baileys logout
                if (io) io.to(`tenant:${tenantId}`).emit('whatsapp:status', { tenantId, status: 'logged_out' });
            }
        } else if (connection === 'open') {
            console.log(`[WhatsApp] Connection opened for Tenant ${tenantId}`);
            if (io) io.to(`tenant:${tenantId}`).emit('whatsapp:status', { tenantId, status: 'connected' });
        }
    });

    sock.ev.on('messaging-history.upsert', async (history) => {
        try {
            const { chats, contacts, messages, isLatest } = history;
            console.log(`[WhatsApp History] Tenant ${tenantId}: ${messages?.length || 0} messages, ${chats?.length || 0} chats received.`);

            const contactMap = new Map();
            if (contacts) {
                contacts.forEach(c => {
                    if (c.id && (c.name || c.verifyName || c.notify)) {
                        contactMap.set(c.id, c.name || c.verifyName || c.notify);
                    }
                });
            }

            const aiController = require('../features/AI/ai.controller');
            if (messages) {
                for (const msg of messages) {
                    if (!msg.message) continue;
                    if (msg.key.remoteJid === 'status@broadcast') continue;
                    if (msg.key.remoteJid.endsWith('@g.us')) continue; // Ignore groups

                    const phone = msg.key.remoteJid.replace('@s.whatsapp.net', '');
                    const name = contactMap.get(msg.key.remoteJid) || msg.pushName || null;
                    const messageType = Object.keys(msg.message)[0];
                    let text = '';
                    if (messageType === 'conversation') text = msg.message.conversation;
                    else if (messageType === 'extendedTextMessage') text = msg.message.extendedTextMessage.text;

                    if (text) {
                        // Always skip AI for history import
                        await aiController.handleInternalMessage(tenantId, phone, text, false, null, msg.key.fromMe, true, name);
                    }
                }
            }
        } catch (err) {
            console.error('[WhatsApp History Error]:', err);
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        try {
            const msg = m.messages[0];
            if (!msg.message) return;
            if (msg.key.remoteJid === 'status@broadcast') return;

            const isGroup = msg.key.remoteJid.endsWith('@g.us');
            if (isGroup) return;

            // Determine if we should skip AI (history sync or own message)
            const isHistory = m.type !== 'notify';
            const isFromMe = msg.key.fromMe;
            const skipAI = isHistory || isFromMe;
            const pushName = msg.pushName || null;

            console.log(`[WhatsApp] ${isHistory ? 'History' : 'New message'} for Tenant ${tenantId} ${isFromMe ? '(Own)' : '(Remote)'}:`, msg.key.remoteJid, pushName ? `(${pushName})` : '');

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
                try {
                    audioBuffer = await downloadMediaMessage(
                        msg,
                        'buffer',
                        { logger }
                    );
                } catch (e) {
                    console.error('Error downloading audio:', e);
                }
            }

            if (text || isAudio) {
                await aiController.handleInternalMessage(tenantId, phone, text, isAudio, audioBuffer, isFromMe, skipAI, pushName);
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
