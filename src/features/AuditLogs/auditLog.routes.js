const express = require('express');
const router = express.Router();
const auditLogController = require('./auditLog.controller');
const { authenticate } = require('../Auth/auth.middleware');

router.use(authenticate);

router.get('/', auditLogController.getLogs);

module.exports = router;
