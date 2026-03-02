const express = require('express');
const router = express.Router();
const reportController = require('./report.controller');
const authMiddleware = require('../../features/Auth/auth.middleware');

router.get('/financial', authMiddleware.authenticate, reportController.getFinancial);
router.get('/operational', authMiddleware.authenticate, reportController.getOperational);
router.get('/sales', authMiddleware.authenticate, reportController.getSales);

module.exports = router;
