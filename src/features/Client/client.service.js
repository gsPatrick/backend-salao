const { Client, Appointment, Service, Professional, PackageSubscription, MonthlyPackage, SalonPlan, SalonPlanSubscription, sequelize } = require('../../models');
const { Op } = require('sequelize');

class ClientService {
    async getAll(tenantId, unitId, filters = {}) {
        const where = {
            tenant_id: tenantId,
            is_active: true
        };

        if (unitId) {
            where.unit_id = unitId;
        }

        if (filters.startDate && filters.endDate) {
            where.created_at = { [Op.between]: [filters.startDate + ' 00:00:00', filters.endDate + ' 23:59:59'] };
        } else if (filters.startDate) {
            where.created_at = { [Op.gte]: filters.startDate + ' 00:00:00' };
        } else if (filters.endDate) {
            where.created_at = { [Op.lte]: filters.endDate + ' 23:59:59' };
        }

        const clients = await Client.findAll({
            where,
            order: [['created_at', 'DESC']],
        });

        // Apply Social Name logic
        return clients.map(client => {
            const data = client.toJSON();
            const useSocialName = data.use_social_name || data.preferences?.useSocialName;

            // Keep legal_name for consistency/legacy, but DO NOT swap data.name
            data.legal_name = data.name;

            // Ensure use_social_name is returned for frontend mapping
            data.use_social_name = !!useSocialName;
            return data;
        });
    }

