const { Professional, Service, ProfessionalReview, sequelize } = require('../../models');

class ProfessionalService {
    async getRanking(tenantId, limit = 5) {
        // Calculate average rating for each professional
        // This requires a group by query
        const rankings = await ProfessionalReview.findAll({
            attributes: [
                'professional_id',
                [sequelize.fn('AVG', sequelize.col('rating')), 'average_rating'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'review_count']
            ],
            where: { tenant_id: tenantId },
            include: [{
                model: Professional,
                as: 'professional',
                attributes: ['id', 'name', 'photo', 'occupation']
            }],
            group: ['professional_id', 'professional.id', 'professional.name', 'professional.photo', 'professional.occupation'],
            order: [[sequelize.literal('average_rating'), 'DESC']],
            limit: limit
        });

        return rankings;
    }
    async getAll(tenantId) {
        return Professional.findAll({
            where: { tenant_id: tenantId, is_archived: false },
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
        await professional.update({ is_suspended: !professional.is_suspended });
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
