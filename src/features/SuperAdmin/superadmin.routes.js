const express = require('express');
const router = express.Router();
const superAdminController = require('./superadmin.controller');
const { authenticate, requireSuperAdmin } = require('../Auth/auth.middleware');

// Training Videos - Read is public (for all tenants to view)
router.get('/training-videos', authenticate, superAdminController.getAllVideos);
router.get('/training-videos/:id', authenticate, superAdminController.getVideoById);
// Write operations - Super Admin only
router.post('/training-videos', authenticate, requireSuperAdmin, superAdminController.createVideo);
router.put('/training-videos/:id', authenticate, requireSuperAdmin, superAdminController.updateVideo);
router.delete('/training-videos/:id', authenticate, requireSuperAdmin, superAdminController.deleteVideo);

// Ad Banners - Read is public
router.get('/banners', authenticate, superAdminController.getAllBanners);
router.get('/banners/:id', authenticate, superAdminController.getBannerById);
router.post('/banners/:id/click', authenticate, superAdminController.trackBannerClick);
// Write operations - Super Admin only
router.post('/banners', authenticate, requireSuperAdmin, superAdminController.createBanner);
router.put('/banners/:id', authenticate, requireSuperAdmin, superAdminController.updateBanner);
router.delete('/banners/:id', authenticate, requireSuperAdmin, superAdminController.deleteBanner);

module.exports = router;
