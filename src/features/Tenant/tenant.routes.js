const express = require('express');
const router = express.Router();
const tenantController = require('./tenant.controller');
const { authenticate, requireSuperAdmin } = require('../Auth/auth.middleware');

router.use(authenticate);

router.get('/', requireSuperAdmin, tenantController.getAll);
router.get('/:id', tenantController.getById);
router.post('/', requireSuperAdmin, tenantController.create);
router.put('/:id', requireSuperAdmin, tenantController.update);
router.delete('/:id', requireSuperAdmin, tenantController.delete);

module.exports = router;
