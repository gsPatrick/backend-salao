const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const MarketingCampaign = sequelize.define('marketing_campaign', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    tenant_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM('SMS', 'WhatsApp', 'Email'),
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('rascunho', 'agendado', 'enviado'),
        defaultValue: 'rascunho'
    },
    scheduled_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: 'scheduled_date'
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'marketing_campaigns',
    underscored: true
});

module.exports = MarketingCampaign;
