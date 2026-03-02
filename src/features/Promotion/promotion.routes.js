const express = require('express');
const router = express.Router();
const promotionController = require('./promotion.controller');
const authMiddleware = require('../Auth/auth.middleware');

router.get('/', authMiddleware.authenticate, promotionController.list);
router.post('/', authMiddleware.authenticate, promotionController.create);
router.put('/:id', authMiddleware.authenticate, promotionController.update);
router.delete('/:id', authMiddleware.authenticate, promotionController.delete);
router.patch('/:id/toggle', authMiddleware.authenticate, promotionController.toggle);

module.exports = router;
