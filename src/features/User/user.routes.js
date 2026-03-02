const express = require('express');
const router = express.Router();
const userController = require('./user.controller');
const { authenticate, requireRoles } = require('../Auth/auth.middleware');

router.use(authenticate);

router.get('/', requireRoles('admin', 'gerente'), userController.getAll);
router.get('/:id', userController.getById);
router.post('/', requireRoles('admin', 'gerente'), userController.create);
router.put('/:id', requireRoles('admin', 'gerente'), userController.update);
router.delete('/:id', requireRoles('admin'), userController.delete);
router.patch('/:id/toggle-suspend', requireRoles('admin'), userController.toggleSuspend);

module.exports = router;
