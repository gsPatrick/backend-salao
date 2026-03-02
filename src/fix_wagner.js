
const { User, Tenant } = require('./models');

async function fixWagnerIdentity() {
    try {
        console.log('🔄 Checking Wagner Identity...');

        const wagner = await User.findOne({ where: { email: 'admin@salao24h.com' } });

        if (!wagner) {
            console.error('❌ Wagner user not found!');
            return;
        }

        const tenant = await Tenant.findByPk(1);
        if (!tenant) {
            console.error('❌ Tenant 1 not found!');
            return;
        }

        if (wagner.tenant_id !== 1) {
            console.log(`⚠️ Wagner has tenant_id ${wagner.tenant_id}. Fixing to 1...`);
            await wagner.update({ tenant_id: 1, is_super_admin: true });
            console.log('✅ Wagner updated to Tenant 1 + Super Admin.');
        } else {
            console.log('✅ Wagner is already correctly linked to Tenant 1.');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit();
    }
}

fixWagnerIdentity();
