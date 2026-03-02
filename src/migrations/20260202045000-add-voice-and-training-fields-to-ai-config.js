'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const tableInfo = await queryInterface.describeTable('ai_agent_configs');

        if (!tableInfo.use_custom_voice) {
            await queryInterface.addColumn('ai_agent_configs', 'use_custom_voice', {
                type: Sequelize.BOOLEAN,
                defaultValue: false
            });
        }

        if (!tableInfo.custom_voice_url) {
            await queryInterface.addColumn('ai_agent_configs', 'custom_voice_url', {
                type: Sequelize.STRING,
                allowNull: true
            });
        }

        if (!tableInfo.training_files) {
            await queryInterface.addColumn('ai_agent_configs', 'training_files', {
                type: Sequelize.JSONB,
                defaultValue: []
            });
        }
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('ai_agent_configs', 'use_custom_voice');
        await queryInterface.removeColumn('ai_agent_configs', 'custom_voice_url');
        await queryInterface.removeColumn('ai_agent_configs', 'training_files');
    }
};
