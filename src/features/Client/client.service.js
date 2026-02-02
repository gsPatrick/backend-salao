const { Client } = require('../../models');

class ClientService {
    async getAll(tenantId) {
        return Client.findAll({
            where: { tenant_id: tenantId, is_active: true },
            order: [['created_at', 'DESC']],
        });
    }

    async getById(id, tenantId) {
        const client = await Client.findOne({ where: { id, tenant_id: tenantId } });
        if (!client) throw new Error('Cliente não encontrado');
        return client;
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

        // Clean up date fields with invalid values
        const dateFields = ['birth_date', 'last_visit'];
        dateFields.forEach(field => {
            if (sanitized[field] === '' || sanitized[field] === 'Invalid date') {
                sanitized[field] = null;
            }
        });

        return sanitized;
    }

    async create(data, tenantId) {
        const sanitizedData = this.sanitizeClientData(data);
        const client = await Client.create({
            ...sanitizedData,
            tenant_id: tenantId,
            registration_date: sanitizedData.registration_date || new Date()
        });

        // Real-time CRM hook
        const crmAutomationService = require('../../services/crm_automation.service');
        crmAutomationService.handleNewClient(tenantId, client).catch(err =>
            console.error('[CRM Hook Error] handleNewClient:', err)
        );

        return client;
    }


    async update(id, data, tenantId) {
        const client = await this.getById(id, tenantId);
        const sanitizedData = this.sanitizeClientData(data);
        await client.update(sanitizedData);
        return client;
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

    async search(query, tenantId) {
        const { Op } = require('sequelize');
        return Client.findAll({
            where: {
                tenant_id: tenantId,
                is_active: true,
                [Op.or]: [
                    { name: { [Op.iLike]: `%${query}%` } },
                    { email: { [Op.iLike]: `%${query}%` } },
                    { phone: { [Op.iLike]: `%${query}%` } },
                    { cpf: { [Op.iLike]: `%${query}%` } },
                ],
            },
            limit: 20,
        });
    }
}

module.exports = new ClientService();
