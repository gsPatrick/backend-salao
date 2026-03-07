const { Plan } = require('./src/models');

async function run() {
  try {
    const plans = await Plan.findAll();
    console.log(`Checking ${plans.length} plans...`);

    const standardPlans = [
      { id: 1, name: 'Plano Individual', display_name: 'Plano Individual' },
      { id: 2, name: 'Empresa Essencial', display_name: 'Empresa Essencial' },
      { id: 3, name: 'Empresa Pro', display_name: 'Empresa Pro' },
      { id: 4, name: 'Empresa Premium', display_name: 'Empresa Premium' },
      { id: 5, name: 'Vitalício', display_name: 'Vitalício' }
    ];

    for (const std of standardPlans) {
      const plan = await Plan.findByPk(std.id);
      if (plan) {
        if (plan.name !== std.name || plan.display_name !== std.display_name) {
          console.log(`Updating plan ${std.id}: ${plan.name} -> ${std.name}`);
          plan.name = std.name;
          plan.display_name = std.display_name;
          await plan.save();
        } else {
          console.log(`Plan ${std.id} (${plan.name}) is already correct.`);
        }
      } else {
        console.log(`Plan with ID ${std.id} not found. Creating it...`);
        await Plan.create(std);
      }
    }

    console.log('Finished checking/fixing plans table.');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

run();
