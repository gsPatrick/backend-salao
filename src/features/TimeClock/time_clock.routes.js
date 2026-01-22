const express = require('express');
const router = express.Router();
const timeClockController = require('./time_clock.controller');
const authMiddleware = require('../../features/Auth/auth.middleware');

router.post('/punch', authMiddleware.authenticate, timeClockController.punch);
router.get('/history', authMiddleware.authenticate, timeClockController.getHistory);
router.post('/justify', authMiddleware.authenticate, timeClockController.justify);

module.exports = router;
