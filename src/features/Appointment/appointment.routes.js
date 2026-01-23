const express = require('express');
const router = express.Router();
const appointmentController = require('./appointment.controller');
const { authenticate, requireTenant } = require('../Auth/auth.middleware');

router.use(authenticate, requireTenant);

router.get('/availability', appointmentController.getAvailability);
router.get('/', appointmentController.getAll);
router.get('/date/:date', appointmentController.getByDate);
router.get('/professional/:professionalId', appointmentController.getByProfessional);
router.get('/:id', appointmentController.getById);
router.post('/', appointmentController.create);
router.put('/:id', appointmentController.update);
router.patch('/:id/status', appointmentController.updateStatus);
router.patch('/:id/cancel', appointmentController.cancel);

module.exports = router;
