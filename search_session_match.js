const { Client } = require('./src/models');
const { Op } = require('sequelize');

async function test() {
    try {
        const clients = await Client.findAll({
            where: {
                packages: {
                    [Op.ne]: null
                }
            }
        });

        console.log(`Checking ${clients.length} clients...`);
        clients.forEach(c => {
            if (Array.isArray(c.packages)) {
                c.packages.forEach(p => {
                    const used = p.used_sessions || p.clicks || 0;
                    const total = p.total_sessions || p.sessions || 0;
                    if (used == 2 && total == 12) {
                        console.log(`Found 2/12 Match! Client ID: ${c.id}, Name: ${c.name}, Pkg: ${p.name}`);
                    }
                    if (used == 3 && total == 3) {
                        console.log(`Found 3/3 Match! Client ID: ${c.id}, Name: ${c.name}, Pkg: ${p.name}`);
                    }
                });
            }
        });

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

test();
