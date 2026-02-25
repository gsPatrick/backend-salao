const express = require('express');
const router = express.Router();
const ideaController = require('./idea.controller');
const authMiddleware = require('../../middlewares/auth');

router.get('/', authMiddleware.authenticate, ideaController.getAll);
router.post('/', authMiddleware.authenticate, ideaController.create);
router.delete('/:id', authMiddleware.authenticate, ideaController.delete);
router.post('/:id/vote', authMiddleware.authenticate, ideaController.toggleVote);

module.exports = router;
