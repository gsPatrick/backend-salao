const { Client } = require('./src/models');

async function fixClientHistoryJSONB() {
    console.log('--- Iniciando correção do JSONB history nos clientes ---');
    try {
        const clients = await Client.findAll({
            where: {
                // Find clients where history is not null (cast to text to check length/content)
            }
        });

        let updatedCount = 0;

        for (const c of clients) {
            if (!c.history || !Array.isArray(c.history) || c.history.length === 0) continue;

            let changed = false;
            const history = [...c.history];

            // Group by package_id / salon_plan_id
            const groups = {};
            history.forEach((h, index) => {
                if (h.package_id || h.salon_plan_id) {
                    const key = h.package_id ? `pkg_${h.package_id}` : `plan_${h.salon_plan_id}`;
                    if (!groups[key]) groups[key] = [];
                    groups[key].push({ ...h, originalIndex: index });
                }
            });

            for (const key of Object.keys(groups)) {
                const group = groups[key];
                // Sort by date/time
                group.sort((a, b) => {
                    const dateA = new Date(a.date + 'T' + (a.time || '00:00')).getTime();
                    const dateB = new Date(b.date + 'T' + (b.time || '00:00')).getTime();
                    return dateA - dateB;
                });

                // Find if a later session is concluded
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
                        current.status = 'concluido';
                        history[current.originalIndex] = { ...history[current.originalIndex], status: 'concluido' };
                        changed = true;
                        
                        // Also check last session logic just in case:
                        // If it's the last session in the group and count >= max sessions, conclude it?
                        // No, the user mainly complained about "anterior faltou colocar como atendido".
                    }
                }
                
                // Last session auto-finalization hook for JSONB
                // If the group has reached its total_sessions, ensure the last one is 'concluído'
                // User said: "esqueceu que quando e o ultimo pacote, ele finaliza na hora? mesmo se n fazer sentido ele so finaliza"
                const lastSession = group[group.length - 1];
                if (lastSession && typeof lastSession.total_sessions === 'number') {
                    if (group.length >= lastSession.total_sessions && !['concluido', 'atendido', 'pago'].includes((lastSession.status || '').toLowerCase())) {
                        lastSession.status = 'concluido';
                        history[lastSession.originalIndex] = { ...history[lastSession.originalIndex], status: 'concluido' };
                        changed = true;
                    }
                }
            }

            if (changed) {
                await c.update({ history });
                updatedCount++;
                console.log(`[Fixed] Client ID ${c.id} - ${c.name} history JSONB updated.`);
            }
        }

        console.log(`\n--- Finalizado. ${updatedCount} clientes tiveram o history atualizado. ---`);
    } catch (e) {
        console.error(e);
    }
}

fixClientHistoryJSONB().then(() => process.exit(0));
