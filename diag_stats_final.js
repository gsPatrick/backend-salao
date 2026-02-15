const sequelize = require('./src/config/db');
const { Client, FinancialTransaction } = require('./src/models');
const clientService = require('./src/features/Client/client.service');

async function diag(clientId) {
    try {
        console.log(`Starting FINAL diagnostic for Client ${clientId}...`);

        await clientService.updateStatistics(clientId);

        const c = await Client.findByPk(clientId);
        console.log('--- FINAL CLIENT STATUS ---');
        console.log(JSON.stringify({
            total_spent: c.total_spent,
            total_visits: c.total_visits,
            average_ticket: c.average_ticket
        }, null, 2));

        console.log('--- TRANSACTION AUDIT ---');
        const trans = await FinancialTransaction.findAll({
            where: { client_id: clientId },
            order: [['category', 'ASC']]
        });

        let revenue = 0;
        let expenses = 0;
        trans.forEach(t => {
            const amt = parseFloat(t.amount);
            if (t.type === 'receita') revenue += amt;
            else expenses += amt;
            console.log(`${t.type.toUpperCase()} | ${t.category.padEnd(10)} | ${t.amount.padStart(7)} | ${t.description}`);
        });
        console.log(`Revenue: ${revenue.toFixed(2)} | Expenses: ${expenses.toFixed(2)} | Net: ${(revenue - expenses).toFixed(2)}`);

        console.log('--- AGENDADO PLANS AUDIT ---');
        const [agendado] = await sequelize.query("SELECT id, price, status FROM appointments WHERE client_id = " + clientId + " AND status = 'agendado' AND price > 0 AND (package_id IS NOT NULL OR salon_plan_id IS NOT NULL)");
        agendado.forEach(a => console.log(`AGENDADO | ${a.price} | ID: ${a.id}`));

    } catch (err) {
        console.error('DIAG ERROR:', err.message);
    } finally {
        await sequelize.close();
        process.exit();
    }
}

diag(53);
