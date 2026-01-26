const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const AIAgentConfig = sequelize.define('ai_agent_config', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    tenant_id: { // One config per tenant
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true // Ensure 1:1
    },
    active_plan: {
        type: DataTypes.ENUM('Básico', 'Avançada', 'Nenhum'),
        defaultValue: 'Nenhum'
    },
    agent_name: {
        type: DataTypes.STRING,
        defaultValue: 'Assistente Virtual'
    },
    personality: {
        type: DataTypes.STRING,
        defaultValue: 'Profissional e acolhedora'
    },
    prompt_behavior: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Custom instructions for the AI behavior'
    },
    is_voice_enabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    zapi_instance_id: {
        type: DataTypes.STRING,
        allowNull: true
    },
    voice_id: {
        type: DataTypes.STRING, // e.g., ElevenLabs ID or Google Voice name
        allowNull: true
    },
    basic_agent_name: {
        type: DataTypes.STRING,
        defaultValue: 'Júlia'
    },
    basic_reminder_msg: {
        type: DataTypes.TEXT,
        defaultValue: 'Olá, [NOME_CLIENTE]! Passando para lembrar do seu horário amanhã às [HORARIO]...'
    },
    custom_personality: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    voice_settings: {
        type: DataTypes.JSON,
        defaultValue: {
            speed: 1.0,
            pitch: 1.1,
            variation: 0.5,
            pauses: 0.5,
            expressiveness: 0.5,
            breaths: 0.5,
            tempoVariation: 0.5
        }
    }
}, {
    tableName: 'ai_agent_configs',
    underscored: true
});

module.exports = AIAgentConfig;
