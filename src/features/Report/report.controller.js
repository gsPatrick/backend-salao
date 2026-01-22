const { FinancialTransaction, Appointment, Service, Product, StockTransaction, Client } = require('../../models');
const { Op, Sequelize } = require('sequelize');

exports.getFinancial = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const where = {};

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

            if (t.type === 'income') {
                result.income = amount;
            } else {
                result.expense = amount;
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
        const { startDate, endDate } = req.query;
        const where = {};
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

        // Top Services (requires association, simplistic approach if association alias matches)
        // Assuming Appointment belongsTo Service
        // Note: Check model associations. If alias is 'service', we use it.
        // For simplicity, let's just count total appointments for now.

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
    // Sales here implies Services + Products sold?
    // Or just Products if we have a Sales module? 
    // Currently 'FinancialTransaction' covers generic revenue. 
    // 'StockTransaction' with type 'out' implies product usage/sale.
    try {
        const { startDate, endDate } = req.query;
        const where = { type: 'out' }; // Outgoing stock
        if (startDate && endDate) {
            where.created_at = { [Op.between]: [startDate, endDate] };
        }

        // This is strictly product movement, not necessarily $ sales unless we store price in transaction or join product
        const productSales = await StockTransaction.findAll({
            where,
            include: [{ model: Product, attributes: ['name', 'sale_price'] }],
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
