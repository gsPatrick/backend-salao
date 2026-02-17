const sequelize = require('../config/db');

async function fixClientColumns() {
    try {
        console.log('Checking and fixing clients table columns...');

        // Add crm_stage if missing (should be there but just in case)
        await sequelize.query(`
            ALTER TABLE clients 
            ADD COLUMN IF NOT EXISTS crm_stage VARCHAR(255) DEFAULT 'new';
        `);

        // Add classification if missing
        await sequelize.query(`
            ALTER TABLE clients 
            ADD COLUMN IF NOT EXISTS classification VARCHAR(255);
        `);

        console.log('Column check/fix completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error fixing client columns:', error);
        process.exit(1);
    }
}

fixClientColumns();
