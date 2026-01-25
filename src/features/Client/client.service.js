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

    async create(data, tenantId) {
        return Client.create({ ...data, tenant_id: tenantId });
    }

    async update(id, data, tenantId) {
        const client = await this.getById(id, tenantId);
        await client.update(data);
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
