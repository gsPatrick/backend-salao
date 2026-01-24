const express = require('express');
const router = express.Router();
const paymentController = require('./payment.controller');
const { authenticate } = require('../Auth/auth.middleware');

// Public Webhook
router.post('/webhook', paymentController.handleWebhook);

// Protected routes
router.use(authenticate);
router.post('/subscribe', paymentController.createSubscription);

module.exports = router;
