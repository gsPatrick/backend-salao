const express = require('express');
const router = express.Router();
const unitController = require('./unit.controller');
const { authenticate } = require('../../features/Auth/auth.middleware');

router.get('/', authenticate, unitController.getAll);

module.exports = router;
