const { TimeRecord, Professional } = require('../../models');

class TimeClockService {
    async punch(data, tenantId) {
        const { professionalId, type, time } = data;
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

        return record;
    }

    async getHistory(tenantId, professionalId) {
        const where = { tenant_id: tenantId };
        if (professionalId) where.professional_id = professionalId;

        return TimeRecord.findAll({
            where,
            order: [['date', 'DESC']],
            include: [{ model: Professional, as: 'professional', attributes: ['id'] }]
        });
    }

    async justify(data, tenantId) {
        const { recordId, type, reason, attachment } = data;

        const record = await TimeRecord.findOne({ where: { id: recordId, tenant_id: tenantId } });
        if (!record) throw new Error('Registro de ponto não encontrado');

        const justifications = [...record.justifications, { type, reason, attachment, approved: false }];
        await record.update({ justifications });

        return record;
    }
}

module.exports = new TimeClockService();
