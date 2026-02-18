const { Appointment, Client, Professional, Service, MonthlyPackage, SalonPlan, PackageSubscription, SalonPlanSubscription, sequelize } = require('../../models');
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
                { model: MonthlyPackage, as: 'package' },
                { model: SalonPlan, as: 'salon_plan' },
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
                { model: MonthlyPackage, as: 'package' },
                { model: SalonPlan, as: 'salon_plan' },
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
        console.log('[AppointmentService] Starting create transaction...');
        // Use a SERIALIZABLE transaction to prevent race conditions
        return sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE }, async (t) => {
            console.log('[AppointmentService] Transaction started');
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

            // Check for conflict
            console.log('[AppointmentService] Checking conflicts...');
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
            // Ensure price is 0 for sessions linked to an existing subscription to avoid double billing
            if (data.package_subscription_id || data.salon_plan_subscription_id) {
                data.price = 0;
            } else if (data.price === undefined || data.price === null || String(data.price).trim() === '') {
                data.price = price;
            }

            // Snapshot session info and link unique subscription if applicable
            let totalSessionsSnapshot = null;
            let packageSubId = null;
            let salonPlanSubId = null;

            if (data.package_subscription_id) {
                packageSubId = data.package_subscription_id;
            } else if (data.package_id) {
                const pkg = item; // monthly package from previous block
                const sessionsStr = pkg ? String(pkg.sessions || '') : '';
                totalSessionsSnapshot = parseInt(sessionsStr, 10);
                if (isNaN(totalSessionsSnapshot)) totalSessionsSnapshot = null;

                // Find the oldest active subscription for this package to bind this appointment
                const sub = await PackageSubscription.findOne({
                    where: { client_id: data.client_id, package_id: data.package_id, status: 'active' },
                    order: [['created_at', 'ASC']],
                    transaction: t
                });
                if (sub) packageSubId = sub.id;
            } else if (data.salon_plan_subscription_id) {
                salonPlanSubId = data.salon_plan_subscription_id;
            } else if (data.salon_plan_id) {
                const plan = item;
                const sessionsStr = plan ? String(plan.sessions || '') : '';
                totalSessionsSnapshot = parseInt(sessionsStr, 10);
                if (isNaN(totalSessionsSnapshot)) totalSessionsSnapshot = null;

                const sub = await SalonPlanSubscription.findOne({
                    where: { client_id: data.client_id, plan_id: data.salon_plan_id, status: 'active' },
                    order: [['created_at', 'ASC']],
                    transaction: t
                });
                if (sub) salonPlanSubId = sub.id;
            }

            // SESSION LIMIT ENFORCEMENT: Prevent scheduling beyond the total sessions allowed
            if (packageSubId || data.package_id) {
                const pkgId = data.package_id;
                const pkg = await MonthlyPackage.findByPk(pkgId, { transaction: t });
                const maxSessions = pkg ? parseInt(String(pkg.sessions || '0'), 10) : 0;
                if (maxSessions > 0) {
                    const existingCount = await Appointment.count({
                        where: {
                            tenant_id: tenantId,
                            package_id: pkgId,
                            client_id: data.client_id,
                            status: { [Op.notIn]: ['cancelado', 'reagendado', 'faltou'] }
                        },
                        transaction: t
                    });
                    if (existingCount >= maxSessions) {
                        const error = new Error(`Limite de sessões atingido (${existingCount}/${maxSessions}). Não é possível agendar mais sessões para este pacote.`);
                        error.status = 400;
                        throw error;
                    }
                }
            }
            if (salonPlanSubId || data.salon_plan_id) {
                const planId = data.salon_plan_id;
                const plan = await SalonPlan.findByPk(planId, { transaction: t });
                const maxSessions = plan ? parseInt(String(plan.sessions || '0'), 10) : 0;
                if (maxSessions > 0) {
                    const existingCount = await Appointment.count({
                        where: {
                            tenant_id: tenantId,
                            salon_plan_id: planId,
                            client_id: data.client_id,
                            status: { [Op.notIn]: ['cancelado', 'reagendado', 'faltou'] }
                        },
                        transaction: t
                    });
                    if (existingCount >= maxSessions) {
                        const error = new Error(`Limite de sessões atingido (${existingCount}/${maxSessions}). Não é possível agendar mais sessões para este plano.`);
                        error.status = 400;
                        throw error;
                    }
                }
            }

            console.log('[AppointmentService] Creating appointment record...');
            const appointment = await Appointment.create({
                ...data,
                tenant_id: tenantId,
                unit_id: data.unit_id,
                created_by_user_id: userId,
                package_subscription_id: packageSubId,
                salon_plan_subscription_id: salonPlanSubId,
                total_sessions: totalSessionsSnapshot,
                consumed_sessions: 0,
                payment_status: data.payment_status || ((packageSubId || salonPlanSubId) ? 'linked_to_package' : 'pending')
            }, { transaction: t });
            console.log('[AppointmentService] Appointment record created:', appointment.id);

            // AUTOMATION: Move to 'scheduled' or 'recurrent' funnel if status is valid
            if (['agendado', 'confirmado'].includes(appointment.status)) {
                // Check if client has other appointments (excluding this one) to determine recurrence
                const existingAppointmentsCount = await Appointment.count({
                    where: {
                        client_id: appointment.client_id,
                        id: { [Op.ne]: appointment.id }, // Exclude current
                        status: { [Op.notIn]: ['cancelado', 'faltou'] } // Only count valid appointments
                    },
                    transaction: t
                });

                let newStage = 'scheduled';
                let defaultIcon = '✅';
                let defaultTitle = 'Agendados';

                if (existingAppointmentsCount > 0) {
                    newStage = 'recurrent';
                    defaultIcon = '💎';
                    defaultTitle = 'Recorrentes';
                }

                // Fetch dynamic tag from settings
                const crmAutomationService = require('../../services/crm_automation.service');
                const newClassification = await crmAutomationService.getStageClassification(
                    appointment.tenant_id,
                    newStage,
                    defaultIcon,
                    defaultTitle
                );

                await Client.update(
                    { crm_stage: newStage, classification: newClassification },
                    { where: { id: appointment.client_id }, transaction: t }
                );
            }

            // Update Client Statistics (Total Visits, Last Visit) - Absolute Sync
            const clientService = require('../Client/client.service');
            await clientService.updateStatistics(appointment.client_id);

            // If created directly as concluded, trigger side effects
            if (appointment.status === 'concluido') {
                // We need to call this manually because the hooks might not fire or we want unified logic
                // However, we are inside a transaction `t`. The helper currently doesn't accept transaction.
                // But the helper mainly does updates on other models.
                // To be safe and consistent, we should probably refactor functionality to be transaction-aware
                // OR we just do it after the transaction commits?
                // `create` returns the appointment. The helper does `appointmentInstance.update`.
                // Let's do a quick hack: we can't easily use the helper inside the transaction without passing `t`.
                // But `create` is already complex.
                // AND `_handleStatusChangeSideEffects` is async and does DB calls.

                // Ideally, we should pass `t` to `_handleStatusChangeSideEffects`.
                // But for now, let's keep it simple. If status is 'concluido', we can just run the logic
                // AFTER the transaction?
                // But `create` wraps everything in `sequelize.transaction`.

                // Let's modifying `_handleStatusChangeSideEffects` to accept a transaction option.
            }

            return appointment;
        });

        // Post-creation hook for 'concluido' side effects (outside the main creation transaction to avoid complexity,
        // or we risk locking issues if we don't pass `t`).
        // Since `_handleStatusChangeSideEffects` fetches data, it might see the data since the transaction is committed (returned).
        if (createdAppointment.status === 'concluido') {
            const freshInstance = await Appointment.findByPk(createdAppointment.id, {
                include: [
                    { model: Client, as: 'client' },
                    { model: Service, as: 'service' }
                ]
            });
            if (freshInstance) {
                const sideEffects = await this._handleStatusChangeSideEffects(freshInstance, 'concluido', tenantId);
                if (Object.keys(sideEffects).length > 0) {
                    await freshInstance.update(sideEffects);
                }
            }
        }

        // Real-time CRM hook
        const today = new Date().toISOString().split('T')[0];
        if (data.date === today) {
            const crmAutomationService = require('../../services/crm_automation.service');
            Client.findByPk(data.client_id).then(client => {
                if (client) {
                    crmAutomationService.handleScheduledToday(tenantId, client, createdAppointment).catch(err =>
                        console.error('[CRM Hook Error] handleScheduledToday:', err)
                    );
                }
            });
        }

        return createdAppointment;
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

        if (data.status === 'concluido' && appointmentInstance.status !== 'concluido') {
            const sideEffectUpdates = await this._handleStatusChangeSideEffects(appointmentInstance, data.status, tenantId);
            Object.assign(data, sideEffectUpdates);
        } else if (data.status === 'agendado' && appointmentInstance.consumed_sessions > 0) {
            console.log(`[Status Safeguard] Appointment ${id} update blocking reversion to 'agendado' because consumed_sessions=${appointmentInstance.consumed_sessions}`);
            data.status = 'concluido';
        }

        if (data.status && ['agendado', 'confirmado'].includes(data.status)) {
            await Client.update(
                { crm_stage: 'scheduled', classification: 'Agendado' },
                { where: { id: appointmentInstance.client_id } }
            );
        }

        await appointmentInstance.update(data);
        return this.getById(id, tenantId);
    }


    // --- PRIVATE HELPER: Handle side-effects of concluding an appointment (finance, stats, session count) ---
    async _handleStatusChangeSideEffects(appointmentInstance, status, tenantId, sessionsConsumed = 1) {
        const appointmentStatus = (appointmentInstance.status || '').toLowerCase();
        const completionStatuses = ['concluido', 'finalizado', 'atendido', 'pago'];
        const isConcluding = completionStatuses.includes(status.toLowerCase());
        const wasConcluding = completionStatuses.includes(appointmentStatus);
        const updateData = {};

        // Auto-fill date/time if missing and concluding
        if (isConcluding && (!appointmentInstance.date || !appointmentInstance.time)) {
            const now = new Date();
            if (!appointmentInstance.date) {
                updateData.date = now.toISOString().split('T')[0];
                appointmentInstance.date = updateData.date;
            }
            if (!appointmentInstance.time) {
                updateData.time = now.toTimeString().split(' ')[0].slice(0, 5);
                appointmentInstance.time = updateData.time;
            }
        }

        // 1. Financial/Stats integration: Only on FIRST completion
        if (isConcluding && !wasConcluding) {
            try {
                // Update Client Statistics (Total Visits, Last Visit) - Absolute Sync
                const clientService = require('../Client/client.service');
                await clientService.updateStatistics(appointmentInstance.client_id);

                // Skip financial transaction if it's already paid via package/plan
                if (appointmentInstance.payment_status !== 'linked_to_package' && parseFloat(appointmentInstance.price) > 0) {
                    const financeService = require('../Finance/finance.service');
                    const transactionData = {
                        type: 'receita',
                        category: 'Serviço',
                        amount: appointmentInstance.price,
                        date: appointmentInstance.date,
                        description: `Atendimento: ${appointmentInstance.client?.name || 'Cliente'} - ${appointmentInstance.service?.name || 'Serviço'}`,
                        status: 'pago',
                        unit_id: appointmentInstance.unit_id || appointmentInstance.client?.preferred_unit || null,
                        appointment_id: appointmentInstance.id,
                        client_id: appointmentInstance.client_id
                    };

                    await financeService.create(transactionData, tenantId);
                }
            } catch (error) {
                console.error('[Finance/Stats Hook Error]:', error);
            }
        }

        // 2. Session Counter Increment: Every time it's "Concluded" (even if already concluded)
        // Note: Ideally we should only increment if transitioning from non-concluded to concluded,
        // or if explicitly requested via sessionsConsumed > 0.
        // Current logic: If isConcluding, try to increment.
        // But `updateStatus` allows `sessionsConsumed` param which implies an explicit increment.

        // If it wasn't concluding before, we increment.
        // If it WAS concluding, we only increment if sessionsConsumed is explicitly provided (logic preserved from before).

        if (isConcluding) {
            try {
                const sessionsToIncrement = parseInt(sessionsConsumed) || 1;
                let allSessionsConsumed = true; // Default: fully concluded
                let currentSessionIndex = null;

                // Update snapshot on the appointment itself
                // Only increment consumed_sessions if it hasn't been done yet for this specific completion event
                // But for now, we follow the existing pattern: increment if passed.
                // However, we must be careful not to double-count if the appointment was already concluded.
                // The check `!wasConcluding` above handles the "first time" logic.
                if (!wasConcluding || sessionsConsumed > 0) {
                    appointmentInstance.consumed_sessions = (appointmentInstance.consumed_sessions || 0) + sessionsToIncrement;
                    updateData.consumed_sessions = appointmentInstance.consumed_sessions;
                }

                // Identify Subscription
                let sub = null;
                let type = null; // 'package' or 'plan'

                if (appointmentInstance.package_subscription_id) {
                    sub = await PackageSubscription.findByPk(appointmentInstance.package_subscription_id);
                    type = 'package';
                } else if (appointmentInstance.salon_plan_subscription_id) {
                    sub = await SalonPlanSubscription.findByPk(appointmentInstance.salon_plan_subscription_id);
                    type = 'plan';
                } else if (appointmentInstance.package_id) {
                    // Fallback
                    sub = await PackageSubscription.findOne({
                        where: {
                            client_id: appointmentInstance.client_id,
                            package_id: appointmentInstance.package_id,
                            status: 'active'
                        }
                    });
                    if (sub) {
                        // Link it now for future reference
                        updateData.package_subscription_id = sub.id;
                        type = 'package';
                    }
                } else if (appointmentInstance.salon_plan_id) {
                    // Fallback
                    sub = await SalonPlanSubscription.findOne({
                        where: {
                            client_id: appointmentInstance.client_id,
                            plan_id: appointmentInstance.salon_plan_id,
                            status: 'active'
                        }
                    });
                    if (sub) {
                        // Link it now
                        updateData.salon_plan_subscription_id = sub.id;
                        type = 'plan';
                    }
                }

                if (sub) {
                    if (type === 'package') {
                        // Increment clicks only if it's a new completion or explicit consumption
                        if (!wasConcluding || sessionsConsumed > 0) {
                            await sub.increment('clicks', { by: sessionsToIncrement });
                            await sub.reload();
                        }

                        // Calculate session index
                        currentSessionIndex = sub.clicks; // The index after increment is the current session number

                        const total = appointmentInstance.total_sessions || sub.total_sessions;
                        if (total && sub.clicks < total) {
                            allSessionsConsumed = false;
                        }
                    } else if (type === 'plan') {
                        if (!wasConcluding || sessionsConsumed > 0) {
                            await sub.increment('used_sessions', { by: sessionsToIncrement });
                            await sub.reload();
                        }

                        currentSessionIndex = sub.used_sessions;

                        const total = appointmentInstance.total_sessions || sub.total_sessions;
                        if (total && sub.used_sessions < total) {
                            allSessionsConsumed = false;
                        }
                    }

                    // Save session index to appointment if not already set
                    if (currentSessionIndex && !appointmentInstance.session_index) {
                        updateData.session_index = currentSessionIndex;
                    }
                }

                // If package/plan still has remaining sessions, always keep as 'concluido'
                if (!allSessionsConsumed) {
                    // updateData.status = 'concluido'; // Already set by args
                }

                // --- SAFEGUARD: Prevent reversion to 'agendado' if sessions were consumed ---
                if (appointmentInstance.consumed_sessions > 0 && status === 'agendado') {
                    console.log(`[Status Safeguard] Appointment ${appointmentInstance.id} has ${appointmentInstance.consumed_sessions} consumed sessions. Forcing status to 'concluido' to prevent schedule reversion.`);
                    updateData.status = 'concluido';
                    return updateData; // Return immediately with override
                }
            } catch (error) {
                console.error('[Session Progress Error]:', error);
            }
        } else if (status === 'agendado' && appointmentInstance.consumed_sessions > 0) {
            // Even if we are not "concluding" right now, if someone tries to set status to 'agendado'
            // but there are already consumed sessions, we block it.
            console.log(`[Status Safeguard] Appointment ${id} blocking reversion to 'agendado' because consumed_sessions=${appointmentInstance.consumed_sessions}`);
            updateData.status = 'concluido';
        }

        return updateData;
    }

    async updateStatus(id, status, tenantId, sessionsConsumed = 1) {
        const appointmentInstance = await Appointment.findOne({
            where: { id, tenant_id: tenantId },
            include: [
                { model: Client, as: 'client' },
                { model: Service, as: 'service' }
            ]
        });
        if (!appointmentInstance) throw new Error('Agendamento não encontrado');

        // Calculate side-effects updates
        const sideEffectUpdates = await this._handleStatusChangeSideEffects(appointmentInstance, status, tenantId, sessionsConsumed);

        // Merge updates
        const finalUpdates = { status, ...sideEffectUpdates };

        await appointmentInstance.update(finalUpdates);

        // AUTOMATION: Handle CRM Stage changes based on appointment status
        if (['agendado', 'confirmado'].includes(status)) {
            // Re-evaluate if it should be 'scheduled' or 'recurrent'
            const existingAppointmentsCount = await Appointment.count({
                where: {
                    client_id: appointmentInstance.client_id,
                    id: { [Op.ne]: id }, // Exclude current
                    status: { [Op.notIn]: ['cancelado', 'faltou'] }
                }
            });

            let newStage = 'scheduled';
            let newClassification = 'Agendado';

            if (existingAppointmentsCount > 0) {
                newStage = 'recurrent';
                defaultIcon = '💎';
                defaultTitle = 'Recorrentes';
            }

            // Fetch dynamic tag
            const crmAutomationService = require('../../services/crm_automation.service');
            newClassification = await crmAutomationService.getStageClassification(
                tenantId,
                newStage,
                defaultIcon,
                defaultTitle
            );

            await Client.update(
                { crm_stage: newStage, classification: newClassification },
                { where: { id: appointmentInstance.client_id } }
            );
        } else if (status === 'faltou') {
            await Client.update(
                { crm_stage: 'absent', classification: 'Faltou' },
                { where: { id: appointmentInstance.client_id } }
            );
        }

        // --- Post-update hooks (CRM, Client Status) ---
        const crmAutomationService = require('../../services/crm_automation.service');

        // Update client status if faltante
        if (status === 'faltou') {
            await Client.update({ status: 'Faltante' }, { where: { id: appointmentInstance.client_id } });

            // Real-time CRM hook
            crmAutomationService.handleAbsent(tenantId, appointmentInstance.client, appointmentInstance).catch(err =>
                console.error('[CRM Hook Error] handleAbsent:', err)
            );
        }

        // Always update statistics on status change, just to be sure
        const clientService = require('../Client/client.service');
        await clientService.updateStatistics(appointmentInstance.client_id);

        if (status === 'reagendado') {
            // Real-time CRM hook
            crmAutomationService.handleRescheduled(tenantId, appointmentInstance.client, appointmentInstance).catch(err =>
                console.error('[CRM Hook Error] handleRescheduled:', err)
            );
        }

        return this.getById(id, tenantId);
    }

    async cancel(id, tenantId, reason = null) {
        const appointment = await this.getById(id, tenantId);
        const completionStatuses = ['concluido', 'finalizado', 'atendido', 'pago'];
        if (completionStatuses.includes(appointment.status.toLowerCase())) {
            return this.refund(id, reason || 'Cancelado pelo administrador', tenantId);
        }
        return this.updateStatus(id, 'cancelado', tenantId);
    }

    async refund(id, reason, tenantId) {
        const appointment = await Appointment.findOne({
            where: { id, tenant_id: tenantId },
            include: [
                { model: Client, as: 'client' },
                { model: Service, as: 'service' }
            ]
        });

        if (!appointment) throw new Error('Agendamento não encontrado');

        const oldStatus = (appointment.status || '').toLowerCase();
        const completionStatuses = ['concluido', 'finalizado', 'atendido', 'pago'];

        // Update appointment status and reason
        await appointment.update({
            status: 'cancelado',
            cancellation_reason: reason,
            canceled_at: new Date()
        });

        // Revert Session Counter if it was previously considered "concluded"
        if (completionStatuses.includes(oldStatus)) {
            try {
                // Models are already imported at top level, no need to re-require

                if (appointment.package_id) {
                    const sub = await PackageSubscription.findOne({
                        where: { client_id: appointment.client_id, package_id: appointment.package_id, status: 'active' }
                    });
                    if (sub && sub.clicks > 0) await sub.decrement('clicks');
                } else if (appointment.salon_plan_id) {
                    const sub = await SalonPlanSubscription.findOne({
                        where: { client_id: appointment.client_id, plan_id: appointment.salon_plan_id, status: 'active' }
                    });
                    if (sub && sub.used_sessions > 0) await sub.decrement('used_sessions');
                }

                // Create Reversal Transaction (Estorno)
                const financeService = require('../Finance/finance.service');
                await financeService.create({
                    type: 'despesa',
                    category: 'Estorno',
                    amount: appointment.price || 0,
                    date: new Date().toISOString().split('T')[0],
                    description: `Estorno: ${appointment.client?.name || 'Cliente'} - ${appointment.service?.name || 'Serviço'} (Motivo: ${reason})`,
                    status: 'pago',
                    unit_id: appointment.unit_id,
                    appointment_id: appointment.id,
                    client_id: appointment.client_id
                }, tenantId);

            } catch (error) {
                console.error('[Refund Hook Error]:', error);
            }
        }

        // Update Client Statistics after refund
        const clientService = require('../Client/client.service');
        await clientService.updateStatistics(appointment.client_id);

        return this.getById(id, tenantId);
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

        // Handle dependent records
        const { FinancialTransaction, ProfessionalReview } = require('../../models');

        // Delete appointment-linked financial transactions (user requested full cascade)
        await FinancialTransaction.destroy({
            where: { appointment_id: id, tenant_id: tenantId }
        });

        // Delete related reviews
        await ProfessionalReview.destroy({
            where: { appointment_id: id, tenant_id: tenantId }
        });

        console.log(`[AppointmentService] Found appointment id=${id}, destroying...`);
        const clientId = appointment.client_id;
        await appointment.destroy();
        console.log(`[AppointmentService] Appointment id=${id} DELETED`);

        // Update Client Statistics after deletion
        const clientService = require('../Client/client.service');
        await clientService.updateStatistics(clientId);

        return { success: true };
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
        const where = { tenant_id: tenantId };

        if (filters.date) where.date = filters.date;
        if (filters.professionalId || filters.professional_id) where.professional_id = filters.professionalId || filters.professional_id;
        if (filters.unit) where.unit = filters.unit;

        if (filters.dateFrom && filters.dateTo) {
            where.date = { [Op.between]: [filters.dateFrom, filters.dateTo] };
        }

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
