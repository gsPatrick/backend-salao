const { FinancialTransaction, Appointment, Client, sequelize } = require('../../models');
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
        const mappedData = {
            ...data,
            tenant_id: tenantId,
            bill_attachment: data.billAttachment || data.bill_attachment,
            receipt_attachment: data.receiptAttachment || data.receipt_attachment
        };
        // Remove camelCase versions to avoid duplication if Sequelize is strict, 
        // though normally it just ignores extra fields.
        return FinancialTransaction.create(mappedData);
    }

    async update(id, data, tenantId) {
        const transaction = await this.getById(id, tenantId);
        const mappedData = {
            ...data,
            bill_attachment: data.billAttachment || data.bill_attachment,
            receipt_attachment: data.receiptAttachment || data.receipt_attachment
        };
        await transaction.update(mappedData);
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
        const appointments = await Appointment.findAll({
            where: {
                tenant_id: tenantId,
                date: { [Op.between]: [dateFrom, dateTo] }
            }
        });

        const totalTransCount = transactions.length;
        const receitasArr = transactions.filter(t => (t.type === 'receita' || t.type === 'income') && (t.status === 'pago' || t.status === 'paid'));
        const receitas = receitasArr.reduce((sum, t) => sum + parseFloat(t.amount), 0);

        const despesasArr = transactions.filter(t => (t.type === 'despesa' || t.type === 'expense') && (t.status === 'pago' || t.status === 'paid'));
        const despesas = despesasArr.reduce((sum, t) => sum + parseFloat(t.amount), 0);
        const pendentes = transactions.filter(t => t.status === 'pendente' || t.status === 'pending')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);
        const vencidas = transactions.filter(t => t.status === 'vencida' || t.status === 'overdue')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);

        console.log(`[Finance Summary] Tenant: ${tenantId}, Period: ${period}, DateRange: ${dateFrom} to ${dateTo}`);
        console.log(`[Finance Summary] Collected ${totalTransCount} transactions.`);
        console.log(`[Finance Summary] Filtered Receitas: ${receitasArr.length}, Total: ${receitas}`);
        console.log(`[Finance Summary] Filtered Despesas: ${despesasArr.length}, Total: ${despesas}`);

        const atendimentos = appointments.filter(a => a.status === 'Atendido' || a.status === 'Completed').length;
        const ticket_medio = atendimentos > 0 ? receitas / atendimentos : 0;

        // Generate chartData grouped by date
        const chartDataMap = {};
        transactions.forEach(t => {
            const dateKey = t.date;
            if (!chartDataMap[dateKey]) {
                chartDataMap[dateKey] = { income: 0, expenses: 0 };
            }
            if ((t.type === 'receita' || t.type === 'income') && (t.status === 'pago' || t.status === 'paid')) {
                chartDataMap[dateKey].income += parseFloat(t.amount);
            } else if ((t.type === 'despesa' || t.type === 'expense') && (t.status === 'pago' || t.status === 'paid')) {
                chartDataMap[dateKey].expenses += parseFloat(t.amount);
            }
        });

        // Sort dates and create arrays
        const sortedDates = Object.keys(chartDataMap).sort();
        const chartData = {
            labels: sortedDates.map(d => {
                const date = new Date(d + 'T00:00:00');
                return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            }),
            income: sortedDates.map(d => chartDataMap[d].income),
            expenses: sortedDates.map(d => chartDataMap[d].expenses)
        };

        return {
            receitas,
            despesas,
            saldo: receitas - despesas,
            pendentes,
            vencidas,
            total_transacoes: transactions.length,
            atendimentos,
            agendamentos: appointments.length,
            ticket_medio,
            chartData,
            clients_new: await Client.count({
                where: {
                    tenant_id: tenantId,
                    created_at: { [Op.between]: [dateFrom, dateTo] }
                }
            })
        };
    }
}

module.exports = new FinanceService();
