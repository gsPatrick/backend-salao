const { Tenant, Plan, User } = require('../../models');

class TenantService {
    async getAll() {
        return Tenant.findAll({
            include: [{ model: Plan, as: 'plan' }],
            order: [['created_at', 'DESC']],
        });
    }

    async getById(id, tenantId, isSuperAdmin) {
        const tenant = await Tenant.findByPk(id, {
            include: [{ model: Plan, as: 'plan' }],
        });

        if (!tenant) throw new Error('Tenant não encontrado');
        if (!isSuperAdmin && tenant.id !== tenantId) throw new Error('Acesso negado');

        return tenant;
    }

    async create(data) {
        const slug = this.generateSlug(data.name);
        return Tenant.create({ ...data, slug });
    }

    async update(id, data, tenantId, isSuperAdmin) {
        if (!isSuperAdmin && parseInt(id) !== parseInt(tenantId)) {
            throw new Error('Acesso negado: você só pode editar seu próprio salão');
        }

        const tenant = await Tenant.findByPk(id);
        if (!tenant) throw new Error('Tenant não encontrado');

        // Prevent non-superadmins from changing plan_id or is_active
        if (!isSuperAdmin) {
            delete data.plan_id;
            delete data.is_active;
            delete data.subscription_status;
            delete data.trial_ends_at;
        }

        await tenant.update(data);
        return this.getById(id, tenantId, isSuperAdmin);
    }

    async delete(id, isSuperAdmin) {
        if (!isSuperAdmin) throw new Error('Apenas Super Admin pode deletar tenants');
        const tenant = await Tenant.findByPk(id);
        if (!tenant) throw new Error('Tenant não encontrado');
        await tenant.update({ is_active: false });
        return { message: 'Tenant desativado' };
    }

    generateSlug(name) {
        return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);
    }
}

module.exports = new TenantService();
