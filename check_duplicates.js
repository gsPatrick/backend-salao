const { Sequelize } = require('sequelize');
const config = require('./src/config/database.js');

const sequelize = new Sequelize(config.development);

async function checkDuplicates() {
    try {
        const [results] = await sequelize.query(`
            SELECT cpf, count(*) as count 
            FROM clients 
            WHERE cpf IS NOT NULL 
            GROUP BY cpf 
            HAVING count(*) > 1
        `);

        console.log(`Found ${results.length} CPFs with duplicates globally.`);

        if (results.length > 0) {
            console.log('Sample duplicates:', results.slice(0, 5));

            // Check if they are in the same tenant
            for (const dup of results.slice(0, 3)) {
                const [details] = await sequelize.query(`
                    SELECT id, name, tenant_id, cpf 
                    FROM clients 
                    WHERE cpf = '${dup.cpf}'
                `);
                console.log(`Details for CPF ${dup.cpf}:`, details);
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sequelize.close();
    }
}

checkDuplicates();
