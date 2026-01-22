const { Appointment, Client, Professional, Service } = require('../../models');
const { Op } = require('sequelize');

class AppointmentService {
    async getAll(tenantId, filters = {}) {
        const where = { tenant_id: tenantId };

        if (filters.date) where.date = filters.date;
        if (filters.professional_id) where.professional_id = filters.professional_id;
        if (filters.client_id) where.client_id = filters.client_id;
        if (filters.status) where.status = filters.status;
        if (filters.dateFrom && filters.dateTo) {
            where.date = { [Op.between]: [filters.dateFrom, filters.dateTo] };
        }

        return Appointment.findAll({
            where,
            include: [
                { model: Client, as: 'client' },
                { model: Professional, as: 'professional' },
                { model: Service, as: 'service' },
            ],
            order: [['date', 'ASC'], ['time', 'ASC']],
        });
    }

    async getById(id, tenantId) {
        const appointment = await Appointment.findOne({
            where: { id, tenant_id: tenantId },
            include: [
                { model: Client, as: 'client' },
                { model: Professional, as: 'professional' },
                { model: Service, as: 'service' },
            ],
        });
        if (!appointment) throw new Error('Agendamento não encontrado');
        return appointment;
    }

    /**
     * Check if there's a conflicting appointment for the same professional, date, and time
     * @param {number} professionalId - Professional ID
     * @param {string} date - Appointment date (YYYY-MM-DD)
     * @param {string} time - Appointment start time (HH:MM)
     * @param {number} tenantId - Tenant ID
     * @param {number|null} excludeId - Appointment ID to exclude (for updates)
     * @returns {Promise<Appointment|null>} Conflicting appointment or null
     */
    async checkConflict(professionalId, date, time, tenantId, excludeId = null) {
        const where = {
            tenant_id: tenantId,
            professional_id: professionalId,
            date: date,
            time: time,
            status: { [Op.notIn]: ['cancelado', 'remarcado'] }, // Only check active appointments
        };

        if (excludeId) {
            where.id = { [Op.ne]: excludeId };
        }

        return Appointment.findOne({ where });
    }

    async create(data, tenantId, userId) {
        // Check for conflicting appointment
        if (data.professional_id && data.date && data.time) {
            const conflict = await this.checkConflict(
                data.professional_id,
                data.date,
                data.time,
                tenantId
            );

            if (conflict) {
                const error = new Error('Já existe um agendamento para este profissional neste horário');
                error.status = 409; // HTTP 409 Conflict
                error.conflictingAppointment = {
                    id: conflict.id,
                    date: conflict.date,
                    time: conflict.time,
                };
                throw error;
            }
        }

        // Calculate end time based on service duration
        if (data.service_id) {
            const service = await Service.findByPk(data.service_id);
            if (service) {
                const [hours, minutes] = data.time.split(':').map(Number);
                const endDate = new Date();
                endDate.setHours(hours, minutes + service.duration);
                data.end_time = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;
                data.price = data.price || service.price;
            }
        }

        return Appointment.create({
            ...data,
            tenant_id: tenantId,
            created_by_user_id: userId,
        });
    }

    async update(id, data, tenantId) {
        const appointment = await this.getById(id, tenantId);

        // Check for conflict if date, time, or professional is being changed
        const checkDate = data.date || appointment.date;
        const checkTime = data.time || appointment.time;
        const checkProfessional = data.professional_id || appointment.professional_id;

        if (data.date || data.time || data.professional_id) {
            const conflict = await this.checkConflict(
                checkProfessional,
                checkDate,
                checkTime,
                tenantId,
                id // Exclude current appointment
            );

            if (conflict) {
                const error = new Error('Já existe um agendamento para este profissional neste horário');
                error.status = 409;
                error.conflictingAppointment = {
                    id: conflict.id,
                    date: conflict.date,
                    time: conflict.time,
                };
                throw error;
            }
        }

        await appointment.update(data);
        return this.getById(id, tenantId);
    }

    async updateStatus(id, status, tenantId) {
        const appointment = await this.getById(id, tenantId);
        await appointment.update({ status });

        // Update client last visit if completed
        if (status === 'concluido') {
            await Client.increment('total_visits', { where: { id: appointment.client_id } });
            await Client.update({ last_visit_at: new Date() }, { where: { id: appointment.client_id } });
        }

        return this.getById(id, tenantId);
    }

    async cancel(id, tenantId) {
        return this.updateStatus(id, 'cancelado', tenantId);
    }

    async getByDate(date, tenantId) {
        return this.getAll(tenantId, { date });
    }

    async getByProfessional(professionalId, date, tenantId) {
        return this.getAll(tenantId, { professional_id: professionalId, date });
    }
}

module.exports = new AppointmentService();
