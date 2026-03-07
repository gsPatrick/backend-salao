const express = require('express');
const router = express.Router();
const professionalController = require('./professional.controller');
const { authenticate, requireTenant, requireRoles } = require('../Auth/auth.middleware');

router.use(authenticate, requireTenant);

router.get('/', professionalController.getAll);
router.get('/ranking', professionalController.getRanking);
router.get('/:id', professionalController.getById);
router.post('/', requireRoles('admin', 'gerente'), professionalController.create);
router.put('/:id', requireRoles('admin', 'gerente'), professionalController.update);
router.delete('/:id', requireRoles('admin', 'gerente'), professionalController.delete);
router.delete('/:id/purge', requireRoles('admin', 'gerente'), professionalController.purge);
router.patch('/:id/suspend', requireRoles('admin', 'gerente'), professionalController.suspend);
router.patch('/:id/archive', requireRoles('admin', 'gerente'), professionalController.archive);
router.patch('/:id/services', requireRoles('admin', 'gerente'), professionalController.assignServices);
router.get('/:id/reviews', professionalController.getReviews);
router.post('/reviews', professionalController.submitReview);

module.exports = router;
