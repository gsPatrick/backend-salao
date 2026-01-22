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

        // Sync database (in development)
        if (process.env.NODE_ENV === 'development') {
            await sequelize.sync();
            console.log('✅ Database synchronized');
        }

        // Initialize HTTP server for Socket.io
        const http = require('http');
        const server = http.createServer(app);

        // Initialize Socket.io
        const { initSocket } = require('./src/features/Chat/chat.socket');
        initSocket(server);

        // Start server
        server.listen(PORT, () => {
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
