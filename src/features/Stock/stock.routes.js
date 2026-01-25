const express = require('express');
const router = express.Router();
const stockController = require('./stock.controller');
const authMiddleware = require('../../features/Auth/auth.middleware');

router.get('/products', authMiddleware.authenticate, stockController.listProducts);
router.get('/products/:id', authMiddleware.authenticate, stockController.getProduct);
router.post('/products', authMiddleware.authenticate, stockController.createProduct);
router.put('/products/:id', authMiddleware.authenticate, stockController.updateProduct);
router.delete('/products/:id', authMiddleware.authenticate, stockController.deleteProduct);
router.patch('/products/:id/suspend', authMiddleware.authenticate, stockController.toggleSuspend);
router.patch('/products/:id/favorite', authMiddleware.authenticate, stockController.toggleFavorite);
router.patch('/products/:id/quantity', authMiddleware.authenticate, stockController.updateQuantity);
router.post('/adjust', authMiddleware.authenticate, stockController.adjustStock);

module.exports = router;
