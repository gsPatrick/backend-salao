const financeService = require('./finance.service');
const { parseMonetaryValue } = require('../../utils/number');
const auditLogService = require('../../services/auditLog.service');

class FinanceController {
    async getAll(req, res) {
        try {
            const unitId = req.headers['x-unit-id'] || req.query.unitId;
            const filters = { ...req.query };
            if (unitId) filters.unitId = unitId;
            const transactions = await financeService.getAll(req.tenantId, filters);
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
            const unitId = req.headers['x-unit-id'] || req.body.unitId;

            // Sanitize numeric inputs
            const sanitizedBody = { ...req.body };
            if (sanitizedBody.amount) sanitizedBody.amount = parseMonetaryValue(sanitizedBody.amount);

            const data = { ...sanitizedBody, tenant_id: req.tenantId, unit_id: unitId };
            const transaction = await financeService.create(data, req.tenantId);

            await auditLogService.record(
                req.tenantId,
                req.userId,
                'cadastro',
                'Financeiro',
                transaction.id,
                `criou uma transação: ${transaction.description} (R$ ${transaction.amount})`,
                { unitId, ip: req.ip, userAgent: req.get('User-Agent') }
            );

            res.status(201).json({ success: true, data: transaction });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async update(req, res) {
        try {
            const unitId = req.headers['x-unit-id'] || req.body.unitId;

            // Sanitize numeric inputs
            const sanitizedBody = { ...req.body };
            if (sanitizedBody.amount) sanitizedBody.amount = parseMonetaryValue(sanitizedBody.amount);

            const transaction = await financeService.update(req.params.id, { ...sanitizedBody, tenant_id: req.tenantId, unit_id: unitId }, req.tenantId);

            await auditLogService.record(
                req.tenantId,
                req.userId,
                'edicao',
                'Financeiro',
                transaction.id,
                `editou a transação: ${transaction.description}`,
                { unitId, ip: req.ip, userAgent: req.get('User-Agent') }
            );

            res.json({ success: true, data: transaction });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async delete(req, res) {
        try {
            const result = await financeService.delete(req.params.id, req.tenantId);

            await auditLogService.record(
                req.tenantId,
                req.userId,
                'exclusao',
                'Financeiro',
                req.params.id,
                `excluiu a transação ID: ${req.params.id}`,
                { ip: req.ip, userAgent: req.get('User-Agent') }
            );

            res.json({ success: true, message: result.message });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async markAsPaid(req, res) {
        try {
            const transaction = await financeService.markAsPaid(req.params.id, req.tenantId);

            await auditLogService.record(
                req.tenantId,
                req.userId,
                'edicao',
                'Financeiro',
                transaction.id,
                `marcou como paga a transação: ${transaction.description}`,
                { unitId: transaction.unit_id, ip: req.ip, userAgent: req.get('User-Agent') }
            );

            res.json({ success: true, data: transaction });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async getSummary(req, res) {
        try {
            const unitId = req.headers['x-unit-id'] || req.query.unitId;
            const summary = await financeService.getSummary(req.tenantId, req.query.period, unitId);
            res.json({ success: true, data: summary });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
}

module.exports = new FinanceController();
