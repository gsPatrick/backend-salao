const { Appointment, Client, Professional, Service, MonthlyPackage, SalonPlan, sequelize } = require('../../models');
const { Op, Transaction } = require('sequelize');

class AppointmentService {
    async getAll(tenantId, filters = {}) {
        const where = { tenant_id: tenantId };

        if (filters.date) where.date = filters.date;
        if (filters.professional_id) where.professional_id = filters.professional_id;
        if (filters.client_id) where.client_id = filters.client_id;
        if (filters.status) where.status = filters.status;
        if (filters.unitId) where.unit_id = filters.unitId; // Add unit filter

        if (filters.dateFrom && filters.dateTo) {
            where.date = { [Op.between]: [filters.dateFrom, filters.dateTo] };
        }

        const appointments = await Appointment.findAll({
            where,
            include: [
                { model: Client, as: 'client' },
                { model: Professional, as: 'professional' },
                { model: Service, as: 'service' },
            ],
            order: [['date', 'ASC'], ['time', 'ASC']],
        });

        // Apply Social Name mapping for associations
        return appointments.map(apt => {
            const data = apt.toJSON();
            if (data.client) {
                const useSocial = data.client.use_social_name || data.client.preferences?.useSocialName;
                if (useSocial && data.client.social_name) {
                    data.client.legal_name = data.client.name;
                    data.client.name = data.client.social_name;
                } else {
                    data.client.legal_name = data.client.name;
                }
                data.client.use_social_name = !!useSocial;
            }
            if (data.professional) {
                const useSocial = data.professional.use_social_name;
                if (useSocial && data.professional.social_name) {
                    data.professional.legal_name = data.professional.name;
                    data.professional.name = data.professional.social_name;
                } else {
                    data.professional.legal_name = data.professional.name;
                }
                data.professional.use_social_name = !!useSocial;
            }
            return data;
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

        const data = appointment.toJSON();
        if (data.client) {
            const useSocial = data.client.use_social_name || data.client.preferences?.useSocialName;
            if (useSocial && data.client.social_name) {
                data.client.legal_name = data.client.name;
                data.client.name = data.client.social_name;
            } else {
                data.client.legal_name = data.client.name;
            }
            data.client.use_social_name = !!useSocial;
        }
        if (data.professional) {
            const useSocial = data.professional.use_social_name;
            if (useSocial && data.professional.social_name) {
                data.professional.legal_name = data.professional.name;
                data.professional.name = data.professional.social_name;
            } else {
                data.professional.legal_name = data.professional.name;
            }
            data.professional.use_social_name = !!useSocial;
        }
        return data;
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
            status: { [Op.notIn]: ['cancelado', 'reagendado'] }, // Only check active appointments
        };

        if (excludeId) {
            where.id = { [Op.ne]: excludeId };
        }

        return Appointment.findOne({ where });
    }

    async create(data, tenantId, userId) {
        // Use a SERIALIZABLE transaction to prevent race conditions
        return sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE }, async (t) => {
            // Normalize and Validate Status
            const allowedStatuses = ['agendado', 'confirmado', 'em_atendimento', 'concluido', 'faltou', 'cancelado', 'reagendado'];
            if (data.status) {
                data.status = data.status.toLowerCase();
                if (!allowedStatuses.includes(data.status)) {
                    data.status = 'agendado'; // Default to agendado if invalid
                }
            } else {
                data.status = 'agendado';
            }

            // Validate Item Presence (at least one of Service, Package, or Plan)
            if (!data.service_id && !data.package_id && !data.salon_plan_id) {
                const error = new Error('É necessário selecionar um Serviço, Pacote ou Plano para criar um agendamento');
                error.status = 400;
                throw error;
            }

            // Check for conflicting appointment within transaction
            if (data.professional_id && data.date && data.time) {
                const conflict = await Appointment.findOne({
                    where: {
                        tenant_id: tenantId,
                        professional_id: data.professional_id,
                        date: data.date,
                        time: data.time,
                        status: { [Op.notIn]: ['cancelado', 'reagendado'] },
                    },
                    transaction: t,
                    lock: t.LOCK.UPDATE, // Lock the row to prevent concurrent modifications
                });

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

            // Calculate end time based on item duration
            let item = null;
            let duration = 60; // Default duration
            let price = 0;

            if (data.service_id) {
                item = await Service.findByPk(data.service_id, { transaction: t });
                if (item) {
                    duration = item.duration || 60;
                    price = item.price;
                }
            } else if (data.package_id) {
                item = await MonthlyPackage.findByPk(data.package_id, { transaction: t });
                if (item) {
                    duration = 60; // Packages don't have duration in mins, default 60
                    price = item.price;
                }
            } else if (data.salon_plan_id) {
                item = await SalonPlan.findByPk(data.salon_plan_id, { transaction: t });
                if (item) {
                    duration = 60; // Plans don't have duration in mins, default 60
                    price = item.price;
                }
            }

            if (!item) {
                const error = new Error('Item (Serviço/Pacote/Plano) não encontrado');
                error.status = 404;
                throw error;
            }

            if (!data.end_time) {
                const [hours, minutes] = data.time.split(':').map(Number);
                const endDate = new Date();
                endDate.setHours(hours, minutes + duration);
                data.end_time = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;
            }
            data.price = data.price || price;

            const appointment = await Appointment.create({
                ...data,
                tenant_id: tenantId,
                unit_id: data.unit_id,
                created_by_user_id: userId,
            }, { transaction: t });

            // Real-time CRM hook (out of transaction to avoid blocking)
            const today = new Date().toISOString().split('T')[0];
            if (data.date === today) {
                const crmAutomationService = require('../../services/crm_automation.service');
                Client.findByPk(data.client_id).then(client => {
                    if (client) {
                        crmAutomationService.handleScheduledToday(tenantId, client, appointment).catch(err =>
                            console.error('[CRM Hook Error] handleScheduledToday:', err)
                        );
                    }
                });
            }

            return appointment;
        });
    }

