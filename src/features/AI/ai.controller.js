const AIAgentConfig = require('./ai_agent_config.model');
const aiService = require('../../services/ai.service');
const whatsappService = require('../../services/whatsapp.service');
const { Tenant, Plan, AIChat } = require('../../models');

exports.getConfig = async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        let config = await AIAgentConfig.findOne({ where: { tenant_id: tenantId } });

        if (!config) {
            config = await AIAgentConfig.create({ tenant_id: tenantId });
        }

        res.json(config);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateConfig = async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        let config = await AIAgentConfig.findOne({ where: { tenant_id: tenantId } });

        if (config) {
            await config.update(req.body);
            res.json(config);
        } else {
            config = await AIAgentConfig.create({ ...req.body, tenant_id: tenantId });
            res.json(config);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const messageBuffer = new Map();

/**
 * Handle Webhook from Z-API with Message Buffering
 */
exports.handleZapiWebhook = async (req, res) => {
    try {
        // Legacy Z-API webhook - kept for reference or fallback.
        // For custom engine, use handleInternalMessage.
        res.json({ success: true, message: 'Legacy endpoint' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Handle Incoming Message from Internal Provider (Baileys)
 * @param {string} tenantId 
 * @param {string} phone 
 * @param {string} messageText 
 * @param {boolean} isAudio 
 * @param {Buffer} audioBuffer 
 * @param {boolean} isFromMe
 * @param {boolean} skipAI
 * @param {string} name
 */
exports.handleInternalMessage = async (tenantId, phone, messageText, isAudio, audioBuffer, isFromMe = false, skipAI = false, name = null) => {
    try {
        // Normalize phone: Remove + and ensure format
        phone = phone.replace(/\D/g, '');

        console.log(`[Internal Message] Processing for Tenant ${tenantId}, Phone: ${phone}, isFromMe: ${isFromMe}, skipAI: ${skipAI}`);

        // 1. Identify Config & Tenant
        const aiConfig = await AIAgentConfig.findOne({ where: { tenant_id: tenantId } });
        const tenant = await Tenant.findByPk(tenantId, { include: [{ model: Plan, as: 'plan' }] });

        if (!aiConfig || !tenant) {
            console.warn(`[Internal] Config/Tenant not found for ID ${tenantId}`);
            return;
        }

        // --- Check if Support/Marketing channel is active ---
        const settings = tenant.settings || {};
        const isChannelActive = settings.support_active; // Default false if undefined

        if (!isChannelActive) {
            console.log(`[AI Skipped] Channel 'support_active' is OFF for Tenant ${tenant.id}.`);
            // Sync to history so user sees it in panel
            if (messageText) {
                if (isFromMe) {
                    await aiService.synchronizeMessage(tenantId, phone, messageText, name);
                } else {
                    await aiService.synchronizeUserMessage(tenantId, phone, messageText, name);
                }
            }
            return;
        }

        // Transcribe audio if needed
        if (isAudio && audioBuffer) {
            console.log('[Internal] Transcribing audio...');
            messageText = await aiService.transcribeAudio(audioBuffer);
            console.log(`[Internal] Transcribed: "${messageText}"`);
        }

        if (!messageText) return;

        // --- Test Number Restriction (Optional - Can be removed or configured) ---
        // const ALLOWED_NUMBERS = ['5571982862912', '557182862912'];
        // const isTestUser = process.env.NODE_ENV === 'development' ? ALLOWED_NUMBERS.some(num => phone.includes(num)) : true;
        const isTestUser = true;

        // --- Message Buffering Logic ---
        const bufferKey = `${tenantId}:${phone}`;

        // 1. Always sync message to history
        if (isFromMe) {
            await aiService.synchronizeMessage(tenantId, phone, messageText, name);
        } else {
            await aiService.synchronizeUserMessage(tenantId, phone, messageText, name);
        }

        // 2. Skip AI if requested or if message is from me
        if (skipAI || isFromMe) {
            console.log(`[Internal] AI Skip requested or message from me. Synced only.`);
            return;
        }

        // 2. Clear existing timeout
        if (messageBuffer.has(bufferKey)) {
            clearTimeout(messageBuffer.get(bufferKey).timeout);
            const existingText = messageBuffer.get(bufferKey).text;
            messageText = `${existingText}\n${messageText}`;
        }

        // 3. Set new timeout
        const timeout = setTimeout(async () => {
            try {
                console.log(`[AI Buffer] Processing buffered message for ${phone}: "${messageText}"`);
                messageBuffer.delete(bufferKey);

                // 4. Process with AI
                const aiResponse = await aiService.processMessage(tenantId, phone, messageText, isAudio);

                // 5. Send Response back
                const voiceAllowed = isTestUser || (tenant.plan && tenant.plan.ai_voice_response);

                if (aiResponse) {
                    if (voiceAllowed && aiConfig.is_voice_enabled) {
                        console.log('[Internal] Generating audio response...');
                        const voiceId = aiConfig.voice_id || 'alloy';
                        const speed = aiConfig.voice_settings?.speed || 1.0;
                        const responseAudioBuffer = await aiService.generateSpeech(aiResponse, voiceId, speed);

                        // Convert to base64 for local sending if needed, or pass buffer if service supports it.
                        // whatsapp.service currently expects 'data:audio' base64 or URL.
                        const base64Audio = `data:audio/mp3;base64,${responseAudioBuffer.toString('base64')}`;
                        await whatsappService.sendAudio(phone, base64Audio, tenant);
                    } else {
                        await whatsappService.sendMessage(phone, aiResponse, tenant);
                    }
                }
            } catch (err) {
                console.error('[AI Buffer Error]:', err);
            }
        }, 3000);

        messageBuffer.set(bufferKey, { timeout, text: messageText });

    } catch (error) {
        console.error('[Internal Message Error]:', error);
    }
};

exports.getChats = async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { unitId } = req.query;

        const where = { tenant_id: tenantId };
        if (unitId && unitId !== 'all') {
            where.unit_id = unitId;
        }

        const chats = await AIChat.findAll({
            where,
            order: [['updated_at', 'DESC']]
        });
        res.json(chats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.toggleChatStatus = async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { chatId } = req.params;
        const { status } = req.body;

        const chat = await AIChat.findOne({ where: { id: chatId, tenant_id: tenantId } });
        if (!chat) {
            return res.status(404).json({ error: 'Chat not found' });
        }

        await chat.update({ status });
        res.json(chat);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.improveText = async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).json({ error: 'Texto é obrigatório' });
        }

        const improvedText = await aiService.improveText(text);
        res.json({ text: improvedText });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.sendManualMessage = async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { chatId } = req.params;
        const { text } = req.body;

        const chat = await AIChat.findOne({ where: { id: chatId, tenant_id: tenantId } });
        if (!chat) {
            return res.status(404).json({ error: 'Chat not found' });
        }

        // Send via WhatsApp Service
        await whatsappService.sendMessage(chat.customer_phone, text, { id: tenantId });

        // Synchronize to history
        await aiService.synchronizeMessage(tenantId, chat.customer_phone, text);

        res.json({ success: true, message: text });
    } catch (error) {
        console.error('Error sending manual message:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.testChat = async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        let { message, history } = req.body;
        const audioFile = req.file;

        if (typeof history === 'string') {
            try {
                history = JSON.parse(history);
            } catch (e) {
                history = [];
            }
        }

        const aiConfig = await AIAgentConfig.findOne({ where: { tenant_id: tenantId } });

        if (audioFile) {
            console.log('[AI Test Chat] Processing audio input...');
            message = await aiService.transcribeAudio(audioFile.buffer);
            console.log(`[AI Test Chat] Transcribed: "${message}"`);
        }

        if (!message) {
            return res.status(400).json({ error: 'Mensagem ou áudio é obrigatório' });
        }

        const aiResponse = await aiService.processTestMessage(tenantId, message, history || []);

        const tenant = await Tenant.findByPk(tenantId, { include: [{ model: Plan, as: 'plan' }] });
        const voiceAllowed = req.user?.is_super_admin || (tenant?.plan && tenant.plan.ai_voice_response);

        let audioBase64 = null;
        if (voiceAllowed && aiConfig?.is_voice_enabled && aiResponse) {
            console.log('[AI Test Chat] Generating audio response...');
            const voiceId = aiConfig.voice_id || 'alloy';
            const speed = aiConfig.voice_settings?.speed || 1.0;
            const audioBuffer = await aiService.generateSpeech(aiResponse, voiceId, speed);
            audioBase64 = audioBuffer.toString('base64');
        }

        res.json({
            success: true,
            message: aiResponse,
            userMessage: audioFile ? message : null,
            audio: audioBase64
        });
    } catch (error) {
        console.error('[AI Controller Test Chat Error]:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.uploadVoice = async (req, res) => {
    try {
        if (!req.file) throw new Error('Nenhum arquivo enviado');
        const voiceUrl = `https://generated-voice-url.com/voice_${Date.now()}.mp3`;
        res.json({ success: true, url: voiceUrl });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

exports.uploadTrainingFile = async (req, res) => {
    try {
        if (!req.file) throw new Error('Nenhum arquivo enviado');

        const fileMetadata = {
            id: Date.now(),
            name: req.file.originalname,
            size: req.file.size,
            uploaded_at: new Date()
        };

        res.json({ success: true, file: fileMetadata });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};
