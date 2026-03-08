const { User, Tenant, Plan } = require('../../models');

class UserService {
    /**
     * Get all users for a tenant (or all users for Super Admin)
     */
    async getAll(tenantId, isSuperAdmin) {
        // ALWAYS filter by tenantId, even for Super Admins, because this endpoint
        // is used by the CRM Settings Page to show the salon's team members.
        const where = { tenant_id: tenantId };

        const users = await User.findAll({
            where,
            include: [
                {
                    model: Tenant,
                    as: 'tenant',
                    include: [{ model: Plan, as: 'plan' }],
                },
            ],
            order: [['created_at', 'DESC']],
        });

        return users;
    }

    /**
     * Get user by ID (with tenant check)
     */
    async getById(id, tenantId, isSuperAdmin) {
        const user = await User.findByPk(id, {
            include: [
                {
                    model: Tenant,
                    as: 'tenant',
                    include: [{ model: Plan, as: 'plan' }],
                },
            ],
        });

        if (!user) {
            throw new Error('Usuário não encontrado');
        }

        // Check tenant access
        if (!isSuperAdmin && user.tenant_id !== tenantId) {
            throw new Error('Acesso negado');
        }

        return user;
    }

    /**
     * Create new user
     */
    async create(data, tenantId, isSuperAdmin) {
        // If not Super Admin, force tenant_id
        if (!isSuperAdmin) {
            data.tenant_id = tenantId;
        }

        // Check if email already exists
        const existingUser = await User.findOne({
            where: { email: data.email.toLowerCase() },
        });

        if (existingUser) {
            throw new Error('Email já cadastrado');
        }

        // Check user limit based on plan
        const tenant = await Tenant.findByPk(data.tenant_id, {
            include: [{ model: Plan, as: 'plan' }]
        });

        if (!tenant) throw new Error('Tenant não encontrado');

        const userCount = await User.count({ where: { tenant_id: data.tenant_id } });

        // Limits: Individual (1)=1, Essencial (2)=5, Pro (3)=10, Premium/Vitalicio (4/5)=Unlimited
        const limits = { 1: 1, 2: 5, 3: 10 };
        const maxUsers = limits[tenant.plan_id];

        if (maxUsers && userCount >= maxUsers) {
            throw new Error(`Limite de usuários atingido para o seu plano (${maxUsers} usuários). Faça um upgrade para adicionar mais.`);
        }

        const user = await User.create({
            ...data,
            email: data.email.toLowerCase(),
        });

        return this.getById(user.id, tenantId, isSuperAdmin);
    }

    /**
     * Update user
     */
    async update(id, data, tenantId, isSuperAdmin) {
        const user = await this.getById(id, tenantId, isSuperAdmin);

        // Prevent updating to existing email
        if (data.email && data.email.toLowerCase() !== user.email) {
            const existingUser = await User.findOne({
                where: { email: data.email.toLowerCase() },
            });
            if (existingUser) {
                throw new Error('Email já cadastrado');
            }
            data.email = data.email.toLowerCase();
        }

        await user.update(data);

        return this.getById(id, tenantId, isSuperAdmin);
    }

    /**
     * Delete (deactivate) user
     */
    async delete(id, tenantId, isSuperAdmin) {
        const user = await this.getById(id, tenantId, isSuperAdmin);

        await user.destroy();

        return { message: 'Usuário excluído com sucesso' };
    }

    /**
     * Suspend/Unsuspend user
     */
    async toggleSuspend(id, tenantId, isSuperAdmin) {
        const user = await this.getById(id, tenantId, isSuperAdmin);

        await user.update({ is_active: !user.is_active });

        return user;
    }
}

module.exports = new UserService();
