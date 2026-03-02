const express = require('express');
const router = express.Router();
const chatController = require('./chat.controller');
const authMiddleware = require('../../features/Auth/auth.middleware');

router.get('/contacts', authMiddleware.authenticate, chatController.getContacts);
router.get('/messages/:contactId', authMiddleware.authenticate, chatController.getMessages);
router.post('/messages', authMiddleware.authenticate, chatController.sendMessage);
router.post('/read', authMiddleware.authenticate, chatController.markAsRead);

module.exports = router;
