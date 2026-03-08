
const { Client, Appointment, PackageSubscription, MonthlyPackage, SalonPlan, SalonPlanSubscription } = require('./src/models');
const { Op } = require('sequelize');

async function debugJulianaDetailed() {
    try {
        const j = await Client.findByPk(68);
        console.log(`Client: ${j.name} (ID: 68)`);
        
        const apps = await Appointment.findAll({
            where: { client_id: j.id },
            order: [['date', 'ASC'], ['time', 'ASC']]
        });

        console.log(`Appointments Found: ${apps.length}`);
        for (const a of apps) {
            console.log(`- [${a.date} ${a.time}] ID=${a.id}, Pkg=${a.package_id}, Plan=${a.salon_plan_id}, Index=${a.session_index}/${a.total_sessions}, Status=${a.status}`);
        }
    } catch (err) {
        console.error('ERROR:', err);
    } finally {
        process.exit();
    }
}

debugJulianaDetailed();
