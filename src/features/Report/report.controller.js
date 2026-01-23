const { FinancialTransaction, Appointment, Service, Product, StockTransaction, Client } = require('../../models');
const { Op, Sequelize } = require('sequelize');

exports.getFinancial = async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { startDate, endDate } = req.query;
        const where = { tenant_id: tenantId };

        if (startDate && endDate) {
            where.date = { [Op.between]: [startDate, endDate] };
        }

        // Aggregate Income vs Expense
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
            transactionCount: 0
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

        result.balance = result.income - result.expense;

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getOperational = async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { startDate, endDate } = req.query;
        const where = { tenant_id: tenantId };
        if (startDate && endDate) {
            where.date = { [Op.between]: [startDate, endDate] };
        }

        // Status counts
        const statusCounts = await Appointment.findAll({
            where,
            attributes: [
                'status',
                [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
            ],
            group: ['status']
        });

        const totalAppointments = await Appointment.count({ where });

        res.json({
            statusBreakdown: statusCounts,
            totalAppointments
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getSales = async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { startDate, endDate } = req.query;
        const where = {
            tenant_id: tenantId,
            type: 'out'
        }; // Outgoing stock

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
