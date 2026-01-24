const express = require('express');
const router = express.Router();
const crmController = require('./crm.controller');
const authMiddleware = require('../../features/Auth/auth.middleware');

router.get('/settings', authMiddleware.authenticate, crmController.getSettings);
router.put('/settings', authMiddleware.authenticate, crmController.updateSettings);
router.get('/leads', authMiddleware.authenticate, crmController.listLeads);
router.post('/leads', authMiddleware.authenticate, crmController.createLead);
router.patch('/leads/:id/status', authMiddleware.authenticate, crmController.updateLeadStatus);

module.exports = router;
