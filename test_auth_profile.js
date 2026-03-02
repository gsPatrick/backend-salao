const authService = require('./src/features/Auth/auth.service');

async function test() {
    try {
        const profile = await authService.getProfile(12, 'cliente');
        console.log('Profile result for ID 12:', JSON.stringify(profile, null, 2));
    } catch (err) {
        console.error('Test failed:', err);
    } finally {
        process.exit();
    }
}

test();
