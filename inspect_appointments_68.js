const { Appointment, MonthlyPackage, SalonPlan } = require('./src/models');

async function test() {
    try {
        const appointments = await Appointment.findAll({
            where: { client_id: 68 },
            include: [
                { model: MonthlyPackage, as: 'package' },
                { model: SalonPlan, as: 'salon_plan' }
            ],
            order: [['date', 'DESC'], ['time', 'DESC']]
        });

        console.log('Total Appointments for Client 68:', appointments.length);
        appointments.forEach(a => {
            console.log(`- Date: ${a.date}, Time: ${a.time}, PackageID: ${a.package_id}, PlanID: ${a.salon_plan_id}, Consumed: ${a.consumed_sessions}, Index: ${a.session_index}, Total: ${a.total_sessions}, Status: ${a.status}`);
        });

    } catch (err) {
        console.error('Test failed:', err);
    } finally {
        process.exit();
    }
}

test();
