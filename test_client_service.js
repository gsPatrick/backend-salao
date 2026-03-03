const clientService = require('./src/features/Client/client.service');

async function test() {
    try {
        const data = await clientService.getById(51, 1); // Client 51, Tenant 1
        console.log('Admin Panel Data (Packages):', JSON.stringify(data.packages, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

test();
