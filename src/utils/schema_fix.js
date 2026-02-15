
/**
 * Schema Repair Utility
 * Ensures specific columns exist on startup.
 * This is a lightweight alternative to migrations for critical fields.
 */
async function ensureCRMSchema(sequelize) {
    try {
        console.log('[Schema Fix] Checking CRM schema...');

        // 1. Check if 'classifications' column exists in 'crm_settings'
        const [results] = await sequelize.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'crm_settings' AND column_name = 'classifications'
        `);

        if (results.length === 0) {
            console.log('[Schema Fix] Column "classifications" not found. Adding it now...');
            await sequelize.query(`
                ALTER TABLE crm_settings 
                ADD COLUMN classifications JSONB DEFAULT '[{"icon": "💎", "text": "Recorrente"}, {"icon": "⭐", "text": "Novo"}, {"icon": "✅", "text": "Agendado"}, {"icon": "❌", "text": "Faltou"}, {"icon": "⏳", "text": "Inativo"}]'
            `);
            console.log('[Schema Fix] Column "classifications" added successfully.');
        } else {
            console.log('[Schema Fix] Column "classifications" already exists.');
        }

        return true;
    } catch (error) {
        console.error('[Schema Fix] Error fixing CRM schema:', error);
        return false;
    }
}

module.exports = { ensureCRMSchema };
