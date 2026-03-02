const express = require('express');
const router = express.Router();
const adminController = require('./admin.controller');
const authMiddleware = require('../Auth/auth.middleware');

// Public or Authenticated? Prompt implies it's for the dashboard (authenticated users)
router.get('/banners', authMiddleware.authenticate, adminController.listBanners);
router.post('/banners', authMiddleware.authenticate, adminController.createBanner);
router.put('/banners/:id', authMiddleware.authenticate, adminController.updateBanner);
router.delete('/banners/:id', authMiddleware.authenticate, adminController.deleteBanner);


module.exports = router;
