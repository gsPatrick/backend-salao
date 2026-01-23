const express = require('express');
const router = express.Router();
const contractController = require('./contract.controller');
const authMiddleware = require('../Auth/auth.middleware');

router.get('/templates', authMiddleware.authenticate, contractController.listTemplates);
router.post('/templates', authMiddleware.authenticate, contractController.createTemplate);
router.put('/templates/:id', authMiddleware.authenticate, contractController.updateTemplate);
router.delete('/templates/:id', authMiddleware.authenticate, contractController.deleteTemplate);

module.exports = router;
