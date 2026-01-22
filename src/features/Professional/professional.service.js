const { Professional, Service } = require('../../models');

class ProfessionalService {
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
