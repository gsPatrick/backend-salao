const express = require('express');
const router = express.Router();
const planController = require('./plan.controller');
const { authenticate, requireSuperAdmin } = require('../Auth/auth.middleware');

// Public route - list plans
router.get('/', planController.getAll);
router.get('/:id', planController.getById);

// Super Admin only
router.post('/', authenticate, requireSuperAdmin, planController.create);
router.put('/:id', authenticate, requireSuperAdmin, planController.update);
router.delete('/:id', authenticate, requireSuperAdmin, planController.delete);

module.exports = router;
