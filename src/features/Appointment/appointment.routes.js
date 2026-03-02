const express = require('express');
const router = express.Router();
const appointmentController = require('./appointment.controller');
const { authenticate, requireTenant } = require('../Auth/auth.middleware');

router.use(authenticate, requireTenant);

// Schedule Blocks
router.get('/blocks/all', appointmentController.getAllBlocks);
router.post('/blocks', appointmentController.createBlock);
router.delete('/blocks/:id', appointmentController.deleteBlock);

router.get('/availability', appointmentController.getAvailability);
router.get('/', appointmentController.getAll);
router.get('/date/:date', appointmentController.getByDate);
router.get('/professional/:professionalId', appointmentController.getByProfessional);
router.get('/:id', appointmentController.getById);
router.post('/', appointmentController.create);
router.put('/:id', appointmentController.update);
router.patch('/:id/cancel', appointmentController.cancel);
router.patch('/:id/refund', appointmentController.refund);
router.patch('/:id/status', appointmentController.updateStatus);
router.delete('/:id', appointmentController.delete);

module.exports = router;
