const express = require('express');
const router = express.Router();
const adminController = require('./admin.controller');
const authMiddleware = require('../Auth/auth.middleware');

// Public or Authenticated? Prompt implies it's for the dashboard (authenticated users)
router.get('/banners', authMiddleware.authenticate, adminController.listBanners);

module.exports = router;