    async getById(id, tenantId) {
        const client = await Client.findOne({
            where: { id, tenant_id: tenantId },
            include: [
                {
                    model: Appointment,
                    as: 'Appointments',
                    include: [
                        { model: Service, as: 'service', attributes: ['id', 'name', 'price', 'duration'] },
                        { model: Professional, as: 'professional', attributes: ['id', 'name', 'photo', 'occupation'] },
                        { model: MonthlyPackage, as: 'package', attributes: ['id', 'name', 'sessions'] },
                        { model: SalonPlan, as: 'salon_plan', attributes: ['id', 'name', 'sessions'] }
                    ],
                    order: [['date', 'DESC'], ['time', 'DESC']]
                },
                {
                    model: PackageSubscription,
                    as: 'subscriptions',
                    required: false,
                    include: [
                        { model: MonthlyPackage, as: 'package', attributes: ['id', 'name', 'sessions', 'price'] }
                    ]
                },
                {
                    model: SalonPlanSubscription,
                    as: 'plan_subscriptions',
                    required: false,
                    include: [
                        { model: SalonPlan, as: 'plan', attributes: ['id', 'name', 'sessions', 'price'] }
                    ]
                },
                { model: MonthlyPackage, as: 'package', attributes: ['name'] },
                { model: SalonPlan, as: 'salon_plan', attributes: ['name'] }
            ]
        });
        if (!client) throw new Error('Cliente não encontrado');

        // Transform appointments to history format for frontend compatibility
        const clientData = client.toJSON();

        // Apply Social Name logic
        const useSocialName = clientData.use_social_name || clientData.preferences?.useSocialName;
        // Keep legal_name for compatibility, but DO NOT swap name
        clientData.legal_name = clientData.name;
        clientData.use_social_name = !!useSocialName;

        if (clientData.Appointments && clientData.Appointments.length > 0) {
            // Fetch all services for this tenant to allow matching by name for legacy items
            const { Service: ServiceModel } = require('../../models');
            const allServices = await ServiceModel.findAll({
                where: { tenant_id: tenantId },
                attributes: ['id', 'name']
            });
            const serviceMap = {};
            allServices.forEach(s => {
                serviceMap[s.name.toLowerCase().trim()] = s.id;
            });

            const appointmentHistory = clientData.Appointments.map(apt => {
                let type = 'Serviço';
                let sessionInfo = null;
                let name = apt.service?.name || apt.service_name || 'Serviço';

                if (apt.package_id) {
                    type = 'Pacote';
                    name = apt.package?.name || apt.service_name || 'Pacote';

                    const total = apt.total_sessions || parseInt(apt.package?.sessions) || 0;
                    const consumed = apt.consumed_sessions || 0;
                    const index = apt.session_index;

                    if (index && total > 0) {
                        sessionInfo = `Sessão ${index} de ${total}`;
                    } else if (total > 0) {
                        // Fallback: If no session_index but we have total, we can't reliably say "Sessão X" without it being wrong (all 1).
                        // Better to show generic or try to infer from consumed (which is flawed here).
                        // Let's stick to "Sessão ?" or just fallback to consumed if > 0 (as singular quantity).
                        if (consumed > 0) sessionInfo = `${consumed} sessões`;
                    } else if (consumed > 0) {
                        sessionInfo = `${consumed} sessões`;
                    }

                    // Fallback to current subscription counts only if snapshot is missing
                    if (!sessionInfo) {
                        const sub = clientData.subscriptions?.find(s => String(s.package_id) === String(apt.package_id));
                        if (sub) {
                            const subTotal = sub.package?.sessions || sub.total_sessions || 0;
                            const used = sub.clicks || 0;
                            sessionInfo = `${used}/${subTotal} sessões`;
                        }
                    }
                } else if (apt.salon_plan_id) {
                    type = 'Plano';
                    name = apt.salon_plan?.name || apt.service_name || 'Plano';

                    const total = apt.total_sessions || parseInt(apt.salon_plan?.sessions) || 0;
                    const consumed = apt.consumed_sessions || 0;
                    const index = apt.session_index;

                    if (index && total > 0) {
                        sessionInfo = `Sessão ${index} de ${total}`;
                    } else if (total > 0) {
                        if (consumed > 0) sessionInfo = `${consumed} sessões`;
                    } else if (consumed > 0) {
                        sessionInfo = `${consumed} sessões`;
                    }

                    if (!sessionInfo) {
                        const sub = clientData.plan_subscriptions?.find(s => String(s.plan_id) === String(apt.salon_plan_id));
                        if (sub) {
                            const subTotal = sub.plan?.sessions || sub.total_sessions || 0;
                            const used = sub.used_sessions || 0;
                            sessionInfo = `${used}/${subTotal} sessões`;
                        }
                    }
                } else if (apt.service?.name) {
                    name = apt.service.name;
                }

                // Attempt to find service_id if missing but we have a name
                let serviceId = apt.service_id;
                if (!serviceId && name && serviceMap[name.toLowerCase().trim()]) {
                    serviceId = serviceMap[name.toLowerCase().trim()];
                }

                return {
                    id: apt.id,
                    name: apt.service?.name || apt.package?.name || apt.salon_plan?.name || 'Atendimento',
                    date: apt.date,
                    time: apt.time ? apt.time.substring(0, 5) : '00:00',
                    professional: apt.professional?.name || 'Profissional',
                    professionalId: apt.professional_id,
                    status: apt.status,
                    // If height price is 0, try to get from package/plan for display purposes
                    price: (parseFloat(apt.price) > 0) ? apt.price : (apt.package?.price || apt.salon_plan?.price || apt.service?.price || '0'),
                    package_id: apt.package_id,
                    salon_plan_id: apt.salon_plan_id,
                    type: apt.package_id ? 'Pacote' : (apt.salon_plan_id ? 'Plano' : 'Serviço'),
                    total_sessions: apt.total_sessions || 0,
                    consumed_sessions: apt.consumed_sessions || 0,
                    session_index: apt.session_index,
                    service_id: apt.service_id,
                    payment_status: apt.payment_status
                };
            });

            // Merge JSONB history (Services of Interest) with real Appointment history
            const jsonHistory = clientData.history || [];
            const mergedHistory = [...appointmentHistory];

            // Add items from JSON history if they are not already represented by a real appointment
            // We check by name and date (if defined)
            jsonHistory.forEach(jsonItem => {
                const isDuplicate = appointmentHistory.some(aptItem =>
                    aptItem.name === jsonItem.name &&
                    (aptItem.date === jsonItem.date || jsonItem.date === 'Pendente')
                );
                if (!isDuplicate) {
                    // Ensure price is formatted for JSON history if missing
                    if (jsonItem.price === undefined) jsonItem.price = '0';

                    // Attempt to find service_id if missing but we have a name
                    if (!jsonItem.service_id && jsonItem.name && serviceMap[jsonItem.name.toLowerCase().trim()]) {
                        jsonItem.service_id = serviceMap[jsonItem.name.toLowerCase().trim()];
                    }

                    mergedHistory.push(jsonItem);
                }
            });

            clientData.history = mergedHistory;
            delete clientData.Appointments;
        }

        // Transform subscriptions to packages format for frontend compatibility (Merging with legacy JSONB packages)
        // We ensure clientData.packages is a clean array and merge all sources
        let mergedPackages = [];
        if (clientData.packages && Array.isArray(clientData.packages)) {
            mergedPackages = [...clientData.packages];
        }

        if (clientData.subscriptions && clientData.subscriptions.length > 0) {
            const packageSubs = clientData.subscriptions.map(sub => {
                const total = sub.total_sessions || (sub.package?.sessions ? parseInt(sub.package.sessions) : 0) || 0;
                return {
                    id: sub.id,
                    name: sub.package?.name || 'Pacote',
                    total_sessions: total,
                    used_sessions: Number(sub.clicks || 0),
                    sessions: sub.package?.sessions || total || 0,
                    price: sub.package?.price || '0',
                    start_date: sub.start_date,
                    end_date: sub.end_date,
                    status: sub.status,
                    type: 'package',
                    package_id: sub.package_id
                };
            });

            // Add to merged list only if not already present (by subscription ID)
            packageSubs.forEach(ps => {
                if (!mergedPackages.some(p => p.id === ps.id)) {
                    mergedPackages.push(ps);
                }
            });
            delete clientData.subscriptions;
        }

        if (clientData.plan_subscriptions && clientData.plan_subscriptions.length > 0) {
            const planSubs = clientData.plan_subscriptions.map(sub => ({
                id: sub.id,
                name: sub.plan?.name || 'Plano',
                total_sessions: sub.total_sessions || (sub.plan?.sessions ? parseInt(sub.plan.sessions) : 0) || 0,
                used_sessions: Number(sub.used_sessions || 0),
                sessions: sub.plan?.sessions || 0,
                price: sub.plan?.price || '0',
                start_date: sub.start_date,
                end_date: sub.end_date,
                status: sub.status,
                type: 'plan',
                plan_id: sub.plan_id
            }));

            planSubs.forEach(ps => {
                if (!mergedPackages.some(p => p.id === ps.id)) {
                    mergedPackages.push(ps);
                }
            });
            delete clientData.plan_subscriptions;
        }

        // Include direct package/plan if not already in the list
        if (clientData.package && !mergedPackages.some(p => p.package_id == clientData.package_id && p.type === 'package')) {
            mergedPackages.push({
                id: `direct-pkg-${clientData.package_id}`,
                name: clientData.package.name,
                type: 'package',
                package_id: clientData.package_id,
                status: 'active'
            });
        }
        if (clientData.salon_plan && !mergedPackages.some(p => p.plan_id == clientData.plan_id && p.type === 'plan')) {
            mergedPackages.push({
                id: `direct-plan-${clientData.plan_id}`,
                name: clientData.salon_plan.name,
                type: 'plan',
                plan_id: clientData.plan_id,
                status: 'active'
            });
        }

        // Implicitly collect packages/plans from appointment history if missing from subscriptions
        // This handles cases where appointments exist but formal subscription records are missing
        if (clientData.history && clientData.history.length > 0) {
            clientData.history.forEach(apt => {
                if (apt.package_id && !mergedPackages.some(p => p.package_id == apt.package_id && p.type === 'package')) {
                    mergedPackages.push({
                        id: `history-pkg-${apt.package_id}`,
                        name: apt.name, // The apt name is already the package name in the transform above
                        type: 'package',
                        package_id: apt.package_id,
                        total_sessions: apt.total_sessions,
                        used_sessions: apt.consumed_sessions, // Use the count from the appointment
                        status: 'active'
                    });
                }
                if (apt.salon_plan_id && !mergedPackages.some(p => p.plan_id == apt.salon_plan_id && p.type === 'plan')) {
                    mergedPackages.push({
                        id: `history-plan-${apt.salon_plan_id}`,
                        name: apt.name,
                        type: 'plan',
                        plan_id: apt.salon_plan_id,
                        total_sessions: apt.total_sessions,
                        used_sessions: apt.consumed_sessions,
                        status: 'active'
                    });
                }
            });
        }

        clientData.packages = mergedPackages;

        // Include associated names for direct mapping
        if (clientData.package && !clientData.packageName) {
            clientData.packageName = clientData.package.name;
        }
        if (clientData.salon_plan && !clientData.planName) {
            clientData.planName = clientData.salon_plan.name;
        }

        return clientData;
    }

