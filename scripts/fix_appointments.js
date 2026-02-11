/**
 * Script to fix existing broken appointments in the database.
 * 
 * Issues fixed:
 * 1. Appointments missing client_id or professional_id
 * 2. Appointments with package_id/salon_plan_id that have string service names instead of IDs
 * 
 * Usage: node scripts/fix_appointments.js
 */

const sequelize = require('../src/config/db');
const { Appointment, Client, Professional, Service, MonthlyPackage, SalonPlan, PackageSubscription, SalonPlanSubscription } = require('../src/models');
const { Op } = require('sequelize');

async function fixAppointments() {
    console.log('=== Appointment Fix Script ===\n');

    try {
        await sequelize.authenticate();
        console.log('✅ Database connected\n');

        // 1. Find appointments with missing client_id or professional_id
        const brokenAppointments = await Appointment.findAll({
            where: {
                [Op.or]: [
                    { client_id: null },
                    { professional_id: null }
                ]
            },
            raw: true
        });

        console.log(`Found ${brokenAppointments.length} appointments with missing client_id or professional_id\n`);

        if (brokenAppointments.length > 0) {
            for (const apt of brokenAppointments) {
                console.log(`  Appointment #${apt.id}: client_id=${apt.client_id}, professional_id=${apt.professional_id}, date=${apt.date}, status=${apt.status}`);

                // Try to find the client by name if available via package subscription
                let fixedClientId = apt.client_id;
                let fixedProfessionalId = apt.professional_id;

                // If package_id exists, try to find client from subscription
                if (!fixedClientId && apt.package_id) {
                    const sub = await PackageSubscription.findOne({
                        where: { package_id: apt.package_id, tenant_id: apt.tenant_id },
                        order: [['createdAt', 'DESC']]
                    });
                    if (sub) {
                        fixedClientId = sub.client_id;
                        console.log(`    → Found client_id=${fixedClientId} from package subscription`);
                    }
                }

                // If salon_plan_id exists, try to find client from subscription
                if (!fixedClientId && apt.salon_plan_id) {
                    const sub = await SalonPlanSubscription.findOne({
                        where: { plan_id: apt.salon_plan_id, tenant_id: apt.tenant_id },
                        order: [['createdAt', 'DESC']]
                    });
                    if (sub) {
                        fixedClientId = sub.client_id;
                        console.log(`    → Found client_id=${fixedClientId} from plan subscription`);
                    }
                }

                // If still no professional, assign the first active professional of the tenant
                if (!fixedProfessionalId) {
                    const prof = await Professional.findOne({
                        where: {
                            tenant_id: apt.tenant_id,
                            is_suspended: false,
                            is_archived: false
                        },
                        order: [['id', 'ASC']]
                    });
                    if (prof) {
                        fixedProfessionalId = prof.id;
                        console.log(`    → Assigned professional_id=${fixedProfessionalId} (${prof.name})`);
                    }
                }

                if (fixedClientId && fixedProfessionalId) {
                    await Appointment.update(
                        { client_id: fixedClientId, professional_id: fixedProfessionalId },
                        { where: { id: apt.id } }
                    );
                    console.log(`    ✅ Fixed appointment #${apt.id}`);
                } else {
                    // Can't fix - delete the broken appointment
                    console.log(`    ❌ Cannot fix appointment #${apt.id} (no client/professional found). Deleting...`);
                    await Appointment.destroy({ where: { id: apt.id } });
                    console.log(`    🗑️  Deleted appointment #${apt.id}`);
                }
            }
        }

        // 2. Find appointments with service as string name (no service_id, package_id, or salon_plan_id)
        const noItemAppointments = await Appointment.findAll({
            where: {
                service_id: null,
                package_id: null,
                salon_plan_id: null
            },
            raw: true
        });

        console.log(`\nFound ${noItemAppointments.length} appointments with no service_id/package_id/salon_plan_id\n`);

        if (noItemAppointments.length > 0) {
            for (const apt of noItemAppointments) {
                // Try to find service by name in the 'unit' or notes field
                const serviceName = apt.notes || apt.unit;
                if (serviceName) {
                    const service = await Service.findOne({
                        where: {
                            name: { [Op.like]: `%${serviceName}%` },
                            tenant_id: apt.tenant_id
                        }
                    });
                    if (service) {
                        await Appointment.update(
                            { service_id: service.id },
                            { where: { id: apt.id } }
                        );
                        console.log(`  ✅ Fixed appointment #${apt.id}: matched service "${service.name}" (id=${service.id})`);
                        continue;
                    }
                }
                console.log(`  ⚠️  Appointment #${apt.id} has no item and couldn't be auto-fixed (date=${apt.date}, status=${apt.status})`);
            }
        }

        // 3. Summary stats
        const totalAppointments = await Appointment.count();
        const validAppointments = await Appointment.count({
            where: {
                client_id: { [Op.not]: null },
                professional_id: { [Op.not]: null },
                [Op.or]: [
                    { service_id: { [Op.not]: null } },
                    { package_id: { [Op.not]: null } },
                    { salon_plan_id: { [Op.not]: null } }
                ]
            }
        });

        console.log(`\n=== Summary ===`);
        console.log(`Total appointments: ${totalAppointments}`);
        console.log(`Valid appointments: ${validAppointments}`);
        console.log(`Invalid appointments: ${totalAppointments - validAppointments}`);
        console.log(`\n✅ Fix script completed!`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
}

fixAppointments();
