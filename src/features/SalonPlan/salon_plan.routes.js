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

module.exports = router;