    async getActiveReminders(tenantId, unitId) {
        const { Op } = require('sequelize');
        // Check if reminders is not null and not empty array/json
        const clients = await Client.findAll({
            where: {
                tenant_id: tenantId,
                is_active: true,
                reminders: {
                    [Op.and]: [
                        { [Op.ne]: null },
                    ]
                }
            },
            attributes: ['id', 'name', 'social_name', 'photo_url', 'reminders', 'updated_at', 'use_social_name', 'preferences']
        });

        // Filter in JS to support unit isolation and formatting
        return clients.map(client => {
            const data = client.toJSON();

            // Filter reminders by unitId if provided
            if (unitId && data.reminders && Array.isArray(data.reminders)) {
                // Support both string "1" and number 1 for comparison
                data.reminders = data.reminders.filter(r => !r.unitId || String(r.unitId) === String(unitId));
            }

            // If no reminders left for this unit after filtering, we'll filter the client out
            if (!data.reminders || data.reminders.length === 0) return null;

            // Apply Social Name
            const useSocialName = data.use_social_name || data.preferences?.useSocialName;
            if (useSocialName && data.social_name) {
                data.legal_name = data.name;
                data.name = data.social_name;
            } else {
                data.legal_name = data.name;
            }
            data.use_social_name = !!useSocialName;

            // Normalize Photo URL
            data.photo = data.photo_url;
            data.photoUrl = data.photo_url;

            // Cleanup attributes
            delete data.preferences;

            return data;
        }).filter(c => c !== null);
    }

