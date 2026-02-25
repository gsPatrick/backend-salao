const { Plan } = require('../../models');
const { parseMonetaryValue } = require('../../utils/number');

class PlanService {
    async getAll() {
        return Plan.findAll({
            where: { is_active: true },
            order: [['price', 'ASC']],
        });
    }

    async getById(id) {
        const plan = await Plan.findByPk(id);
        if (!plan) throw new Error('Plano não encontrado');
        return plan;
    }

    async create(data) {
        if (data.price) data.price = parseMonetaryValue(data.price);
        return Plan.create(data);
    }

    async update(id, data) {
        const plan = await Plan.findByPk(id);
        if (!plan) throw new Error('Plano não encontrado');
        if (data.price) data.price = parseMonetaryValue(data.price);
        await plan.update(data);
        return plan;
    }

    async delete(id) {
        const plan = await Plan.findByPk(id);
        if (!plan) throw new Error('Plano não encontrado');
        await plan.update({ is_active: false });
        return { message: 'Plano desativado' };
    }
}

module.exports = new PlanService();
