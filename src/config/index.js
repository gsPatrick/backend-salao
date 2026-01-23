require('dotenv').config();

module.exports = {
    port: process.env.PORT || 3001,
    nodeEnv: process.env.NODE_ENV || 'development',
    jwt: {
        secret: process.env.JWT_SECRET || 'salao24h_default_secret',
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },
    superAdminEmail: process.env.SUPER_ADMIN_EMAIL || 'admin@salao24h.com',
    externalServices: {
        zapi: {
            instanceId: process.env.ZAPI_INSTANCE_ID,
            token: process.env.ZAPI_TOKEN,
            clientToken: process.env.ZAPI_CLIENT_TOKEN,
        },
        openai: {
            apiKey: process.env.OPENAI_API_KEY,
        },
        asaas: {
            apiKey: process.env.ASAAS_API_KEY,
            webhookToken: process.env.ASAAS_WEBHOOK_TOKEN,
        },
    },
};