    sanitizeClientData(data) {
        const sanitized = { ...data };

        // Map frontend fields to database column names
        if (sanitized.photo !== undefined && sanitized.photo_url === undefined) {
            sanitized.photo_url = sanitized.photo;
            delete sanitized.photo;
        }
        if (sanitized.birthdate !== undefined && sanitized.birth_date === undefined) {
            sanitized.birth_date = sanitized.birthdate;
            delete sanitized.birthdate;
        }
        if (sanitized.lastVisit !== undefined && sanitized.last_visit === undefined) {
            sanitized.last_visit = sanitized.lastVisit;
            delete sanitized.lastVisit;
        }
        if (sanitized.socialName !== undefined && sanitized.social_name === undefined) {
            sanitized.social_name = sanitized.socialName;
            delete sanitized.socialName;
        }
        if (sanitized.useSocialName !== undefined && sanitized.use_social_name === undefined) {
            sanitized.use_social_name = sanitized.useSocialName;
            delete sanitized.useSocialName;
        }
        if (sanitized.howTheyFoundUs !== undefined && sanitized.how_found_us === undefined) {
            sanitized.how_found_us = sanitized.howTheyFoundUs;
            delete sanitized.howTheyFoundUs;
        }
        if (sanitized.maritalStatus !== undefined && sanitized.marital_status === undefined) {
            sanitized.marital_status = sanitized.maritalStatus;
            delete sanitized.maritalStatus;
        }
        if (sanitized.totalVisits !== undefined && sanitized.total_visits === undefined) {
            sanitized.total_visits = sanitized.totalVisits;
            delete sanitized.totalVisits;
        }
        if (sanitized.additionalPhones !== undefined && sanitized.additional_phones === undefined) {
            sanitized.additional_phones = sanitized.additionalPhones;
            delete sanitized.additionalPhones;
        }
        if (sanitized.indicatedBy !== undefined && sanitized.indicated_by === undefined) {
            sanitized.indicated_by = sanitized.indicatedBy;
            delete sanitized.indicatedBy;
        }
        if (sanitized.preferredUnit !== undefined && sanitized.preferred_unit === undefined) {
            sanitized.preferred_unit = sanitized.preferredUnit;
            delete sanitized.preferredUnit;
        }
        if (sanitized.planId !== undefined && sanitized.plan_id === undefined) {
            sanitized.plan_id = sanitized.planId;
            delete sanitized.planId;
        }
        if (sanitized.packageId !== undefined && sanitized.package_id === undefined) {
            sanitized.package_id = sanitized.packageId;
            delete sanitized.packageId;
        }
        if (sanitized.gender !== undefined) {
            sanitized.gender = sanitized.gender;
        }
        if (sanitized.procedurePhotos !== undefined && sanitized.procedure_photos === undefined) {
            sanitized.procedure_photos = sanitized.procedurePhotos;
            delete sanitized.procedurePhotos;
        }
        if (sanitized.isCompleteRegistration !== undefined) {
            sanitized.is_complete_registration = sanitized.isCompleteRegistration;
            delete sanitized.isCompleteRegistration;
        }
        // Map observations (frontend) to observation (db)
        if (sanitized.observations !== undefined && sanitized.observation === undefined) {
            sanitized.observation = sanitized.observations;
            delete sanitized.observations;
        }
        // Ensure team and kinship are passed through (no camel/snake conversion needed as they are one word)
        if (sanitized.team !== undefined) {
            sanitized.team = sanitized.team;
        }
        if (sanitized.kinship !== undefined) {
            sanitized.kinship = sanitized.kinship;
        }

        // Clean up date fields with invalid values
        const dateFields = ['birth_date', 'last_visit'];
        dateFields.forEach(field => {
            if (sanitized[field] === '' || sanitized[field] === 'Invalid date') {
                sanitized[field] = null;
            }
        });

        // FIX: Force birth_date to Noon UTC to prevent timezone shifts (e.g. 00:00 -> 21:00 prev day)
        if (sanitized.birth_date && /^\d{4}-\d{2}-\d{2}$/.test(sanitized.birth_date)) {
            // Append Noon time to ensure stability across timezones
            // sanitized.birth_date = sanitized.birth_date; // DATEONLY handles it, but maybe Sequelize is parsing as Local?
            // Actually, for DATEONLY, passing the string is best. 
            // BUT if the issue is persistent, maybe we explicitly ignore time.
            // Let's rely on string.
        }

        // If the user says it's wrong, it means strict string passing failed?
        // Let's try appending ' 12:00:00' which Sequelize usually parses safely for DATEONLY.
        if (sanitized.birth_date && typeof sanitized.birth_date === 'string' && sanitized.birth_date.length === 10) {
            sanitized.birth_date = sanitized.birth_date;
        }

        return sanitized;
    }

