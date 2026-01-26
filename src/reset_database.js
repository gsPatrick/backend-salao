/**
 * Database Reset Script
 * 
 * This script cleans the database for testing:
 * - Keeps all Plans (system plans)
 * - Keeps the SuperAdmin user (is_super_admin = true)
 * - Creates a fresh default tenant for the superadmin
 * - Deletes all other data
 */

require('dotenv').config();
const db = require('./models');

async function resetDatabase() {
    console.log('🔄 Starting database reset...');

    try {
        // 1. Find the superadmin user
        const superAdmin = await db.User.findOne({
            where: { is_super_admin: true }
        });

        if (!superAdmin) {
            console.error('❌ No SuperAdmin found! Aborting.');
            process.exit(1);
        }

        console.log(`✅ Found SuperAdmin: ${superAdmin.email}`);

        // 2. Get all table names to clean (in order due to foreign keys)
        const tablesToClean = [
            'ChatMessage',
            'TimeRecord',
            'StockTransaction',
            'FinancialTransaction',
            'Appointment',
            'ProfessionalReview',
            'PackageSubscription',
            'MonthlyPackage',
            'Lead',
            'MarketingCampaign',
            'SalonPlan',
            'ContractTemplate',
            'Promotion',
            'AIChat',
            'AIAgentConfig',
            'DirectMailCampaign',
            'Campaign',
            'AcquisitionChannel',
            'CRMSettings',
            'Product',
            'Client',
            'Service',
            'Professional',
            'Notification',
            'SupportTicket',
            'TrainingVideo',
            'AdBanner',
            'Unit'
        ];

        // 3. Delete all data from related tables
        console.log('\n🗑️  Cleaning tables...');
        for (const tableName of tablesToClean) {
            if (db[tableName]) {
                const deleted = await db[tableName].destroy({ where: {}, force: true });
                console.log(`   - ${tableName}: ${deleted} records deleted`);
            }
        }

        // 4. Delete all tenants
        console.log('\n🗑️  Deleting all tenants...');
        await db.Tenant.destroy({ where: {}, force: true });
        console.log('   - All tenants deleted');

        // 5. Delete all users except superadmin
        console.log('\n🗑️  Deleting all users except SuperAdmin...');
        await db.User.destroy({
            where: {
                id: { [db.sequelize.Sequelize.Op.ne]: superAdmin.id }
            },
            force: true
        });
        console.log('   - Other users deleted');

        // 6. Create a fresh default tenant for superadmin
        console.log('\n🆕 Creating fresh default tenant...');

        // Get the best available plan (Premium or first available)
        const plan = await db.Plan.findOne({
            where: { name: 'Empresa Premium' }
        }) || await db.Plan.findOne();

        const newTenant = await db.Tenant.create({
            name: 'Salão Demonstração',
            slug: 'salao-demonstracao',
            email: superAdmin.email,
            phone: '(71) 98286-2912',
            plan_id: plan?.id || null,
            address: 'Rua das Flores, 123 - Salvador, BA',
            primary_color: '#D4A574',
            description: 'Salão de demonstração para testes do sistema.',
            business_hours: [
                { day: 'Segunda', open: '09:00', close: '18:00', isOpen: true },
                { day: 'Terça', open: '09:00', close: '18:00', isOpen: true },
                { day: 'Quarta', open: '09:00', close: '18:00', isOpen: true },
                { day: 'Quinta', open: '09:00', close: '18:00', isOpen: true },
                { day: 'Sexta', open: '09:00', close: '18:00', isOpen: true },
                { day: 'Sábado', open: '09:00', close: '14:00', isOpen: true },
                { day: 'Domingo', open: null, close: null, isOpen: false }
            ],
            next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
        });

        console.log(`   - Created tenant: ${newTenant.name} (ID: ${newTenant.id})`);

        // 7. Create default unit "Unidade Matriz"
        console.log('\n🆕 Creating default unit...');
        await db.Unit.create({
            tenant_id: newTenant.id,
            name: 'Unidade Matriz',
            address: newTenant.address,
            phone: newTenant.phone,
            is_main: true
        });
        console.log('   - Created Unidade Matriz');

        // 8. Update superadmin to link to new tenant
        console.log('\n🔗 Linking SuperAdmin to default tenant...');
        await superAdmin.update({ tenant_id: newTenant.id });
        console.log('   - Linked SuperAdmin to tenant ID:', newTenant.id);

        // 9. Summary
        console.log('\n' + '='.repeat(50));
        console.log('🎉 DATABASE RESET COMPLETE!');
        console.log('='.repeat(50));
        console.log(`\n📧 SuperAdmin Email: ${superAdmin.email}`);
        console.log(`🏢 New Demo Tenant: ${newTenant.name}`);
        console.log(`📋 Plan: ${plan?.name || 'None'}`);
        console.log('\nYou can now login with the SuperAdmin credentials.');
        console.log('='.repeat(50));

    } catch (error) {
        console.error('❌ Error resetting database:', error);
        process.exit(1);
    } finally {
        await db.sequelize.close();
        process.exit(0);
    }
}

resetDatabase();
