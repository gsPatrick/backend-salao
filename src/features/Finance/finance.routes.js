const express = require('express');
const router = express.Router();
const financeController = require('./finance.controller');
const { authenticate, requireTenant, requireRoles, requirePlanFeature } = require('../Auth/auth.middleware');

router.use(authenticate, requireTenant);

router.get('/', financeController.getAll);
router.get('/summary', requirePlanFeature('financial_reports'), financeController.getSummary);
router.get('/:id', financeController.getById);
router.post('/', requireRoles('admin', 'gerente'), financeController.create);
router.put('/:id', requireRoles('admin', 'gerente'), financeController.update);
router.delete('/:id', requireRoles('admin'), financeController.delete);
router.patch('/:id/pay', requireRoles('admin', 'gerente'), financeController.markAsPaid);

module.exports = router;
