const { Service, Professional } = require('../../models');

class ServiceService {
    async getAll(tenantId, unitId = null) {
        const where = { tenant_id: tenantId, is_suspended: false };
        if (unitId) {
            where.unit_id = unitId;
        }
        return Service.findAll({
            where,
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
        const unitIds = (data.targetUnitIds && data.targetUnitIds.length > 0)
            ? data.targetUnitIds
            : [data.unit_id];

        let createdService = null;
        for (const unitId of unitIds) {
            if (!unitId) continue;
            const service = await Service.create({
                ...data,
                tenant_id: tenantId,
                unit_id: unitId
            });
            if (!createdService) createdService = service;
        }
        return createdService;
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

    async toggleSuspend(id, tenantId) {
        const service = await Service.findOne({ where: { id, tenant_id: tenantId } });
        if (!service) throw new Error('Serviço não encontrado');

        const current = service.get('is_suspended');
        service.set('is_suspended', !current);
        await service.save();
        return service;
    }

    async toggleFavorite(id, tenantId) {
        const service = await Service.findOne({ where: { id, tenant_id: tenantId } });
        if (!service) throw new Error('Serviço não encontrado');

        const current = service.get('is_favorite');
        service.set('is_favorite', !current);
        await service.save();
        return service;
    }

    async assignProfessionals(id, professionalIds, tenantId) {
        const service = await this.getById(id, tenantId);
        const professionals = await Professional.findAll({
            where: { id: professionalIds, tenant_id: tenantId },
        });
        await service.setProfessionals(professionals);
        return this.getById(id, tenantId);
    }

    async deleteCategory(category, tenantId) {
        return Service.update(
            { category: '' },
            { where: { category, tenant_id: tenantId } }
        );
    }
}

module.exports = new ServiceService();