    async create(data, tenantId) {
        const sanitizedData = this.sanitizeClientData(data);

        if (sanitizedData.email) {
            sanitizedData.email = sanitizedData.email.trim().toLowerCase();
            const existing = await Client.findOne({
                where: {
                    email: sanitizedData.email,
                    tenant_id: tenantId,
                    is_active: true
                }
            });
            if (existing) {
                throw new Error('Já existe um cliente ativo com este e-mail');
            }
        }

        const client = await Client.create({
            ...sanitizedData,
            tenant_id: tenantId,
            unit_id: sanitizedData.unit_id,
            registration_date: sanitizedData.registration_date || new Date(),
            is_active: true,
            is_complete_registration: sanitizedData.is_complete_registration !== undefined ? sanitizedData.is_complete_registration : true
        });

        // Create initial subscriptions if plan or package is provided on creation
        await this.handlePlanAndPackageSubscriptions(client, sanitizedData, null, tenantId);

        // Real-time CRM hook
        const crmAutomationService = require('../../services/crm_automation.service');
        crmAutomationService.handleNewClient(tenantId, client).catch(err =>
            console.error('[CRM Hook Error] handleNewClient:', err)
        );

        return client;
    }


    async update(id, data, tenantId) {
        const client = await Client.findOne({ where: { id, tenant_id: tenantId } });
        if (!client) throw new Error('Cliente não encontrado');

        const oldPlanId = client.plan_id;
        const oldPackageId = client.package_id;
        const sanitizedData = this.sanitizeClientData(data);
        console.log(`[ClientService] Sanitized data for client ${id}:`, JSON.stringify(sanitizedData));
        await client.update(sanitizedData);

        // Handle plan and package subscriptions
        await this.handlePlanAndPackageSubscriptions(client, sanitizedData, { oldPlanId, oldPackageId }, tenantId);

        // Return the full formatted object using getById
        return this.getById(id, tenantId);
    }

