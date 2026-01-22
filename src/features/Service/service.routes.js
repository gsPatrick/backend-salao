const express = require('express');
const router = express.Router();
const serviceController = require('./service.controller');
const { authenticate, requireTenant, requireRoles } = require('../Auth/auth.middleware');

router.use(authenticate, requireTenant);

router.get('/', serviceController.getAll);
router.get('/:id', serviceController.getById);
router.post('/', requireRoles('admin', 'gerente'), serviceController.create);
router.put('/:id', requireRoles('admin', 'gerente'), serviceController.update);
router.delete('/:id', requireRoles('admin', 'gerente'), serviceController.delete);
router.patch('/:id/professionals', requireRoles('admin', 'gerente'), serviceController.assignProfessionals);

module.exports = router;
