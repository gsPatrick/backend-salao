'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const [settings] = await queryInterface.sequelize.query(
      'SELECT id, funnel_stages, classifications FROM "crm_settings"'
    );

    for (const row of settings) {
      let updated = false;
      let funnel_stages = row.funnel_stages;
      
      if (Array.isArray(funnel_stages)) {
        funnel_stages = funnel_stages.map(stage => {
          if (stage.id === 'recurrent' && (stage.title === 'Recorrente' || !stage.title.includes('('))) {
            stage.title = 'Recorrentes (Ativos)';
            updated = true;
          }
          if (stage.id === 'inactive' && (stage.title === 'Inativo' || !stage.title.includes('+'))) {
            stage.title = 'Inativos (+60 Dias)';
            updated = true;
          }
          return stage;
        });
      }

      if (updated) {
        await queryInterface.sequelize.query(
          'UPDATE "crm_settings" SET funnel_stages = :funnel_stages WHERE id = :id',
          {
            replacements: { 
              funnel_stages: JSON.stringify(funnel_stages), 
              id: row.id 
            }
          }
        );
      }
    }
  },

  async down(queryInterface, Sequelize) {
    // No easy way to undo specifically for each tenant if they had custom names, 
    // but we can revert to standard ones if needed.
  }
};
