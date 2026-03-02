const { TimeRecord, Professional, Unit } = require('../../models');

class TimeClockService {
    async punch(data, tenantId) {
        const { professionalId, type, time, photo, location } = data;

        const professional = await Professional.findOne({
            where: { id: professionalId, tenant_id: tenantId }
        });

        if (!professional) throw new Error('Profissional não encontrado');

        // Strict Overtime Blocking Logic
        if (!professional.allow_overtime && (type === 'saida' || type === 'saida_pausa')) {
            const unit = await Unit.findOne({
                where: { name: professional.unit, tenant_id: tenantId }
            });

            if (unit && unit.closing_time) {
                const now = new Date();
                const [closeH, closeM] = unit.closing_time.split(':').map(Number);
                const closingDateTime = new Date();
                closingDateTime.setHours(closeH, closeM, 0, 0);

                // If current time is past closing time, block the punch
                if (now > closingDateTime) {
                    throw new Error(`Ponto bloqueado: horas extras não permitidas para este profissional. Horário de fechamento da unidade (${professional.unit}): ${unit.closing_time}.`);
                }
            }
        }

        const date = new Date().toISOString().split('T')[0];

        const newPunch = {
            time: punchTime,
            type,
            photo, // Base64 evidence
            location
        };

        if (!record) {
            record = await TimeRecord.create({
                tenant_id: tenantId,
                unit_id: data.unit_id,
                professional_id: professionalId,
                date,
                punches: [newPunch]
            });
        } else {
            const punches = [...record.punches, newPunch];
            await record.update({ punches });
        }

        return record;
    }

    async getHistory(tenantId, professionalId, unitId = null) {
        const where = { tenant_id: tenantId };
        if (professionalId) where.professional_id = professionalId;
        if (unitId) where.unit_id = unitId;

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