    /**
     * Helper to handle subscription creation when plan or package changes
     */
    async handlePlanAndPackageSubscriptions(client, newData, oldData, tenantId) {
        const id = client.id;
        const unitId = newData.unit_id || client.unit_id;

        // 1. Handle Salon Plan Subscription
        if (newData.plan_id && newData.plan_id !== oldData?.oldPlanId) {
            const plan = await SalonPlan.findByPk(newData.plan_id);
            if (plan) {
                // Deactivate old plan subscriptions if any
                await SalonPlanSubscription.update(
                    { status: 'archived', active: false },
                    { where: { client_id: id, tenant_id: tenantId, status: 'active' } }
                );

                await SalonPlanSubscription.create({
                    tenant_id: tenantId,
                    client_id: id,
                    plan_id: newData.plan_id,
                    start_date: new Date(),
                    status: 'active',
                    active: true,
                    total_sessions: parseInt(plan.sessions) || null,
                    used_sessions: 0,
                    unit_id: unitId
                });

                // Record financial transaction for the full plan value
                try {
                    const financeService = require('../Finance/finance.service');
                    await financeService.create({
                        type: 'receita',
                        category: 'Venda de Plano',
                        amount: plan.price,
                        date: new Date().toISOString().split('T')[0],
                        description: `Venda de Plano: ${plan.name} para ${client.name}`,
                        status: 'pago',
                        payment_method: newData.payment_method || newData.paymentMethod || 'Dinheiro',
                        unit_id: unitId,
                        client_id: id
                    }, tenantId);
                } catch (err) {
                    console.error('[Finance Hook Error] Plan Subscription:', err);
                }
            }
        }

        // 2. Handle Monthly Package Subscription
        if (newData.package_id && newData.package_id !== oldData?.oldPackageId) {
            const pkg = await MonthlyPackage.findByPk(newData.package_id);
            if (pkg) {
                // Deactivate old package subscriptions if any
                await PackageSubscription.update(
                    { status: 'archived', active: false },
                    { where: { client_id: id, tenant_id: tenantId, status: 'active' } }
                );

                // Calculate end date based on duration (months)
                const startDate = new Date();
                const endDate = new Date();
                endDate.setMonth(endDate.getMonth() + (parseInt(pkg.duration) || 1));

                const totalSessions = parseInt(pkg.sessions);

                await PackageSubscription.create({
                    tenant_id: tenantId,
                    client_id: id,
                    package_id: newData.package_id,
                    client_name: client.name,
                    client_email: client.email,
                    client_phone: client.phone,
                    start_date: startDate,
                    end_date: endDate,
                    status: 'active',
                    active: true,
                    total_sessions: isNaN(totalSessions) ? null : totalSessions,
                    clicks: 0,
                    unit_id: unitId
                });

                // Record financial transaction for the full package value
                try {
                    const financeService = require('../Finance/finance.service');
                    await financeService.create({
                        type: 'receita',
                        category: 'Venda de Pacote',
                        amount: pkg.price,
                        date: new Date().toISOString().split('T')[0],
                        description: `Venda de Pacote: ${pkg.name} para ${client.name}`,
                        status: 'pago',
                        payment_method: newData.payment_method || newData.paymentMethod || 'Dinheiro',
                        unit_id: unitId,
                        client_id: id
                    }, tenantId);
                } catch (err) {
                    console.error('[Finance Hook Error] Package Subscription:', err);
                }
            }
        }
    }

    async delete(id, tenantId) {
        // Cascade delete hierarchy (User requested: "sumir tudo")
        const { FinancialTransaction, PackageSubscription, SalonPlanSubscription } = require('../../models');

        // 1. Delete all appointments
        await Appointment.destroy({ where: { client_id: id, tenant_id: tenantId } });

        // 2. Delete all financial transactions
        await FinancialTransaction.destroy({ where: { client_id: id, tenant_id: tenantId } });

        // 3. Delete all subscriptions
        await PackageSubscription.destroy({ where: { client_id: id, tenant_id: tenantId } });
        await SalonPlanSubscription.destroy({ where: { client_id: id, tenant_id: tenantId } });

        // 4. Hard-delete the client
        await Client.destroy({ where: { id, tenant_id: tenantId } });

        return { message: 'Cliente e todos os seus dados vinculados foram removidos definitivamente.' };
    }

    async block(id, reason, tenantId) {
        const client = await this.getById(id, tenantId);
        await client.update({ status: 'blocked', blocked_reason: reason });
        return client;
    }

