const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { authenticate } = require('./auth.middleware');

// Public routes
router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/forgot-password', authController.forgotPassword);

// Protected routes
router.post('/refresh', authenticate, authController.refreshToken);
router.get('/me', authenticate, authController.getProfile);
router.put('/password', authenticate, authController.changePassword);
router.post('/logout', authenticate, authController.logout);

module.exports = router;
