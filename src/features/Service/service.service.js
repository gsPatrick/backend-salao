const { Service, Professional } = require('../../models');

class ServiceService {
    async getAll(tenantId) {
        return Service.findAll({
            where: { tenant_id: tenantId, is_suspended: false },
            include: [{ model: Professional, as: 'professionals' }],
            order: [['name', 'ASC']],
        });
    }

    async getById(id, tenantId) {
        const service = await Service.findOne({
            where: { id, tenant_id: tenantId },
            include: [{ model: Professional, as: 'professionals' }],
        });
        if (!service) throw new Error('Serviço não encontrado');
        return service;
    }

    async create(data, tenantId) {
        return Service.create({ ...data, tenant_id: tenantId });
    }

    async update(id, data, tenantId) {
        const service = await this.getById(id, tenantId);
        await service.update(data);
        return service;
    }

    async delete(id, tenantId) {
        const service = await this.getById(id, tenantId);
        await service.update({ is_suspended: true });
        return { message: 'Serviço desativado' };
    }

    async assignProfessionals(id, professionalIds, tenantId) {
        const service = await this.getById(id, tenantId);
        const professionals = await Professional.findAll({
            where: { id: professionalIds, tenant_id: tenantId },
        });
        await service.setProfessionals(professionals);
        return this.getById(id, tenantId);
    }
}

module.exports = new ServiceService();
