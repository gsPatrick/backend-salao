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

        return Professional.findAll({
            where,
            include: [{ model: Service, as: 'services' }],
            order: [['name', 'ASC']],
        });
    }

    async getById(id, tenantId) {
        const professional = await Professional.findOne({
            where: { id, tenant_id: tenantId },
            include: [{ model: Service, as: 'services' }],
        });
        if (!professional) throw new Error('Profissional não encontrado');
        return professional;
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
        return createdProfessional;
    }

    async update(id, data, tenantId) {
        const professional = await this.getById(id, tenantId);
        await professional.update(data);
        return professional;
    }

    async delete(id, tenantId) {
        const professional = await this.getById(id, tenantId);
        await professional.update({ is_archived: true });
        return { message: 'Profissional arquivado' };
    }

    async purge(id, tenantId) {
        const professional = await this.getById(id, tenantId);
        await professional.destroy();
        return { message: 'Profissional excluído definitivamente' };
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