    async update(id, data, tenantId) {
        const appointmentInstance = await Appointment.findOne({ where: { id, tenant_id: tenantId } });
        if (!appointmentInstance) throw new Error('Agendamento não encontrado');

        const appointmentData = appointmentInstance.toJSON();

        // Check for conflict if date, time, or professional is being changed
        const checkDate = data.date || appointmentData.date;
        const checkTime = data.time || appointmentData.time;
        const checkProfessional = data.professional_id || appointmentData.professional_id;

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

        await appointmentInstance.update(data);
        return this.getById(id, tenantId);
    }

    async updateStatus(id, status, tenantId) {
        const appointmentInstance = await Appointment.findOne({
            where: { id, tenant_id: tenantId },
            include: [
                { model: Client, as: 'client' },
                { model: Service, as: 'service' }
            ]
        });
        if (!appointmentInstance) throw new Error('Agendamento não encontrado');

        const oldStatus = appointmentInstance.status;
        await appointmentInstance.update({ status });

        const crmAutomationService = require('../../services/crm_automation.service');

        // Financial integration: Create transaction when completed
        const completionStatuses = ['concluido'];
        if (completionStatuses.includes(status) && !completionStatuses.includes(oldStatus)) {
            try {
                // Update Client Statistics (Total Visits, Last Visit) - Absolute Sync
                const clientService = require('../Client/client.service');
                await clientService.updateStatistics(appointmentInstance.client_id);

                const financeService = require('../Finance/finance.service');
                await financeService.create({
                    type: 'receita',
                    category: 'Serviço',
                    amount: appointmentInstance.price || 0,
                    date: appointmentInstance.date,
                    description: `Atendimento: ${appointmentInstance.client?.name || 'Cliente'} - ${appointmentInstance.service?.name || 'Serviço'}`,
                    status: 'pago',
                    unit: appointmentInstance.unit,
                    appointment_id: appointmentInstance.id
                }, tenantId);
            } catch (error) {
                console.error('[Finance/Stats Hook Error]:', error);
            }
        }

        // Update client status if faltante
        if (status === 'faltante') {
            await Client.update({ status: 'Faltante' }, { where: { id: appointmentInstance.client_id } });

            // Real-time CRM hook
            crmAutomationService.handleAbsent(tenantId, appointmentInstance.client).catch(err =>
                console.error('[CRM Hook Error] handleAbsent:', err)
            );
        }

        if (status === 'reagendado') {
            // Real-time CRM hook
            crmAutomationService.handleRescheduled(tenantId, appointmentInstance.client, appointmentInstance).catch(err =>
                console.error('[CRM Hook Error] handleRescheduled:', err)
            );
        }

        return this.getById(id, tenantId);
    }

    async cancel(id, tenantId) {
        return this.updateStatus(id, 'cancelado', tenantId);
    }

