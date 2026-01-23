const express = require('express');
const router = express.Router();
const aiController = require('./ai.controller');
const authMiddleware = require('../../features/Auth/auth.middleware');

router.get('/config', authMiddleware.authenticate, aiController.getConfig);
router.put('/config', authMiddleware.authenticate, aiController.updateConfig);
router.get('/chats', authMiddleware.authenticate, aiController.getChats);
router.patch('/chats/:chatId/status', authMiddleware.authenticate, aiController.toggleChatStatus);
router.post('/webhook/zapi', aiController.handleZapiWebhook);

module.exports = router;
