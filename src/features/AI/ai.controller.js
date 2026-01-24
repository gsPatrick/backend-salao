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
        const payload = req.body;
        console.log('[Z-API Webhook] Payload received');

        const phone = payload.phone;
        const instanceId = payload.instanceId;
        const fromMe = payload.fromMe;

        // 1. Identify AIAgentConfig and Tenant
        const aiConfig = await AIAgentConfig.findOne({
            where: { zapi_instance_id: instanceId }
        });

        if (!aiConfig) {
            console.warn(`[Z-API] No AIAgentConfig found for instanceId: ${instanceId}`);
            return res.status(200).json({ success: false, error: 'Tenant AI not configured for this instance' });
        }

        // Handle messages from the owner (human intervention)
        if (fromMe) {
            console.log(`[AI Webhook] Message from owner (fromMe). Syncing history.`);
            const messageToSync = payload.text?.message || (payload.audio?.audioUrl ? "[Áudio enviado]" : "[Mídia enviada]");
            await aiService.synchronizeMessage(aiConfig.tenant_id, phone, messageToSync);
            return res.status(200).json({ success: true, message: 'Message synced' });
        }

        const tenant = await Tenant.findByPk(aiConfig.tenant_id, {
            include: [{ model: Plan, as: 'plan' }]
        });

        // 2. Extract Message
        let messageText = '';
        let isAudioIncoming = false;

        if (payload.text?.message) {
            messageText = payload.text.message;
        } else if (payload.audio?.audioUrl) {
            isAudioIncoming = true;
            console.log('[Z-API] Processing audio message...');
            const audioBuffer = await whatsappService.downloadAudio(payload.audio.audioUrl);
            messageText = await aiService.transcribeAudio(audioBuffer);
            console.log(`[Z-API] Transcribed: "${messageText}"`);
        }

        if (!messageText) {
            return res.json({ success: true, message: 'No text content to process' });
        }

        // --- NEW: Restrict to test number during testing phase ---
        // Allowing both with and without 9th digit just in case
        const ALLOWED_NUMBERS = ['5571982862912', '557182862912'];
        const isTestUser = ALLOWED_NUMBERS.some(num => phone.includes(num));

        if (!isTestUser) {
            console.log(`[AI Skipped] AI ignored message from ${phone} (Not the test number)`);
            // We still want to log it to history for monitoring
            await aiService.synchronizeUserMessage(aiConfig.tenant_id, phone, messageText);
            return res.json({ success: true, message: 'AI ignored per filter' });
        }

        // --- Message Buffering Logic ---
        const bufferKey = `${aiConfig.tenant_id}:${phone}`;

        // 1. Always sync user message to history immediately for UI feedback
        await aiService.synchronizeUserMessage(aiConfig.tenant_id, phone, messageText);

        // 2. Clear existing timeout if any
        if (messageBuffer.has(bufferKey)) {
            clearTimeout(messageBuffer.get(bufferKey).timeout);
            const existingText = messageBuffer.get(bufferKey).text;
            messageText = `${existingText}\n${messageText}`; // Append new message
        }

        // 3. Set new timeout
        const timeout = setTimeout(async () => {
            try {
                console.log(`[AI Buffer] Processing buffered message for ${phone}: "${messageText}"`);
                messageBuffer.delete(bufferKey); // Clear buffer

                // 4. Process with AI (Includes internal check for Manual status)
                const aiResponse = await aiService.processMessage(tenant.id, phone, messageText, isAudioIncoming);

                // 5. Send Response back
                const voiceAllowed = isTestUser || (tenant.plan && tenant.plan.ai_voice_response);

                if (aiResponse) {
                    // Always respond with Voice if enabled in config and allowed by plan/test, 
                    // or if the input was audio.
                    if (voiceAllowed && aiConfig.is_voice_enabled) {
                        console.log('[Z-API] Generating audio response...');
                        const audioBuffer = await aiService.generateSpeech(aiResponse);
                        await whatsappService.sendAudio(phone, audioBuffer);
                    } else {
                        // Default to Text response
                        await whatsappService.sendMessage(phone, aiResponse);
                    }
                }
            } catch (err) {
                console.error('[AI Buffer Error]:', err);
            }
        }, 3000); // Wait 3 seconds

        // Store new timeout and accumulated text
        messageBuffer.set(bufferKey, { timeout, text: messageText });

        res.json({ success: true, message: 'Message buffered for AI processing' });

    } catch (error) {
        console.error('[Z-API Webhook Error]:', error);
        res.status(200).json({ success: false, error: error.message });
    }
};

/**
 * Get all AI conversations for the tenant
 */
exports.getChats = async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const chats = await AIChat.findAll({
            where: { tenant_id: tenantId },
            order: [['updated_at', 'DESC']]
        });
        res.json(chats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Toggle Chat Status (Active <-> Manual)
 */
exports.toggleChatStatus = async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { chatId } = req.params;
        const { status } = req.body; // 'active' or 'manual'

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

        // Send via WhatsApp Service (Z-API)
        await whatsappService.sendMessage(chat.customer_phone, text);

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

        // history comes as a string in multipart/form-data
        if (typeof history === 'string') {
            try {
                history = JSON.parse(history);
            } catch (e) {
                history = [];
            }
        }

        // 1. Identify AIAgentConfig
        const aiConfig = await AIAgentConfig.findOne({ where: { tenant_id: tenantId } });

        // 2. Handle Audio Input (STT)
        if (audioFile) {
            console.log('[AI Test Chat] Processing audio input...');
            message = await aiService.transcribeAudio(audioFile.buffer);
            console.log(`[AI Test Chat] Transcribed: "${message}"`);
        }

        if (!message) {
            return res.status(400).json({ error: 'Mensagem ou áudio é obrigatório' });
        }

        // 3. Process with AI
        const aiResponse = await aiService.processTestMessage(tenantId, message, history || []);

        // 4. Handle Voice Output (TTS) - Plan Restriction
        const tenant = await Tenant.findByPk(tenantId, { include: [{ model: Plan, as: 'plan' }] });
        const voiceAllowed = req.user?.is_super_admin || (tenant?.plan && tenant.plan.ai_voice_response);

        let audioBase64 = null;
        if (voiceAllowed && aiConfig?.is_voice_enabled && aiResponse) {
            console.log('[AI Test Chat] Generating audio response...');
            const audioBuffer = await aiService.generateSpeech(aiResponse);
            audioBase64 = audioBuffer.toString('base64');
        }

        res.json({
            success: true,
            message: aiResponse,
            userMessage: audioFile ? message : null, // Send back transcription for UI
            audio: audioBase64
        });
    } catch (error) {
        console.error('[AI Controller Test Chat Error]:', error);
        res.status(500).json({ error: error.message });
    }
};
