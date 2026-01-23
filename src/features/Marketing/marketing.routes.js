const express = require('express');
const router = express.Router();
const marketingController = require('./marketing.controller');
const authMiddleware = require('../../features/Auth/auth.middleware');

// Campaigns
router.get('/campaigns', authMiddleware.authenticate, marketingController.listCampaigns);
router.post('/campaigns', authMiddleware.authenticate, marketingController.createCampaign);
router.put('/campaigns/:id', authMiddleware.authenticate, marketingController.updateCampaign);
router.delete('/campaigns/:id', authMiddleware.authenticate, marketingController.deleteCampaign);

// Channels
router.get('/channels', authMiddleware.authenticate, marketingController.listChannels);
router.post('/channels', authMiddleware.authenticate, marketingController.createChannel);
router.put('/channels/:id', authMiddleware.authenticate, marketingController.updateChannel);

// Direct Mail Campaigns
router.get('/direct-mail', authMiddleware.authenticate, marketingController.listDirectMail);
router.post('/direct-mail', authMiddleware.authenticate, marketingController.createDirectMail);
router.put('/direct-mail/:id', authMiddleware.authenticate, marketingController.updateDirectMail);
router.delete('/direct-mail/:id', authMiddleware.authenticate, marketingController.deleteDirectMail);

module.exports = router;
