const express = require('express');
const router = express.Router();
const aiController = require('./ai.controller');
const authMiddleware = require('../../features/Auth/auth.middleware');
const multer = require('multer');
const upload = multer();

router.get('/config', authMiddleware.authenticate, aiController.getConfig);
router.put('/config', authMiddleware.authenticate, aiController.updateConfig);
router.get('/chats', authMiddleware.authenticate, aiController.getChats);
router.patch('/chats/:chatId/status', authMiddleware.authenticate, aiController.toggleChatStatus);
router.post('/improve-text', authMiddleware.authenticate, aiController.improveText);
router.post('/chats/:chatId/message', authMiddleware.authenticate, aiController.sendManualMessage);
router.post('/chat/test', authMiddleware.authenticate, upload.single('audio'), aiController.testChat);
router.post('/upload-voice', authMiddleware.authenticate, upload.single('voice'), aiController.uploadVoice);
router.post('/upload-training-file', authMiddleware.authenticate, upload.single('file'), aiController.uploadTrainingFile);
router.post('/webhook/zapi', aiController.handleZapiWebhook);

module.exports = router;
