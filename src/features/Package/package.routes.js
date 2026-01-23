const express = require('express');
const router = express.Router();
const packageController = require('./package.controller');
const authMiddleware = require('../Auth/auth.middleware');

// Packages
router.get('/', authMiddleware.authenticate, packageController.listPackages);
router.post('/', authMiddleware.authenticate, packageController.createPackage);
router.put('/:id', authMiddleware.authenticate, packageController.updatePackage);
router.delete('/:id', authMiddleware.authenticate, packageController.deletePackage);
router.patch('/:id/toggle', authMiddleware.authenticate, packageController.togglePackage);

// Subscriptions
router.get('/subscriptions', authMiddleware.authenticate, packageController.listSubscriptions);
router.post('/subscriptions', authMiddleware.authenticate, packageController.createSubscription);
router.put('/subscriptions/:id', authMiddleware.authenticate, packageController.updateSubscription);
router.delete('/subscriptions/:id', authMiddleware.authenticate, packageController.deleteSubscription);
router.patch('/subscriptions/:id/archive', authMiddleware.authenticate, packageController.archiveSubscription);

module.exports = router;
