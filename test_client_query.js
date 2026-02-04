const { Client } = require('./src/models');

async function test() {
    try {
        const client = await Client.findOne({
            where: { name: 'Qualquer' } // Just any
        });
        console.log('Client found:', client ? client.toJSON() : 'Not found');
    } catch (e) {
        console.error('Error finding client:', e.message);
    } finally {
        process.exit();
    }
}

test();
