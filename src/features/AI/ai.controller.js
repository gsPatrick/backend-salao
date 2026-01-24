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

/**
 * Handle Webhook from Z-API
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
        const TEST_NUMBER = '5571982862912';
        const isTestUser = phone.includes(TEST_NUMBER);

        if (!isTestUser) {
            console.log(`[AI Skipped] AI ignored message from ${phone} (Not the test number)`);
            // We still want to log it to history for monitoring
            await aiService.synchronizeUserMessage(aiConfig.tenant_id, phone, messageText);
            return res.json({ success: true, message: 'AI ignored per filter' });
        }

        // 3. Process with AI (Includes internal check for Manual status)
        const aiResponse = await aiService.processMessage(tenant.id, phone, messageText, isAudioIncoming);

        // 4. Send Response back
        const planAllowsAI = await aiService.checkPlanAllowsAI(tenant.id);

        if (aiResponse) {
            if (isAudioIncoming && planAllowsAI && aiConfig.is_voice_enabled) {
                // Respond with Audio if input was audio and plan/settings allow it
                console.log('[Z-API] Generating audio response...');
                const audioBuffer = await aiService.generateSpeech(aiResponse);
                await whatsappService.sendAudio(phone, audioBuffer);
            } else {
                // Default to Text response
                await whatsappService.sendMessage(phone, aiResponse);
            }
        }

        res.json({
            success: true,
            message: aiResponse,
            transcription: isAudioIncoming ? messageText : undefined
        });
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
