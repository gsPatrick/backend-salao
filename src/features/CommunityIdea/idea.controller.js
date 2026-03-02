const ideaService = require('./idea.service');

class IdeaController {
    async getAll(req, res) {
        try {
            const ideas = await ideaService.getAll();
            res.json({ success: true, data: ideas });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async create(req, res) {
        try {
            const idea = await ideaService.create(req.body, req.userId);
            res.status(201).json({ success: true, data: idea });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async delete(req, res) {
        try {
            await ideaService.delete(req.params.id, req.userId, req.user.is_super_admin);
            res.json({ success: true, message: 'Ideia excluída com sucesso' });
        } catch (error) {
            res.status(403).json({ success: false, message: error.message });
        }
    }

    async toggleVote(req, res) {
        try {
            const result = await ideaService.toggleVote(req.params.id, req.userId);
            res.json({ success: true, ...result });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
}

module.exports = new IdeaController();
