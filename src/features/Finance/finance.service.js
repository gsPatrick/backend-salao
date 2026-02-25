const { FinancialTransaction, Appointment, Client, sequelize } = require('../../models');
const { Op } = require('sequelize');

class FinanceService {
    async getAll(tenantId, filters = {}) {
        const { FinancialTransaction, Appointment, Client, Unit } = require('../../models');

        const where = { tenant_id: tenantId };

        if (filters.type) where.type = filters.type;
        if (filters.status) where.status = filters.status;
        if (filters.unitId) where.unit_id = filters.unitId;
        // Also support legacy 'unit' filter string if needed
        if (filters.unit && !filters.unitId) where.unit = filters.unit;

        if (filters.dateFrom && filters.dateTo) {
            where.date = { [Op.between]: [filters.dateFrom, filters.dateTo] };
        }

        const transactions = await FinancialTransaction.findAll({
            where,
            include: [{ model: Appointment, as: 'appointment' }],
            order: [['date', 'DESC']],
        });

        // Fetch Units to ensure consistent name-based filtering in frontend
        const units = await Unit.findAll({ where: { tenant_id: tenantId } });
        const unitMap = units.reduce((acc, u) => ({ ...acc, [u.id]: u.name }), {});

        const mappedTransactions = transactions.map(t => {
            const data = t.toJSON();
            // Map status/type to frontend expected values (Pago, Pendente, etc.)
            const status = (data.status || '').toLowerCase();
            if (['pago', 'paid'].includes(status)) data.status = 'Pago';
            else if (['pendente', 'pending'].includes(status)) data.status = 'Pendente';
            else if (['vencida', 'overdue'].includes(status)) data.status = 'Vencida';
            else data.status = 'Pendente';

            const type = (data.type || '').toLowerCase();
            data.type = (type === 'receita' || type === 'income') ? 'receita' : 'despesa';

            // Ensure unit name matches selectedUnit string in frontend
            if (!data.unit && data.unit_id && unitMap[data.unit_id]) {
                data.unit = unitMap[data.unit_id];
            }

            return data;
        });

        // REVENUE FALLBACK: If raw income is zero, inject virtual transactions from appointments
        const incomeTotal = mappedTransactions
            .filter(t => t.type === 'receita' && t.status === 'Pago')
            .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

        if (incomeTotal === 0) {
            console.log(`[Finance] No real income found. Injecting virtual transactions for Tenant: ${tenantId}`);
            const apptWhere = { tenant_id: tenantId };
            if (filters.unitId) apptWhere.unit_id = filters.unitId;
            if (filters.dateFrom && filters.dateTo) {
                apptWhere.date = { [Op.between]: [filters.dateFrom, filters.dateTo] };
            }
            const completionStatuses = ['concluido', 'finalizado', 'atendido', 'pago'];
            const concludedAppointments = await Appointment.findAll({
                where: {
                    ...apptWhere,
                    status: completionStatuses
                },
                include: [{ model: Client, as: 'client' }]
            });

            concludedAppointments.forEach(appt => {
                const price = parseFloat(appt.price) || 0;
                if (price > 0) {
                    mappedTransactions.push({
                        id: `v-${appt.id}`,
                        description: `Atendimento: ${appt.client?.name || 'Cliente'} (Virtual)`,
                        amount: price,
                        date: appt.date,
                        type: 'receita',
                        status: 'Pago',
                        unit: unitMap[appt.unit_id] || '',
                        unit_id: appt.unit_id,
                        is_virtual: true
                    });
                }
            });
            // Re-sort if we added virtuals
            mappedTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        }

        return mappedTransactions;
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
            unit_id: data.unit_id,
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
            unit_id: data.unit_id,
            bill_attachment: data.billAttachment || data.bill_attachment,
            receipt_attachment: data.receiptAttachment || data.receipt_attachment
        };
        await transaction.update(mappedData);
        return transaction;
    }

    async delete(id, tenantId) {
        const transaction = await this.getById(id, tenantId);
        await transaction.destroy();
        return { message: 'Transação excluída com sucesso' };
    }

    async markAsPaid(id, tenantId) {
        const transaction = await this.getById(id, tenantId);
        await transaction.update({ status: 'pago' });
        return transaction;
    }

    async getSummary(tenantId, period = 'mes', unitId = null) {
        const now = new Date();
        let dateFrom, dateTo;

        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        if (period === 'hoje' || period === 'today') {
            dateFrom = startOfToday.toISOString().split('T')[0];
            dateTo = endOfToday.toISOString().split('T')[0];
        } else if (period === 'semana' || period === 'week') {
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
            const monday = new Date(now.setDate(diff));
            monday.setHours(0, 0, 0, 0);
            dateFrom = monday.toISOString().split('T')[0];
            dateTo = endOfToday.toISOString().split('T')[0];
        } else if (period === 'ano' || period === 'year') {
            dateFrom = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
            dateTo = endOfToday.toISOString().split('T')[0];
        } else {
            // Default: month
            dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            dateTo = endOfToday.toISOString().split('T')[0];
        }

        const transactions = await this.getAll(tenantId, { dateFrom, dateTo, unitId });
        const appointmentsWhere = {
            tenant_id: tenantId,
            date: { [Op.between]: [dateFrom, dateTo] }
        };
        if (unitId) appointmentsWhere.unit_id = unitId;

        const appointments = await Appointment.findAll({
            where: appointmentsWhere
        });

        const totalTransCount = transactions.length;
        const receitasArr = transactions.filter(t =>
            (t.type === 'receita' || t.type === 'income') &&
            (t.status === 'pago' || t.status === 'paid')
        );
        let receitas = receitasArr.reduce((sum, t) => sum + parseFloat(t.amount), 0);

        const despesasArr = transactions.filter(t =>
            (t.type === 'despesa' || t.type === 'expense') &&
            (t.status === 'pago' || t.status === 'paid')
        );
        const despesas = despesasArr.reduce((sum, t) => sum + parseFloat(t.amount), 0);

        const pendentes = transactions.filter(t => t.status === 'pendente' || t.status === 'pending')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);
        const vencidas = transactions.filter(t => t.status === 'vencida' || t.status === 'overdue')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);

        // REVENUE FALLBACK: If transaction revenue is 0, check concluded appointments
        const completionStatuses = ['concluido', 'finalizado', 'atendido', 'pago'];
        const concludedAppointments = appointments.filter(a => completionStatuses.includes((a.status || '').toLowerCase()));
        const atendimentos = concludedAppointments.length;

        const appointmentBilling = concludedAppointments.reduce((sum, a) => sum + (parseFloat(a.price) || 0), 0);

        if (receitas === 0 && appointmentBilling > 0) {
            console.log(`[Finance Summary] Using Appointment billing fallback: ${appointmentBilling} for Tenant: ${tenantId}`);
            receitas = appointmentBilling;
        }

        const ticket_medio = atendimentos > 0 ? receitas / atendimentos : 0;

        // Generate chartData grouped by date
        const chartDataMap = {};

        // Helper to ensure date exists in map
        const ensureDate = (dateKey) => {
            if (!chartDataMap[dateKey]) {
                chartDataMap[dateKey] = { income: 0, expenses: 0, appointments: 0, clients: 0 };
            }
        };

        appointments.forEach(a => {
            const dateKey = a.date;
            if (!dateKey) return;
            ensureDate(dateKey);
            if (completionStatuses.includes((a.status || '').toLowerCase())) {
                chartDataMap[dateKey].appointments++;
            }
        });

        transactions.forEach(t => {
            const dateKey = t.date;
            if (!dateKey) return;
            ensureDate(dateKey);
            if ((t.type === 'receita' || t.type === 'income') && (t.status === 'pago' || t.status === 'paid')) {
                chartDataMap[dateKey].income += parseFloat(t.amount);
            } else if ((t.type === 'despesa' || t.type === 'expense') && (t.status === 'pago' || t.status === 'paid')) {
                chartDataMap[dateKey].expenses += parseFloat(t.amount);
            }
        });

        const clientsWhere = {
            tenant_id: tenantId,
            created_at: { [Op.between]: [new Date(dateFrom), new Date(dateTo + 'T23:59:59')] }
        };
        if (unitId) clientsWhere.unit_id = unitId;

        const clientsFull = await Client.findAll({ where: clientsWhere });
        clientsFull.forEach(c => {
            const date = new Date(c.registrationDate || c.createdAt);
            const dateKey = date.toISOString().split('T')[0];
            ensureDate(dateKey);
            chartDataMap[dateKey].clients++;
        });

        // Sort dates and create arrays
        const sortedDates = Object.keys(chartDataMap).sort();
        const chartData = {
            labels: sortedDates.map(d => {
                const date = new Date(d + 'T00:00:00');
                return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            }),
            income: sortedDates.map(d => chartDataMap[d].income),
            expenses: sortedDates.map(d => chartDataMap[d].expenses),
            appointments: sortedDates.map(d => chartDataMap[d].appointments),
            clients: sortedDates.map(d => chartDataMap[d].clients)
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
            clients_new: clientsFull.length
        };
    }
}

module.exports = new FinanceService();
