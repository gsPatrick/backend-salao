const timeClockService = require('./time_clock.service');

exports.punch = async (req, res) => {
    try {
        const data = { ...req.body, tenant_id: req.tenantId };
        const record = await timeClockService.punch(data, req.tenantId);
        res.json(record);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getHistory = async (req, res) => {
    try {
        const history = await timeClockService.getHistory(req.tenantId, req.query.professionalId);
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
