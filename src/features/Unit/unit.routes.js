const express = require('express');
const router = express.Router();
const unitController = require('./unit.controller');
const { authenticate } = require('../../features/Auth/auth.middleware');

router.get('/', authenticate, unitController.getAll);
router.post('/', authenticate, unitController.create);
router.put('/:id', authenticate, unitController.update);
router.delete('/:id', authenticate, unitController.delete);

module.exports = router;
