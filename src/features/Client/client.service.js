const { Client, Appointment, Service, Professional, PackageSubscription, MonthlyPackage, SalonPlan, SalonPlanSubscription } = require('../../models');
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
                        { model: MonthlyPackage, as: 'package', attributes: ['id', 'name'] },
                        { model: SalonPlan, as: 'salon_plan', attributes: ['id', 'name'] }
                    ],
                    order: [['date', 'DESC'], ['time', 'DESC']]
                },
                {
                    model: PackageSubscription,
                    as: 'subscriptions',
                    where: { status: 'active' },
                    required: false,
                    include: [
                        { model: MonthlyPackage, as: 'package', attributes: ['id', 'name', 'sessions', 'price'] }
                    ]
                },
                {
                    model: SalonPlanSubscription,
                    as: 'plan_subscriptions',
                    where: { status: 'active' },
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
            const appointmentHistory = clientData.Appointments.map(apt => {
                let type = 'Serviço';
                let sessionInfo = null;
                let name = 'Serviço';

                if (apt.package_id) {
                    type = 'Pacote';
                    name = apt.package?.name || 'Pacote';
                    const sub = clientData.subscriptions?.find(s => s.package_id === apt.package_id);
                    if (sub) {
                        // Estimate session number based on usage. 
                        // Note: This is an approximation as we don't store "session #3" on the appointment itself yet.
                        // We will show "Sessão X/Y" based on current usage for context.
                        const total = sub.package?.sessions || sub.total_sessions || 0;
                        const used = sub.clicks || 0;
                        sessionInfo = `${used}/${total} sessões`;
                    }
                } else if (apt.salon_plan_id) {
                    type = 'Plano';
                    name = apt.salon_plan?.name || 'Plano';
                    const sub = clientData.plan_subscriptions?.find(s => s.plan_id === apt.salon_plan_id);
                    if (sub) {
                        const total = sub.plan?.sessions || sub.total_sessions || 0;
                        const used = sub.used_sessions || 0;
                        sessionInfo = `${used}/${total} sessões`;
                    }
                } else if (apt.service?.name) {
                    name = apt.service.name;
                }

                return {
                    id: apt.id,
                    name,
                    type, // New field for frontend label
                    sessionInfo, // New field for "3 sessões" or "1/10"
                    date: apt.date,
                    time: apt.time,
                    professional: apt.professional?.name || 'Profissional',
                    professionalId: apt.professional?.id,
                    professionalPhoto: apt.professional?.photo,
                    status: apt.status,
                    price: apt.price || apt.service?.price || '0',
                    reviewed: apt.reviewed || false,
                    rating: apt.rating,
                    package_id: apt.package_id,
                    salon_plan_id: apt.salon_plan_id
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
                    mergedHistory.push(jsonItem);
                }
            });

            clientData.history = mergedHistory;
            delete clientData.Appointments;
        }

        // Transform subscriptions to packages format for frontend compatibility
        clientData.packages = [];
        if (clientData.subscriptions && clientData.subscriptions.length > 0) {
            clientData.packages.push(...clientData.subscriptions.map(sub => ({
                id: sub.id,
                name: sub.package?.name || 'Pacote',
                total_sessions: sub.total_sessions || sub.package?.sessions || 0,
                used_sessions: sub.clicks || 0,
                sessions: sub.package?.sessions || 0,
                price: sub.package?.price || '0',
                start_date: sub.start_date,
                end_date: sub.end_date,
                status: sub.status,
                type: 'package',
                package_id: sub.package_id
            })));
            delete clientData.subscriptions;
        }

        if (clientData.plan_subscriptions && clientData.plan_subscriptions.length > 0) {
            clientData.packages.push(...clientData.plan_subscriptions.map(sub => ({
                id: sub.id,
                name: sub.plan?.name || 'Plano',
                total_sessions: sub.total_sessions || sub.plan?.sessions || 0,
                used_sessions: sub.used_sessions || 0,
                sessions: sub.plan?.sessions || 0,
                price: sub.plan?.price || '0',
                start_date: sub.start_date,
                end_date: sub.end_date,
                status: sub.status,
                type: 'plan',
                plan_id: sub.plan_id
            })));
            delete clientData.plan_subscriptions;
        }

        // Include associated names for direct mapping
        if (clientData.package) {
            clientData.packageName = clientData.package.name;
        }
        if (clientData.salon_plan) {
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
            unit_id: sanitizedData.unit_id, // Ensure unit_id is passed
            registration_date: sanitizedData.registration_date || new Date(),
            is_active: true,
            is_complete_registration: sanitizedData.is_complete_registration !== undefined ? sanitizedData.is_complete_registration : true
        });

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
        const sanitizedData = this.sanitizeClientData(data);
        await client.update(sanitizedData);

        // If plan changed, create a subscription for tracking sessions
        if (sanitizedData.plan_id && sanitizedData.plan_id !== oldPlanId) {
            const plan = await SalonPlan.findByPk(sanitizedData.plan_id);
            if (plan) {
                // Deactivate old plan subscriptions if any
                await SalonPlanSubscription.update(
                    { status: 'archived' },
                    { where: { client_id: id, tenant_id: tenantId, status: 'active' } }
                );

                await SalonPlanSubscription.create({
                    tenant_id: tenantId,
                    client_id: id,
                    plan_id: sanitizedData.plan_id,
                    start_date: new Date(),
                    status: 'active',
                    total_sessions: parseInt(plan.sessions) || null,
                    used_sessions: 0,
                    unit_id: sanitizedData.unit_id || client.unit_id
                });
            }
        }

        // Return the full formatted object using getById
        return this.getById(id, tenantId);
    }

    async delete(id, tenantId) {
        await Client.update({ is_active: false }, { where: { id, tenant_id: tenantId } });
        return { message: 'Cliente deletado com sucesso' };
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
        const { Appointment, Service, MonthlyPackage, SalonPlan } = require('../../models');
        const { Op } = require('sequelize');

        const completionStatuses = ['concluido'];

        const appointments = await Appointment.findAll({
            where: {
                client_id: clientId,
                status: { [Op.in]: completionStatuses }
            },
            include: [
                { model: Service, as: 'service' },
                { model: MonthlyPackage, as: 'package' },
                { model: SalonPlan, as: 'salon_plan' }
            ],
            order: [['date', 'DESC'], ['time', 'DESC']]
        });

        const totalVisits = appointments.length;
        const lastVisit = appointments.length > 0 ? appointments[0].date : null;

        let totalSpent = 0;
        const serviceCounts = {};

        appointments.forEach(apt => {
            let price = parseFloat(apt.price) || 0;

            // SANITY CHECK: Fix for "20k vs 200" bug.
            // If price uses comma as decimal separator in string, it might be parsed wrong or if stored as cents.
            // However, primarily we suspect data entry error or cents conversion.
            // Logic: If a single service costs > 5000, it's suspiciously high for a salon (unless it's a huge package).
            // But if it's 20000 exactly, it's likely 200.00 * 100.
            if (price > 10000 && price % 100 === 0) {
                // Heuristic: If > 10k and multiple of 100, divide by 100.
                price = price / 100;
            }

            totalSpent += price;

            let name = 'Serviço';
            if (apt.service?.name) name = apt.service.name;
            else if (apt.package?.name) name = apt.package.name;
            else if (apt.salon_plan?.name) name = apt.salon_plan.name;

            serviceCounts[name] = (serviceCounts[name] || 0) + 1;
        });

        const averageTicket = totalVisits > 0 ? totalSpent / totalVisits : 0;
        const mostFrequentService = Object.keys(serviceCounts).reduce((a, b) => serviceCounts[a] > serviceCounts[b] ? a : b, null);

        await Client.update({
            total_visits: totalVisits,
            last_visit: lastVisit,
            total_spent: totalSpent,
            average_ticket: averageTicket,
            most_frequent_service: mostFrequentService
        }, { where: { id: clientId } });

        console.log(`[Stats Update] Client ${clientId}: ${totalVisits} visits, total spent: ${totalSpent}, most freq: ${mostFrequentService}`);
    }
}

module.exports = new ClientService();
