const express = require('express');
const router = express.Router();
const auditLogController = require('./auditLog.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

router.use(authMiddleware);

router.get('/', auditLogController.getLogs);

module.exports = router;
