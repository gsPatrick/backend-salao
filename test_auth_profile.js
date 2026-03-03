const authService = require('./src/features/Auth/auth.service');

async function test() {
    try {
        const profile = await authService.getProfile(68, 'cliente');
        console.log(JSON.stringify(profile.packages, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

test();
