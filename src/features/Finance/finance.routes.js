const express = require('express');
const router = express.Router();
const financeController = require('./finance.controller');
const { authenticate, requireTenant, requireRoles, requirePlanFeature } = require('../Auth/auth.middleware');

router.use(authenticate, requireTenant);

router.get('/transactions', financeController.getAll);
router.post('/transactions', requireRoles('admin', 'gerente'), financeController.create);
router.put('/transactions/:id', requireRoles('admin', 'gerente'), financeController.update);
router.delete('/transactions/:id', requireRoles('admin'), financeController.delete);
router.patch('/transactions/:id/pay', requireRoles('admin', 'gerente'), financeController.markAsPaid);

// Legacy/Alternative routes
router.get('/', financeController.getAll);
router.get('/summary', requireRoles('admin', 'gerente'), requirePlanFeature('financial_reports'), financeController.getSummary);
router.get('/:id', financeController.getById);
router.post('/', requireRoles('admin', 'gerente'), financeController.create);
router.put('/:id', requireRoles('admin', 'gerente'), financeController.update);
router.delete('/:id', requireRoles('admin'), financeController.delete);
router.patch('/:id/pay', requireRoles('admin', 'gerente'), financeController.markAsPaid);

module.exports = router;
