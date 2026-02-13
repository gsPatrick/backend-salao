const express = require('express');
const router = express.Router();
const salonPlanController = require('./salon_plan.controller');
const { authenticate, requireTenant } = require('../Auth/auth.middleware');

router.use(authenticate, requireTenant);

router.get('/', salonPlanController.list);
router.post('/', salonPlanController.create);
router.put('/:id', salonPlanController.update);
router.delete('/:id', salonPlanController.delete);
router.patch('/:id/suspend', salonPlanController.toggleSuspend);
router.patch('/:id/favorite', salonPlanController.toggleFavorite);

// Subscriptions
router.get('/subscriptions', salonPlanController.listSubscriptions);
router.post('/subscriptions', salonPlanController.createSubscription);
router.put('/subscriptions/:id', salonPlanController.updateSubscription);
router.delete('/subscriptions/:id', salonPlanController.deleteSubscription);
router.patch('/subscriptions/:id/archive', salonPlanController.archiveSubscription);

module.exports = router;
