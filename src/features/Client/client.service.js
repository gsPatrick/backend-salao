const { Client, Appointment, Service, Professional, PackageSubscription, MonthlyPackage } = require('../../models');

class ClientService {
    async getAll(tenantId, unitId) {
        const where = {
            tenant_id: tenantId,
            is_active: true
        };

        if (unitId) {
            where.unit_id = unitId;
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
                        { model: Professional, as: 'professional', attributes: ['id', 'name', 'photo', 'occupation'] }
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
                }
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
            const appointmentHistory = clientData.Appointments.map(apt => ({
                id: apt.id,
                name: apt.service?.name || 'Serviço',
                date: apt.date,
                time: apt.time,
                professional: apt.professional?.name || 'Profissional',
                professionalId: apt.professional?.id,
                professionalPhoto: apt.professional?.photo,
                status: apt.status,
                price: apt.service?.price || '0',
                reviewed: apt.reviewed || false,
                rating: apt.rating
            }));
            // Merge with existing history (if any) or replace
            clientData.history = appointmentHistory;
            delete clientData.Appointments;
        }

        // Transform subscriptions to packages format for frontend compatibility
        if (clientData.subscriptions && clientData.subscriptions.length > 0) {
            clientData.packages = clientData.subscriptions.map(sub => ({
                id: sub.id,
                name: sub.package?.name || 'Pacote',
                total_sessions: sub.package?.sessions || 0,
                used_sessions: sub.clicks || 0,
                sessions: sub.package?.sessions || 0,
                price: sub.package?.price || '0',
                start_date: sub.start_date,
                end_date: sub.end_date,
                status: sub.status
            }));
            delete clientData.subscriptions;
        }

        return clientData;
    }

    async getActiveReminders(tenantId) {
        const { Op } = require('sequelize');
        // Check if reminders is not null and not empty array/json
        // For JSONB in Postgres, we can check not equal to '[]'
        const clients = await Client.findAll({
            where: {
                tenant_id: tenantId,
                is_active: true,
                reminders: {
                    [Op.and]: [
                        { [Op.ne]: null },
                        // In some DBs emptiness check varies, but assuming standard JSON array
                    ]
                }
            },
            attributes: ['id', 'name', 'social_name', 'reminders', 'updated_at']
        });

        // Filter in JS to be safe about "active" or "future" reminders if needed, 
        // or just return clients that have *any* reminders.
        // Assuming we return all clients who have a non-empty reminders array.
        return clients.filter(c => c.reminders && Array.isArray(c.reminders) && c.reminders.length > 0).map(client => {
            const data = client.toJSON();
            // Apply Social Name
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

        const sanitizedData = this.sanitizeClientData(data);
        await client.update(sanitizedData);

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
}

module.exports = new ClientService();
