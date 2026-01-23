const timeClockService = require('./time_clock.service');

exports.punch = async (req, res) => {
    try {
        const record = await timeClockService.punch(req.body, req.user.tenant_id);
        res.json(record);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getHistory = async (req, res) => {
    try {
        const history = await timeClockService.getHistory(req.user.tenant_id, req.query.professionalId);
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.justify = async (req, res) => {
    try {
        const record = await timeClockService.justify(req.body, req.user.tenant_id);
        res.json(record);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
