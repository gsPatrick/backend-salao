const express = require('express');
const router = express.Router();
const supportController = require('./support.controller');
const { authenticate } = require('../Auth/auth.middleware');

// All support routes require authentication
router.post('/', authenticate, supportController.createTicket);
router.get('/history', authenticate, supportController.listUserTickets);

module.exports = router;