    async delete(id, tenantId) {
        console.log(`[AppointmentService] DELETE called for id=${id}, tenantId=${tenantId}`);
        const appointment = await Appointment.findOne({
            where: { id, tenant_id: tenantId }
        });
        if (!appointment) {
            console.log(`[AppointmentService] Appointment id=${id} NOT FOUND`);
            throw new Error('Agendamento não encontrado');
        }
        console.log(`[AppointmentService] Found appointment id=${id}, destroying...`);
        await appointment.destroy();
        console.log(`[AppointmentService] Appointment id=${id} DESTROYED successfully`);
        return { id, deleted: true };
    }

    async getByDate(date, tenantId, unitId = null) {
        return this.getAll(tenantId, { date, unitId });
    }

    async getByProfessional(professionalId, date, tenantId, unitId = null) {
        return this.getAll(tenantId, { professional_id: professionalId, date, unitId });
    }

    /**
     * Get available time slots for a professional on a given date
     * @param {number} professionalId - Professional ID
     * @param {string} date - Date (YYYY-MM-DD)
     * @param {number} serviceId - Service ID (for duration)
     * @param {number} tenantId - Tenant ID
     * @returns {Promise<string[]>} Array of available time slots
     */
    async getAvailability(professionalId, date, serviceId, tenantId, unitId = null) {
        let professional;

        if (professionalId) {
            professional = await Professional.findOne({
                where: {
                    id: professionalId,
                    tenant_id: tenantId,
                    is_suspended: false,
                    is_archived: false,
                }
            });
        } else {
            // Pick first professional of the specific unit if unitId is provided
            const profWhere = {
                tenant_id: tenantId,
                is_suspended: false,
                is_archived: false
            };
            if (unitId) profWhere.unit_id = unitId;

            professional = await Professional.findOne({ where: profWhere });
            if (professional) {
                professionalId = professional.id;
            }
        }

        if (!professional) {
            throw new Error('Profissional não disponível para esta unidade ou serviço');
        }

        // Fetch blocks for this professional
        const { ScheduleBlock } = require('../../models');
        const blocks = await ScheduleBlock.findAll({
            where: {
                tenant_id: tenantId,
                professional_id: professionalId,
                date: date
            }
        });

        // Fetch Tenant to check business hours
        const { Tenant: TenantModel } = require('../../models');
        const tenant = await TenantModel.findByPk(tenantId);
        if (!tenant) throw new Error('Tenant não encontrado');

        const defaultHours = [
            { day: 'segunda-feira', open: true, start: '09:00', end: '22:00' },
            { day: 'terça-feira', open: true, start: '09:00', end: '22:00' },
            { day: 'quarta-feira', open: true, start: '09:00', end: '22:00' },
            { day: 'quinta-feira', open: true, start: '09:00', end: '22:00' },
            { day: 'sexta-feira', open: true, start: '09:00', end: '22:00' },
            { day: 'sábado', open: false, start: '09:00', end: '13:00' },
            { day: 'domingo', open: false, start: '09:00', end: '12:00' }
        ];

        const businessHours = (Array.isArray(tenant.business_hours) && tenant.business_hours.length > 0)
            ? tenant.business_hours
            : defaultHours;

        // --- NEW: Unit Specific Hours ---
        let unitOpening = null;
        let unitClosing = null;
        if (professional && professional.unit) {
            const { Unit: UnitModel } = require('../../models');
            const unit = await UnitModel.findOne({
                where: { tenant_id: tenantId, name: professional.unit }
            });
            if (unit) {
                unitOpening = unit.opening_time;
                unitClosing = unit.closing_time;
                console.log(`[Availability] Using Unit (${unit.name}) hours: ${unitOpening} - ${unitClosing}`);
            }
        }
        // -------------------------------

        const availabilityDate = new Date(date + 'T00:00:00');
        const dayOfWeekIndex = availabilityDate.getDay();
        const daysMap = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
        const dayOfWeekLabel = daysMap[dayOfWeekIndex];

        // Find salon hours for this day
        const salonDay = businessHours.find(bh =>
            bh && bh.day && bh.day.toLowerCase().trim() === dayOfWeekLabel
        );

        if (!salonDay || !salonDay.open) {
            return []; // Salon is closed or day not found
        }

        // --- Intersect with Unit Hours if specified ---
        let startTime = professional.start_time || '09:00';
        let endTime = professional.end_time || '22:00';
        let lunchStart = professional.lunch_start || '12:00';
        let lunchEnd = professional.lunch_end || '13:00';

        if (unitOpening) startTime = startTime > unitOpening ? startTime : unitOpening;
        if (unitClosing) endTime = endTime < unitClosing ? endTime : unitClosing;

        // Override/Intersect with Salon Business Hours if present
        if (salonDay && salonDay.start && salonDay.end) {
            // Business logic: Professional cannot work before salon opens or after it closes
            startTime = startTime > salonDay.start ? startTime : salonDay.start;
            endTime = endTime < salonDay.end ? endTime : salonDay.end;

            // Lunch override if business hours specify lunch (optional but consistent)
            if (salonDay.lunchStart && salonDay.lunchEnd) {
                lunchStart = salonDay.lunchStart;
                lunchEnd = salonDay.lunchEnd;
            }
        }
        // --------------------------------------------

        // Get service duration (default 30 min)
        let serviceDuration = 30;
        if (serviceId) {
            const service = await Service.findByPk(serviceId);
            if (service) {
                serviceDuration = service.duration || 30;
            }
        }

        // Get existing appointments for this professional on this date
        const existingAppointments = await Appointment.findAll({
            where: {
                tenant_id: tenantId,
                professional_id: professionalId,
                date: date,
                status: { [Op.notIn]: ['cancelado', 'reagendado'] }
            },
            include: [{ model: Service, as: 'service' }]
        });

        // Helper to convert time string to minutes
        const timeToMinutes = (time) => {
            const [h, m] = time.split(':').map(Number);
            return h * 60 + m;
        };

        // Helper to convert minutes to time string
        const minutesToTime = (mins) => {
            const h = Math.floor(mins / 60);
            const m = mins % 60;
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        };

        // Generate all possible slots (every 30 minutes)
        const slotInterval = 30;
        const dayStart = timeToMinutes(startTime);
        const dayEnd = timeToMinutes(endTime);
        const lunchBegin = timeToMinutes(lunchStart);
        const lunchFinish = timeToMinutes(lunchEnd);

        const allSlots = [];
        for (let t = dayStart; t + serviceDuration <= dayEnd; t += slotInterval) {
            // Skip lunch time
            if (t >= lunchBegin && t < lunchFinish) continue;
            // Skip if slot would overlap with lunch
            if (t < lunchBegin && t + serviceDuration > lunchBegin) continue;

            allSlots.push(t);
        }

        // Filter out slots that conflict with existing appointments
        const availableSlots = allSlots.filter(slotStart => {
            const slotEnd = slotStart + serviceDuration;

            for (const appt of existingAppointments) {
                const apptStart = timeToMinutes(appt.time);
                const apptDuration = appt.service?.duration || 30;
                const apptEnd = apptStart + apptDuration;

                // Check for overlap
                if (slotStart < apptEnd && slotEnd > apptStart) {
                    return false;
                }
            }

            // Also check blocks
            for (const block of blocks) {
                const blockStart = timeToMinutes(block.start_time);
                const blockEnd = timeToMinutes(block.end_time);

                if (slotStart < blockEnd && slotEnd > blockStart) {
                    return false;
                }
            }

            return true;
        });

        const now = new Date();
        const requestDate = new Date(date + 'T00:00:00');

        if (requestDate.toDateString() === now.toDateString()) {
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            const slots = availableSlots
                .filter(slot => slot > currentMinutes)
                .map(minutesToTime);
            return {
                professional: { id: professional.id, name: professional.name },
                slots
            };
        }

        const slots = availableSlots.map(minutesToTime);
        return {
            professional: { id: professional.id, name: professional.name },
            slots
        };
    }

    // --- Schedule Blocks Methods ---
    async getAllBlocks(tenantId, filters = {}) {
        const { ScheduleBlock } = require('../../models');
        const where = { tenant_id: tenantId, ...filters };
        return await ScheduleBlock.findAll({ where, order: [['date', 'ASC'], ['start_time', 'ASC']] });
    }

    async createBlock(data, tenantId) {
        const { ScheduleBlock } = require('../../models');
        return await ScheduleBlock.create({ ...data, tenant_id: tenantId });
    }

    async deleteBlock(id, tenantId) {
        const { ScheduleBlock } = require('../../models');
        const result = await ScheduleBlock.destroy({ where: { id, tenant_id: tenantId } });
        return result > 0;
    }
}

module.exports = new AppointmentService();
