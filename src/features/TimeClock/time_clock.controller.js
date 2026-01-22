const { TimeRecord, Professional } = require('../../models');
const { Op } = require('sequelize');

exports.punch = async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { professionalId, type, time } = req.body;
        const date = new Date().toISOString().split('T')[0];

        let record = await TimeRecord.findOne({
            where: { tenant_id: tenantId, professional_id: professionalId, date }
        });

        if (!record) {
            record = await TimeRecord.create({
                tenant_id: tenantId,
                professional_id: professionalId,
                date,
                punches: [{ time, type }]
            });
        } else {
            const punches = [...record.punches, { time, type }];
            await record.update({ punches });
        }

        res.json(record);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getHistory = async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { professionalId } = req.query;

        const where = { tenant_id: tenantId };
        if (professionalId) where.professional_id = professionalId;

        const history = await TimeRecord.findAll({
            where,
            order: [['date', 'DESC']],
            include: [{ model: Professional, as: 'professional', attributes: ['id'] }]
        });

        res.json(history);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.justify = async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { recordId, type, reason, attachment } = req.body;

        const record = await TimeRecord.findOne({ where: { id: recordId, tenant_id: tenantId } });
        if (!record) return res.status(404).json({ message: 'Registro de ponto não encontrado' });

        const justifications = [...record.justifications, { type, reason, attachment, approved: false }];
        await record.update({ justifications });

        res.json(record);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
