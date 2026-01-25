const { Professional, Service, ProfessionalReview, sequelize } = require('../../models');

class ProfessionalService {
    async getRanking(tenantId, limit = 5) {
        // Using raw query to avoid complex Sequelize association issues with GROUP BY
        try {
            const tenantFilter = tenantId ? `WHERE pr.tenant_id = ${tenantId}` : '';
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
                ${tenantFilter}
                GROUP BY p.id, p.name, p.photo, p.occupation
                ORDER BY average_rating DESC
                LIMIT ${limit}
            `);
            return rankings;
        } catch (error) {
            console.error('Error in getRanking:', error);
            // Fallback: return empty array on error
            return [];
        }
    }
    async getAll(tenantId) {
        return Professional.findAll({
            where: { tenant_id: tenantId },
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
        return Professional.create({ ...data, tenant_id: tenantId });
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
