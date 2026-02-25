const { FinancialTransaction, Appointment, Service, Product, StockTransaction, Client } = require('../../models');
const { Op, Sequelize } = require('sequelize');

exports.getFinancial = async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { startDate, endDate, unitId: queryUnitId } = req.query;
        const headerUnitId = req.headers['x-unit-id'];
        const unitId = queryUnitId || headerUnitId;

        const where = {
            tenant_id: tenantId,
            status: { [Op.in]: ['pago', 'paid'] }
        };

        if (unitId) {
            where.unit_id = unitId;
        }

        if (startDate && endDate) {
            where.date = { [Op.between]: [startDate, endDate] };
        }

        // 1. Sum Income vs Expense from Financial Transactions
        const transactions = await FinancialTransaction.findAll({
            where,
            attributes: [
                'type',
                [Sequelize.fn('SUM', Sequelize.col('amount')), 'total'],
                [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
            ],
            group: ['type']
        });

        const result = {
            income: 0,
            expense: 0,
            balance: 0,
            transactionCount: 0,
            appointmentBilling: 0 // New field for comparison
        };

        transactions.forEach(t => {
            const amount = parseFloat(t.dataValues.total) || 0;
            const count = parseInt(t.dataValues.count) || 0;

            if (t.type === 'income' || t.type === 'receita') {
                result.income += amount;
            } else {
                result.expense += amount;
            }
            result.transactionCount += count;
        });

        // 2. Fallback check: Aggregate billing from concluded appointments that MIGHT NOT have explicit transactions
        // (This happens during imports or legacy data sync)
        const appointmentBilling = await Appointment.sum('price', {
            where: {
                tenant_id: tenantId,
                unit_id: unitId || { [Op.ne]: null },
                date: { [Op.between]: [startDate, endDate] },
                status: { [Op.in]: ['concluido', 'finalizado', 'atendido', 'pago'] }
            }
        }) || 0;

        result.appointmentBilling = parseFloat(appointmentBilling);

        // If transaction income is less than concluded appointment billing, use appointment billing as primary income source
        // to avoid "0" reporting for existing real services.
        if (result.appointmentBilling > result.income) {
            console.log(`[Reports] Using Appointment billing (${result.appointmentBilling}) as income fallback for Tenant ${tenantId}`);
            result.income = result.appointmentBilling;
        }

        result.balance = result.income - result.expense;

        res.json(result);
    } catch (error) {
        console.error('[Reports Error] getFinancial:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.getOperational = async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { startDate, endDate, unitId: queryUnitId } = req.query;
        const headerUnitId = req.headers['x-unit-id'];
        const unitId = queryUnitId || headerUnitId;

        const where = { tenant_id: tenantId };

        if (unitId) {
            where.unit_id = unitId;
        }

        if (startDate && endDate) {
            where.date = { [Op.between]: [startDate, endDate] };
        }

        // Status counts - Ensuring we catch all variations
        const statusCounts = await Appointment.findAll({
            where,
            attributes: [
                'status',
                [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
            ],
            group: ['status']
        });

        // Aggregated Concluded (Operational KPI)
        const concludedCount = await Appointment.count({
            where: {
                ...where,
                status: { [Op.in]: ['concluido', 'finalizado', 'atendido', 'pago'] }
            }
        });

        const totalAppointments = await Appointment.count({ where });

        res.json({
            statusBreakdown: statusCounts,
            totalAppointments,
            concludedCount
        });
    } catch (error) {
        console.error('[Reports Error] getOperational:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.getSales = async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { startDate, endDate, unitId: queryUnitId } = req.query;
        const headerUnitId = req.headers['x-unit-id'];
        const unitId = queryUnitId || headerUnitId;

        const where = {
            tenant_id: tenantId,
            type: 'out'
        }; // Outgoing stock

        if (unitId) {
            where.unit_id = unitId;
        }

        if (startDate && endDate) {
            where.created_at = { [Op.between]: [startDate, endDate] };
        }

        const productSales = await StockTransaction.findAll({
            where,
            include: [{
                model: Product,
                as: 'product',
                attributes: ['name', 'sale_price']
            }],
            limit: 10,
            order: [['quantity', 'DESC']]
        });

        res.json({
            recentProductSales: productSales
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