    async search(query, tenantId, unitId) {
        const { Op } = require('sequelize');
        const where = {
            tenant_id: tenantId,
            is_active: true,
            [Op.or]: [
                { name: { [Op.iLike]: `%${query}%` } },
                { email: { [Op.iLike]: `%${query}%` } },
                { phone: { [Op.iLike]: `%${query}%` } },
                { cpf: { [Op.iLike]: `%${query}%` } },
            ],
        };

        if (unitId) {
            // where.unit_id = unitId; // COMENTADO: Permitir busca global de clientes
        }

        const clients = await Client.findAll({
            where,
            limit: 20,
        });

        return clients.map(client => {
            const data = client.toJSON();
            const useSocialName = data.use_social_name || data.preferences?.useSocialName;
            if (useSocialName && data.social_name) {
                data.legal_name = data.name;
                data.name = data.social_name;
            } else {
                data.legal_name = data.name;
            }
            data.use_social_name = !!useSocialName;
            return data;
        });
    }
    async updateStatistics(clientId) {
        const { Appointment, Service, FinancialTransaction, Client } = require('../../models');
        const { Op } = require('sequelize');

        const client = await Client.findByPk(clientId);
        if (!client) return;

        const dbCompletionStatuses = ['concluido'];
        const legacyCompletionStatuses = ['concluido', 'finalizado', 'atendido', 'pago'];

        // 1. Calculate total visits from ALL completed appointments (standalone or package)
        // Using raw SQL to bypass model issues with columns like created_at
        const dbCompleted = await sequelize.query(`
            SELECT a.id, a.date, a.time, a.service_id, a.package_id, a.salon_plan_id, s.name as service_name
            FROM appointments a
            LEFT JOIN services s ON a.service_id = s.id
            WHERE a.client_id = :clientId 
            AND a.status IN (:statuses)
        `, {
            replacements: { clientId, statuses: dbCompletionStatuses },
            type: sequelize.QueryTypes.SELECT
        });

        const legacyHistory = client.history || [];
        const legacyCompleted = legacyHistory.filter(h =>
            legacyCompletionStatuses.includes((h.status || '').toLowerCase())
        );

        // We use a Set to avoid double counting if an appointment exists both in DB and JSONB 
        // (though transformClient should have handled this, we be safe here)
        const totalVisits = dbCompleted.length + legacyCompleted.filter(lh =>
            !dbCompleted.some(db => db.date === lh.date && db.time === lh.time)
        ).length;

        const lastVisit = dbCompleted.length > 0 ? dbCompleted[0].date : (legacyCompleted.length > 0 ? legacyCompleted[0].date : null);

        // 2. Sum Total Spent from Financial Transactions (MOST ACCURATE)
        const transactions = await FinancialTransaction.findAll({
            where: {
                client_id: clientId,
                status: 'pago',
                type: { [Op.in]: ['receita', 'income', 'despesa', 'expense'] }
            }
        });

        let totalSpent = 0;
        transactions.forEach(t => {
            const amount = parseFloat(t.amount) || 0;
            if (t.type === 'receita' || t.type === 'income') {
                totalSpent += amount;
            } else {
                totalSpent -= amount; // Deduct Estornos / Expenses
            }
        });

        // 3. Service Frequency (From appointments + history)
        const serviceCounts = {};
        dbCompleted.forEach(apt => {
            const name = apt.service_name || 'Serviço';
            serviceCounts[name] = (serviceCounts[name] || 0) + 1;
        });
        legacyCompleted.forEach(lh => {
            const name = lh.name || 'Serviço';
            serviceCounts[name] = (serviceCounts[name] || 0) + 1;
        });

        const averageTicket = totalVisits > 0 ? totalSpent / totalVisits : 0;
        const mostFrequentService = Object.keys(serviceCounts).reduce((a, b) => serviceCounts[a] > serviceCounts[b] ? a : b, null);

        await client.update({
            total_visits: totalVisits,
            last_visit: lastVisit,
            total_spent: totalSpent,
            average_ticket: averageTicket,
            most_frequent_service: mostFrequentService
        });

        console.log(`[Stats Update] Client ${clientId}: ${totalVisits} visits, total spent: ${totalSpent.toFixed(2)}, avg ticket: ${averageTicket.toFixed(2)}`);
    }
}

module.exports = new ClientService();
