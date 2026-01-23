const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const CRMSettings = sequelize.define('crm_settings', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    tenant_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    funnel_stages: {
        type: DataTypes.JSONB,
        defaultValue: [
            { id: 'lead', name: 'Leads', color: '#3b82f6' },
            { id: 'contacted', name: 'Contato Feito', color: '#f59e0b' },
            { id: 'scheduled', name: 'Agendado', color: '#8b5cf6' },
            { id: 'converted', name: 'Convertido', color: '#10b981' },
            { id: 'lost', name: 'Perdido', color: '#ef4444' }
        ]
    },
    automation_rules: {
        type: DataTypes.JSONB,
        defaultValue: []
    }
}, {
    tableName: 'crm_settings',
    underscored: true
});

module.exports = CRMSettings;
