const { Professional, Service, ProfessionalReview, sequelize } = require('../../models');

class ProfessionalService {
    async getRanking(tenantId, limit = 5, unit = null, unitId = null) {
        // Using raw query to avoid complex Sequelize association issues with GROUP BY
        try {
            const [rankings] = await sequelize.query(`
                SELECT 
                    p.id,
                    p.name,
                    p.photo,
                    p.occupation,
                    COALESCE(AVG(pr.rating), 0) as average_rating,
                    COUNT(pr.id) as review_count
                FROM professionals p
                LEFT JOIN professional_reviews pr ON p.id = pr.professional_id
                WHERE pr.tenant_id = :tenantId
                ${unitId ? 'AND p.unit_id = :unitId' : (unit ? 'AND p.unit = :unit' : '')}
                GROUP BY p.id, p.name, p.photo, p.occupation
                ORDER BY average_rating DESC
                LIMIT :limit
            `, {
                replacements: { tenantId, unit, unitId, limit },
            });
            return rankings;
        } catch (error) {
            console.error('Error in getRanking:', error);
            // Fallback: return empty array on error
            return [];
        }
    }
    async getAll(tenantId, filters = {}) {
        const where = { tenant_id: tenantId };

        if (filters.open_schedule !== undefined) {
            where.open_schedule = filters.open_schedule === 'true' || filters.open_schedule === true;
        }

        if (filters.unitId) where.unit_id = filters.unitId;

        const professionals = await Professional.findAll({
            where,
            include: [{ model: Service, as: 'services' }],
            order: [['name', 'ASC']],
        });

        // Apply Social Name logic
        return professionals.map(prof => {
            const data = prof.toJSON();
            const useSocialName = data.use_social_name; // Professionals usually don't have preferences JSON yet
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

    async getById(id, tenantId) {
        const professional = await Professional.findOne({
            where: { id, tenant_id: tenantId },
            include: [{ model: Service, as: 'services' }],
        });
        if (!professional) throw new Error('Profissional não encontrado');

        const data = professional.toJSON();
        // Apply Social Name logic
        const useSocialName = data.use_social_name;
        if (useSocialName && data.social_name) {
            data.legal_name = data.name;
            data.name = data.social_name;
        } else {
            data.legal_name = data.name;
        }
        data.use_social_name = !!useSocialName;

        return data;
    }

    async create(data, tenantId) {
        // Check limits
        const { Tenant, Plan } = require('../../models');
        const tenant = await Tenant.findByPk(tenantId, {
            include: [{ model: Plan, as: 'plan' }]
        });

        if (tenant && tenant.plan && tenant.plan.max_professionals !== null) {
            const count = await Professional.count({ where: { tenant_id: tenantId, is_archived: false } });
            if (count >= tenant.plan.max_professionals) {
                throw new Error(`Limite de profissionais atingido para o seu plano (${tenant.plan.max_professionals}). Faça um upgrade para adicionar mais.`);
            }
        }

        const unitIds = (data.targetUnitIds && data.targetUnitIds.length > 0)
            ? data.targetUnitIds
            : [data.unit_id];

        let createdProfessional = null;
        for (const unitId of unitIds) {
            if (!unitId) continue;
            // Create a record for each unit
            // Note: If creating multiple, we assume 'Ambas' scenario.
            // Future improvement: check if professional already exists in that unit to avoid dupes if re-submitting?
            const professional = await Professional.create({
                ...data,
                tenant_id: tenantId,
                unit_id: unitId
            });
            if (!createdProfessional) createdProfessional = professional;
        }
        const sanitizedData = this.sanitizeProfessionalData(data);
        return Professional.create({ ...sanitizedData, tenant_id: tenantId });
    }

    async update(id, data, tenantId) {
        const professional = await this.getById(id, tenantId);
        const sanitizedData = this.sanitizeProfessionalData(data);
        await professional.update(sanitizedData);
        return this.getById(id, tenantId);
    }

    sanitizeProfessionalData(data) {
        const sanitized = { ...data };

        if (sanitized.useSocialName !== undefined && sanitized.use_social_name === undefined) {
            sanitized.use_social_name = sanitized.useSocialName;
            delete sanitized.useSocialName;
        }

        if (sanitized.socialName !== undefined && sanitized.social_name === undefined) {
            sanitized.social_name = sanitized.socialName;
            delete sanitized.socialName;
        }

        if (sanitized.maritalStatus !== undefined && sanitized.marital_status === undefined) {
            sanitized.marital_status = sanitized.maritalStatus;
            delete sanitized.maritalStatus;
        }

        // Add other mappings if necessary (start_time, end_time, etc. are already snake_case from frontend in some places but camelCase in others)
        const timeFields = ['startTime', 'endTime', 'lunchStart', 'lunchEnd'];
        const snakeTimeFields = ['start_time', 'end_time', 'lunch_start', 'lunch_end'];

        timeFields.forEach((field, index) => {
            const snakeField = snakeTimeFields[index];
            if (sanitized[field] !== undefined && sanitized[snakeField] === undefined) {
                sanitized[snakeField] = sanitized[field];
                delete sanitized[field];
            }
        });

        if (sanitized.allowOvertime !== undefined && sanitized.allow_overtime === undefined) {
            sanitized.allow_overtime = sanitized.allowOvertime;
            delete sanitized.allowOvertime;
        }

        if (sanitized.openSchedule !== undefined && sanitized.open_schedule === undefined) {
            sanitized.open_schedule = sanitized.openSchedule;
            delete sanitized.openSchedule;
        }

        return sanitized;
    }

    async delete(id, tenantId) {
        const professional = await this.getById(id, tenantId);
        await professional.update({ is_archived: true });
        return { message: 'Profissional arquivado' };
    }

    async purge(id, tenantId) {
        const professional = await this.getById(id, tenantId);
        try {
            await professional.destroy();
            return { message: 'Profissional excluído definitivamente' };
        } catch (error) {
            if (error.name === 'SequelizeForeignKeyConstraintError') {
                throw new Error('Não é possível excluir este profissional permanentemente pois existem registros (agendamentos) vinculados a ele. Arquive-o em vez disso.');
            }
            throw error;
        }
    }

    async suspend(id, tenantId) {
        const professional = await this.getById(id, tenantId);
        const current = professional.get('is_suspended');
        professional.set('is_suspended', !current);
        await professional.save();
        return professional;
    }

    async archive(id, tenantId) {
        const professional = await this.getById(id, tenantId);
        const current = professional.get('is_archived');
        professional.set('is_archived', !current);
        await professional.save();
        return professional;
    }

    async assignServices(id, serviceIds, tenantId) {
        const professional = await this.getById(id, tenantId);
        const services = await Service.findAll({
            where: { id: serviceIds, tenant_id: tenantId },
        });
        await professional.setServices(services);
        return this.getById(id, tenantId);
    }
}

module.exports = new ProfessionalService();
