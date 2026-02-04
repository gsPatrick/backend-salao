const { Unit } = require('./src/models');

async function test() {
    try {
        const unit = await Unit.findOne({
            where: { name: 'Sede' } // Assuming there is a unit called Sede or just any
        });
        console.log('Unit found:', unit ? unit.toJSON() : 'Not found');
    } catch (e) {
        console.error('Error finding unit:', e.message);
    } finally {
        process.exit();
    }
}

test();
