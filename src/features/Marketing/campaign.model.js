const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const Campaign = sequelize.define('campaign', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    target_audience: {
        type: DataTypes.JSONB, // Array of strings/identifiers
        defaultValue: []
    },
    audience_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    message_type: {
        type: DataTypes.ENUM('texto', 'imagem', 'audio', 'arquivo'),
        defaultValue: 'texto'
    },
    message_text: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    schedule_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('Agendada', 'Em Andamento', 'Concluída'),
        defaultValue: 'Agendada'
    },
    stats_reach: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    stats_conversions: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    stats_revenue: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
    },
    archived: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    tableName: 'campaigns',
    underscored: true
});

module.exports = Campaign;
