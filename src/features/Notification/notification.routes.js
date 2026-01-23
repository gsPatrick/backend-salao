const express = require('express');
const router = express.Router();
const notificationController = require('./notification.controller');
const authMiddleware = require('../Auth/auth.middleware');

router.use(authMiddleware.authenticate);

router.get('/', notificationController.list);
router.patch('/:id/read', notificationController.markAsRead);

module.exports = router;
