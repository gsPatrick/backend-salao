const { FinancialTransaction, Appointment, sequelize } = require('../../models');
const { Op } = require('sequelize');

class FinanceService {
    async getAll(tenantId, filters = {}) {
        const where = { tenant_id: tenantId };

        if (filters.type) where.type = filters.type;
        if (filters.status) where.status = filters.status;
        if (filters.dateFrom && filters.dateTo) {
            where.date = { [Op.between]: [filters.dateFrom, filters.dateTo] };
        }

        return FinancialTransaction.findAll({
            where,
            include: [{ model: Appointment, as: 'appointment' }],
            order: [['date', 'DESC']],
        });
    }

    async getById(id, tenantId) {
        const transaction = await FinancialTransaction.findOne({
            where: { id, tenant_id: tenantId },
        });
        if (!transaction) throw new Error('Transação não encontrada');
        return transaction;
    }

    async create(data, tenantId) {
        return FinancialTransaction.create({ ...data, tenant_id: tenantId });
    }

    async update(id, data, tenantId) {
        const transaction = await this.getById(id, tenantId);
        await transaction.update(data);
        return transaction;
    }

    async delete(id, tenantId) {
        const transaction = await this.getById(id, tenantId);
        await transaction.update({ status: 'cancelada' });
        return { message: 'Transação cancelada' };
    }

    async markAsPaid(id, tenantId) {
        const transaction = await this.getById(id, tenantId);
        await transaction.update({ status: 'pago' });
        return transaction;
    }

    async getSummary(tenantId, period = 'month') {
        const now = new Date();
        let dateFrom, dateTo;

        if (period === 'today') {
            dateFrom = dateTo = now.toISOString().split('T')[0];
        } else if (period === 'week') {
            const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
            dateFrom = weekAgo.toISOString().split('T')[0];
            dateTo = now.toISOString().split('T')[0];
        } else {
            dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            dateTo = now.toISOString().split('T')[0];
        }

        const transactions = await this.getAll(tenantId, { dateFrom, dateTo });

        const receitas = transactions.filter(t => t.type === 'receita' && t.status === 'pago')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);
        const despesas = transactions.filter(t => t.type === 'despesa' && t.status === 'pago')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);
        const pendentes = transactions.filter(t => t.status === 'pendente')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);
        const vencidas = transactions.filter(t => t.status === 'vencida')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);

        return {
            receitas,
            despesas,
            saldo: receitas - despesas,
            pendentes,
            vencidas,
            total_transacoes: transactions.length,
        };
    }
}

module.exports = new FinanceService();
