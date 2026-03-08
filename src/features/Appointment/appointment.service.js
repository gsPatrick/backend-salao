const { Appointment, Client, Professional, Service, MonthlyPackage, SalonPlan, PackageSubscription, SalonPlanSubscription, Unit, Notification, ProfessionalReview, sequelize } = require('../../models');
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
                { model: ProfessionalReview, as: 'review' },
            ],
            order: [['date', 'ASC'], ['time', 'ASC']],
        });

        // Helper to standardize status
        const mapStatus = (s) => {
            const status = (s || '').toLowerCase();
            if (['concluido', 'finalizado', 'atendido', 'pago', 'completed'].includes(status)) return 'Atendido';
            if (['faltou', 'falta', 'no-show', 'absent'].includes(status)) return 'Falta';
            if (['cancelado', 'canceled'].includes(status)) return 'Cancelado';
            if (['confirmado', 'confirmed'].includes(status)) return 'Agendado';
            return 'Agendado';
        };

        // Apply mapping for associations and status
        return appointments.map(apt => {
            const data = apt.toJSON();

            // Standardize status for frontend (AccountPage, Dashboard, Reports)
            data.status = mapStatus(data.status);

            if (data.client) {
                const useSocial = data.client.use_social_name || data.client.preferences?.useSocialName;
                if (useSocial && data.client.social_name) {
                    data.client.legal_name = data.client.name;
                    data.client.name = data.client.social_name;
                } else {
                    data.client.legal_name = data.client.name;
                }
                data.client.use_social_name = !!useSocial;

                // Ensure registrationDate is available for Reports
                data.client.registrationDate = data.client.created_at;
                data.clientName = data.client.name;
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
                data.professionalName = data.professional.name;
            }

            // Ensure service name is at top level
            data.service = data.service?.name || data.package?.name || data.salon_plan?.name || data.service_name || 'Serviço';

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
                { model: ProfessionalReview, as: 'review' },
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
    async _checkCancelNotice(appointment, bypassNotice = false) {
        if (bypassNotice) return;

        const unit = appointment.unit || await Unit.findByPk(appointment.unit_id);
        const noticeHours = unit?.settings?.cancelNoticeHours || 24;

        const appointmentDateTime = new Date(`${appointment.date}T${appointment.time}`);
        const now = new Date();
        const diffInHours = (appointmentDateTime - now) / (1000 * 60 * 60);

        if (diffInHours < noticeHours) {
            throw new Error(`O cancelamento só é permitido com pelo menos ${noticeHours} horas de antecedência.`);
        }
    }

    async create(data, tenantId, userId) {
        // Map 'finalizado' to 'concluido' to prevent enum errors if the UI sends it
        if (data.status === 'finalizado') data.status = 'concluido';

        // Use a SERIALIZABLE transaction to prevent race conditions
        return sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED }, async (t) => {
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
            console.log('--- DEBUG: resolving item ---');
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
                console.log('--- DEBUG: verifying package sub ---');
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

            console.log('--- DEBUG: executing insert ---');
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
            console.log('--- DEBUG: insert done ---');

            // AUTO-COMPLETE PREVIOUS SESSIONS: Process after commit to reuse safe service methods
            if (packageSubId || salonPlanSubId) {
                t.afterCommit(async () => {
                    try {
                        const previousPending = await Appointment.findAll({
                            where: {
                                client_id: appointment.client_id,
                                tenant_id: tenantId,
                                [Op.or]: [
                                    packageSubId ? { package_subscription_id: packageSubId } : null,
                                    salonPlanSubId ? { salon_plan_subscription_id: salonPlanSubId } : null
                                ].filter(Boolean),
                                status: { [Op.in]: ['agendado', 'confirmado'] },
                                id: { [Op.ne]: appointment.id }
                            }
                        });

                        for (const prevApt of previousPending) {
                            console.log(`[Auto-Complete] Concluding previous session ${prevApt.id}`);
                            // Note: use local require if not globally available, but we can just use `this.updateStatus` if context is bound.
                            // Since it's an arrow function, `this` refers to `AppointmentService` instance.
                            await this.updateStatus(prevApt.id, 'concluido', tenantId).catch(e => console.error('[Auto-Complete Hook Error]', e));
                        }
                    } catch (err) {
                        console.error('[Auto-Complete Error]', err);
                    }
                });
            }

            // AUTOMATION: Always move to 'scheduled' (Agendados) when a new appointment is created
            if (['agendado', 'confirmado'].includes(appointment.status)) {
                const newStage = 'scheduled';
                const defaultIcon = '✅';
                const defaultTitle = 'Agendados';

                // Fetch dynamic tag from settings
                const crmAutomationService = require('../../services/crm_automation.service');
                const newClassification = await crmAutomationService.getStageClassification(
                    appointment.tenant_id,
                    newStage,
                    defaultIcon,
                    defaultTitle
                );

                // Move Client Update to afterCommit to avoid any locking issues with Appointment creation checks
                t.afterCommit(() => {
                    Client.update(
                        { crm_stage: newStage, classification: newClassification },
                        { where: { id: appointment.client_id } } // No transaction, autocommit
                    ).catch(err => console.error('[CRM Update Error]', err));
                });
            }

            // Update Client Statistics (Total Visits, Last Visit) - Absolute Sync
            // Fire-and-forget to prevent blocking response if stats calculation is slow
            t.afterCommit(() => {
                const clientService = require('../Client/client.service');
                clientService.updateStatistics(appointment.client_id).catch(err => {
                    console.error('[Statistics Hook Error] Failed to update client stats:', err);
                });
            });

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

        // Real-time CRM hook - trigger for ALL appointments, not just today's
        {
            const crmAutomationService = require('../../services/crm_automation.service');
            Client.findByPk(data.client_id).then(client => {
                if (client) {
                    crmAutomationService.handleScheduledToday(tenantId, client, createdAppointment).catch(err =>
                        console.error('[CRM Hook Error] handleScheduledToday:', err)
                    );
                    // Pass client to trigger notifications
                    const appWithClient = { ...createdAppointment.toJSON(), client };
                    this.triggerStoreFlowNotification(appWithClient, tenantId, 'novo').catch(err => console.error('[Notification Alert Error]:', err));
                }
            });
        }

        return createdAppointment;
    }

    async update(id, data, tenantId) {
        const appointmentInstance = await Appointment.findOne({ where: { id, tenant_id: tenantId } });
        if (!appointmentInstance) throw new Error('Agendamento não encontrado');

        // Map 'finalizado' to 'concluido' to prevent enum errors if the UI sends it
        if (data.status === 'finalizado') data.status = 'concluido';

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

    async updateStatus(id, status, tenantId, sessionsConsumed = 1, bypassNotice = false) {
        const appointmentInstance = await Appointment.findOne({
            where: { id, tenant_id: tenantId },
            include: [
                { model: Client, as: 'client' },
                { model: Service, as: 'service' },
                { model: Unit, as: 'unit' }
            ]
        });
        if (!appointmentInstance) throw new Error('Agendamento não encontrado');

        if (status === 'cancelado' && appointmentInstance.status !== 'cancelado') {
            await this._checkCancelNotice(appointmentInstance, bypassNotice);
        }

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

        // Trigger notifications for status changes (appointmentInstance already has client if updated via updateStatus)
        this.triggerStoreFlowNotification(appointmentInstance, tenantId, status).catch(err => console.error('[Notification Alert Error]:', err));

        return this.getById(id, tenantId);
    }

    async cancel(id, tenantId, reason = null, bypassNotice = false) {
        const appointment = await Appointment.findOne({
            where: { id, tenant_id: tenantId },
            include: [{ model: Unit, as: 'unit' }]
        });
        if (!appointment) throw new Error('Agendamento não encontrado');

        await this._checkCancelNotice(appointment, bypassNotice);

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

        const { ScheduleBlock, Unit: UnitModel, Tenant: TenantModel } = require('../../models');

        // Fetch Unit first if unitId is provided or if professional has unit_id
        let unit = null;
        if (unitId) {
            unit = await UnitModel.findByPk(unitId);
        } else if (professional.unit_id) {
            unit = await UnitModel.findByPk(professional.unit_id);
        } else if (professional.unit) {
            unit = await UnitModel.findOne({ where: { tenant_id: tenantId, name: professional.unit } });
        }

        const tenant = await TenantModel.findByPk(tenantId);
        if (!tenant) throw new Error('Tenant não encontrado');

        // Setup Defaults
        let startTime = '09:00';
        let endTime = '18:00';
        let lunchStart = '12:00';
        let lunchEnd = '13:00';
        let isOpen = true;

        const dayOfWeekIndex = new Date(date + 'T00:00:00').getDay();
        const days = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
        const dayOfWeekLabel = days[dayOfWeekIndex];

        // Apply Tenant Hours first
        const businessHours = tenant.business_hours || [];
        const tenantDay = businessHours.find(bh => bh.day?.toLowerCase().trim() === dayOfWeekLabel);
        if (tenantDay) {
            isOpen = tenantDay.open;
            startTime = tenantDay.start || startTime;
            endTime = tenantDay.end || endTime;
        }

        // Override with Unit Hours
        if (unit && Array.isArray(unit.working_hours)) {
            const unitDay = unit.working_hours.find(wh =>
                wh && wh.day && wh.day.toLowerCase().trim() === dayOfWeekLabel
            );

            if (unitDay) {
                isOpen = unitDay.open;
                startTime = unitDay.start || startTime;
                endTime = unitDay.end || endTime;
                lunchStart = unitDay.lunchStart || lunchStart;
                lunchEnd = unitDay.lunchEnd || lunchEnd;
            }
        } else if (unit) {
            startTime = unit.opening_time || startTime;
            endTime = unit.closing_time || endTime;
        }

        if (!isOpen) return { professional: { id: professional.id, name: professional.name }, slots: [] };

        const blocks = await ScheduleBlock.findAll({
            where: { tenant_id: tenantId, professional_id: professionalId, date: date }
        });

        let serviceDuration = 30;
        if (serviceId) {
            const service = await Service.findByPk(serviceId);
            if (service) serviceDuration = service.duration || 30;
        }

        const existingAppointments = await Appointment.findAll({
            where: {
                tenant_id: tenantId,
                professional_id: professionalId,
                date: date,
                status: { [Op.notIn]: ['cancelado', 'reagendado'] }
            },
            include: [{ model: Service, as: 'service' }]
        });

        const timeToMinutes = (time) => {
            if (!time) return 0;
            const [h, m] = time.split(':').map(Number);
            return h * 60 + m;
        };

        const minutesToTime = (mins) => {
            const h = Math.floor(mins / 60);
            const m = mins % 60;
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        };

        const unitSettings = (unit || tenant).settings || {};
        const slotInterval = unitSettings.appointmentInterval || 30;

        const dayStart = timeToMinutes(startTime);
        const dayEnd = timeToMinutes(endTime);
        const lunchBegin = timeToMinutes(lunchStart);
        const lunchFinish = timeToMinutes(lunchEnd);

        const allSlots = [];
        for (let t = dayStart; t + serviceDuration <= dayEnd; t += slotInterval) {
            if (t >= lunchBegin && t < lunchFinish) continue;
            if (t < lunchBegin && t + serviceDuration > lunchBegin) continue;
            allSlots.push(t);
        }

        const availableSlots = allSlots.filter(slotStart => {
            const slotEnd = slotStart + serviceDuration;
            for (const appt of existingAppointments) {
                const apptStart = timeToMinutes(appt.time);
                const apptDuration = appt.service?.duration || 30;
                const apptEnd = apptStart + apptDuration;
                if (slotStart < apptEnd && slotEnd > apptStart) return false;
            }
            for (const block of blocks) {
                const blockStart = timeToMinutes(block.start_time);
                const blockEnd = timeToMinutes(block.end_time);
                if (slotStart < blockEnd && slotEnd > blockStart) return false;
            }
            return true;
        });

        const now = new Date();
        const requestDate = new Date(date + 'T00:00:00');
        let slots = [];

        if (requestDate.toDateString() === now.toDateString()) {
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            slots = availableSlots.filter(slot => slot > currentMinutes).map(minutesToTime);
        } else {
            slots = availableSlots.map(minutesToTime);
        }

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
    async triggerStoreFlowNotification(appointment, tenantId, type) {
        const notificationService = require('../Notification/notification.service');
        const clientName = (appointment.client?.name || appointment.clientName || 'Cliente');
        const time = appointment.time || '00:00';

        let title = '';
        let message = '';
        let nType = 'info';

        const status = type.toLowerCase();

        if (status === 'cancelado') {
            title = 'Agendamento Cancelado';
            message = `Agendamento cancelado: ${clientName} às ${time}`;
            nType = 'warning';
        } else if (status === 'em_espera') {
            title = 'Cliente na Espera';
            message = `Cliente na espera: ${clientName}`;
            nType = 'info';
        } else if (status === 'chegou') {
            title = 'Cliente Chegou';
            message = `Cliente chegou: ${clientName}`;
            nType = 'success';
        } else if (status === 'novo') {
            title = 'Novo Agendamento';
            message = `Novo agendamento: ${clientName} às ${time}`;
            nType = 'success';

            // Special VIP Check
            if (appointment.client?.classification === 'VIP' || parseFloat(appointment.client?.total_spent) > 1000) {
                setTimeout(() => {
                    this.triggerStoreFlowNotification(appointment, tenantId, 'vip_a_caminho').catch(err => console.error('[Notification Alert Error]:', err));
                }, 500);
            }
        } else if (status === 'vip_a_caminho') {
            title = 'Cliente VIP a Caminho';
            message = `Cliente VIP a caminho: ${clientName}`;
            nType = 'info';
        }

        if (title) {
            await notificationService.notifyManagers(tenantId, appointment.unit_id, title, message, nType);
        }
    }
}


module.exports = new AppointmentService();
