require('dotenv').config();

const app = require('./app');
const { sequelize } = require('./src/models');
const config = require('./src/config');

const PORT = config.port || 3001;

async function startServer() {
    try {
        // Test database connection
        await sequelize.authenticate();
        console.log('✅ Database connection established successfully');

        // ⚠️ DISABLING sequelize.sync({ alter: true })
        // We now rely on migrations (npm run db:migrate) for database schema changes.
        // This avoids errors with complex type changes like converted columns to JSONB.
        /*
        if (process.env.NODE_ENV === 'development') {
            await sequelize.sync({ alter: true });
            console.log('✅ Database synchronized (with alter: true)');
        }
        */

        // Start server
        const server = app.listen(PORT, () => {
            console.log(`
🚀 Salão24h API Server Started!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 URL: http://localhost:${PORT}
📋 API Docs: http://localhost:${PORT}/api
🏥 Health: http://localhost:${PORT}/api/health
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔐 Login Credentials:
   Super Admin: admin@salao24h.com / admin
   Gerente: gerente@salao24h.com / 123
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `);
        });

        // Initialize WebSockets
        const { initSocket } = require('./src/features/Chat/chat.socket');
        initSocket(server);

        // Initialize CRM Automation (Daily checks for Birthdays)
        const crmAutomation = require('./src/services/crm_automation.service');
        const ONE_DAY = 24 * 60 * 60 * 1000;
        setInterval(() => {
            crmAutomation.runDailyChecks().catch(err => console.error('CRM Automation Error:', err));
        }, ONE_DAY);

        // Initialize Marketing Dispatcher (Scheduled campaigns)
        const marketingDispatcher = require('./src/services/marketing_dispatcher.service');
        marketingDispatcher.start();

        // Initialize Reminder Service (Minute-level checks)
        const reminderService = require('./src/services/reminder.service');
        const ONE_MINUTE = 60 * 1000;
        setInterval(() => {
            reminderService.processReminders().catch(err => console.error('[Reminder Service] Error:', err));
        }, ONE_MINUTE);

        // Run once on startup (checks for anything missed while server was down)
        setTimeout(() => {
            crmAutomation.runDailyChecks().catch(err => console.error('CRM Automation Startup Error:', err));
            reminderService.processReminders().catch(err => console.error('[Reminder Service] Startup Error:', err));
        }, 10000);
    } catch (error) {
        console.error('❌ Unable to start server:', error);
        process.exit(1);
    }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    await sequelize.close();
    process.exit(0);
});

startServer();
