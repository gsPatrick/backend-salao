const express = require('express');
const router = express.Router();
const clientController = require('./client.controller');
const { authenticate, requireTenant } = require('../Auth/auth.middleware');

router.use(authenticate, requireTenant);

router.get('/', clientController.getAll);
router.get('/search', clientController.search);
router.get('/:id', clientController.getById);
router.post('/', clientController.create);
router.put('/:id', clientController.update);
router.delete('/:id', clientController.delete);
router.patch('/:id/block', clientController.block);

module.exports = router;
