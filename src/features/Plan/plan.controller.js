const planService = require('./plan.service');

class PlanController {
    async getAll(req, res) {
        try {
            const plans = await planService.getAll();
            res.json({ success: true, data: plans });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async getById(req, res) {
        try {
            const plan = await planService.getById(req.params.id);
            res.json({ success: true, data: plan });
        } catch (error) {
            res.status(404).json({ success: false, message: error.message });
        }
    }

    async create(req, res) {
        try {
            const plan = await planService.create(req.body);
            res.status(201).json({ success: true, data: plan });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async update(req, res) {
        try {
            const plan = await planService.update(req.params.id, req.body);
            res.json({ success: true, data: plan });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async delete(req, res) {
        try {
            const result = await planService.delete(req.params.id);
            res.json({ success: true, message: result.message });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
}

module.exports = new PlanController();
