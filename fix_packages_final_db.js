const { Appointment, MonthlyPackage, SalonPlan } = require('./src/models');
const { Op } = require('sequelize');

async function fixAppointmentsDB() {
    console.log('--- Iniciando correção da tabela appointments ---');
    try {
        const apps = await Appointment.findAll({
            where: {
                [Op.or]: [
                    { package_id: { [Op.ne]: null } },
                    { salon_plan_id: { [Op.ne]: null } }
                ],
                status: { [Op.notIn]: ['cancelado', 'reagendado', 'faltou'] }
            }
        });

        let updatedCount = 0;
        const groups = {};

        // Group by tenant + client + (package or plan)
        apps.forEach(a => {
            const key = `${a.tenant_id}_${a.client_id}_${a.package_id ? 'pkg_' + a.package_id : 'plan_' + a.salon_plan_id}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(a);
        });

        for (const key of Object.keys(groups)) {
            const group = groups[key];
            group.sort((a, b) => {
                const dateA = new Date(a.date + 'T' + (a.time || '00:00')).getTime();
                const dateB = new Date(b.date + 'T' + (b.time || '00:00')).getTime();
                return dateA - dateB;
            });

            let changedAny = false;

            // Retroactive Auto-Complete rule
            for (let i = 0; i < group.length; i++) {
                const current = group[i];
                if (['concluido', 'atendido', 'pago'].includes((current.status || '').toLowerCase())) continue;

                let shouldConclude = false;
                for (let j = i + 1; j < group.length; j++) {
                    const later = group[j];
                    if (['concluido', 'atendido', 'pago'].includes((later.status || '').toLowerCase())) {
                        shouldConclude = true;
                        break;
                    }
                }

                if (shouldConclude) {
                    await current.update({ status: 'concluido' });
                    changedAny = true;
                    updatedCount++;
                    console.log(`[Fixed] Appointment ID ${current.id} retroactively marked as 'concluido' (previous session strategy).`);
                }
            }

            // Determine max sessions
            const first = group[0];
            let maxSessions = 0;
            if (first.package_id) {
                const pkg = await MonthlyPackage.findByPk(first.package_id);
                if (pkg) maxSessions = parseInt(pkg.clicks || pkg.sessions || '0', 10);
            } else if (first.salon_plan_id) {
                const plan = await SalonPlan.findByPk(first.salon_plan_id);
                if (plan) maxSessions = parseInt(plan.sessions || '0', 10);
            }

            // Force finalize last session if it reached maxSessions
            if (maxSessions > 0 && group.length >= maxSessions) {
                // We order chronological, so the LAST item is the nth session
                const lastItems = group.slice(-1);
                for (const last of lastItems) {
                    if (!['concluido', 'atendido', 'pago'].includes((last.status || '').toLowerCase())) {
                        await last.update({ status: 'concluido' });
                        changedAny = true;
                        updatedCount++;
                        console.log(`[Fixed] Appointment ID ${last.id} retroactively marked as 'concluido' (last session strategy: ${group.length}/${maxSessions}).`);
                    }
                }
                
                // Extra failsafe: If there are exactly maxSessions, ALL should be concluded.
                for (let i = 0; i < group.length; i++) {
                   const curr = group[i];
                   if (!['concluido', 'atendido', 'pago'].includes((curr.status || '').toLowerCase())) {
                       await curr.update({ status: 'concluido' });
                       updatedCount++;
                       console.log(`[Fixed] Appointment ID ${curr.id} marked concluido (forced all to concluded because maxSessions reached).`);
                   }
                }
            }
        }

        console.log(`\n--- Finalizado. ${updatedCount} agendamentos atualizados. ---`);
    } catch (e) {
        console.error(e);
    }
}

fixAppointmentsDB().then(() => process.exit(0));
