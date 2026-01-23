const financeService = require('./finance.service');

class FinanceController {
    async getAll(req, res) {
        try {
            const transactions = await financeService.getAll(req.tenantId, req.query);
            res.json({ success: true, data: transactions });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async getById(req, res) {
        try {
            const transaction = await financeService.getById(req.params.id, req.tenantId);
            res.json({ success: true, data: transaction });
        } catch (error) {
            res.status(404).json({ success: false, message: error.message });
        }
    }

    async create(req, res) {
        try {
            const data = { ...req.body, tenant_id: req.tenantId };
            const transaction = await financeService.create(data, req.tenantId);
            res.status(201).json({ success: true, data: transaction });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async update(req, res) {
        try {
            const transaction = await financeService.update(req.params.id, { ...req.body, tenant_id: req.tenantId }, req.tenantId);
            res.json({ success: true, data: transaction });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async delete(req, res) {
        try {
            const result = await financeService.delete(req.params.id, req.tenantId);
            res.json({ success: true, message: result.message });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async markAsPaid(req, res) {
        try {
            const transaction = await financeService.markAsPaid(req.params.id, req.tenantId);
            res.json({ success: true, data: transaction });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async getSummary(req, res) {
        try {
            const summary = await financeService.getSummary(req.tenantId, req.query.period);
            res.json({ success: true, data: summary });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
}

module.exports = new FinanceController();
