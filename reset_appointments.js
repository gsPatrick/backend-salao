const { Sequelize } = require('sequelize');
const config = require('./src/config/database.js');
const { Appointment } = require('./src/models');

const sequelize = new Sequelize(config.development);

async function resetAppointments() {
    try {
        console.log('Starting appointment cleanup...');

        // Option 1: Using Model destroy with truncate
        // await Appointment.destroy({ truncate: true, cascade: true });

        // Option 2: Raw Query for reliability with constraints
        await sequelize.query('TRUNCATE TABLE "appointments" RESTART IDENTITY CASCADE;');

        console.log('Successfully deleted ALL appointments.');

    } catch (error) {
        console.error('Error deleting appointments:', error);
    } finally {
        await sequelize.close();
    }
}

resetAppointments();
