const timeClockService = require('./time_clock.service');
const { Professional } = require('../../models');

exports.punch = async (req, res) => {
    try {
        // Use professionalId from body, or fallback to finding professional by userId
        let professionalId = req.body.professionalId;
        if (!professionalId && req.userId) {
            const professional = await Professional.findOne({ where: { user_id: req.userId, tenant_id: req.tenantId } });
            if (professional) professionalId = professional.id;
        }
        if (!professionalId) {
            return res.status(400).json({ error: 'professionalId é obrigatório' });
        }
        const unitId = req.headers['x-unit-id'] || req.body.unit_id || req.body.unitId;
        const data = { ...req.body, professionalId, tenant_id: req.tenantId, unit_id: unitId };
        const record = await timeClockService.punch(data, req.tenantId);
        res.json(record);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getHistory = async (req, res) => {
    try {
        const unitId = req.headers['x-unit-id'] || req.query.unitId;
        const history = await timeClockService.getHistory(req.tenantId, req.query.professionalId, unitId);
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.justify = async (req, res) => {
    try {
        const record = await timeClockService.justify(req.body, req.tenantId);
        res.json(record);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
