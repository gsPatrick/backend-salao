const { connectToWhatsApp, getSession } = require('./src/services/whatsapp.provider');
const { WhatsAppSession, Tenant } = require('./src/models');
const dotenv = require('dotenv');
dotenv.config();

(async () => {
    try {
        console.log('--- Starting Persistence Verification ---');

        // Mock Tenant ID
        const tenantId = 999;

        // 1. Simulate Connection
        console.log('1. Connecting...');
        await connectToWhatsApp(tenantId);

        // Wait for connection/saveCreds
        await new Promise(r => setTimeout(r, 5000));

        // 2. Check DB
        const count = await WhatsAppSession.count({ where: { tenant_id: tenantId } });
        console.log(`2. DB Check: Found ${count} session records for tenant ${tenantId}`);

        if (count > 0) {
            console.log('SUCCESS: Session data persisted to DB.');
        } else {
            console.error('FAILURE: No session data found in DB.');
        }

        process.exit(0);
    } catch (e) {
        console.error('ERROR:', e);
        process.exit(1);
    }
})();
