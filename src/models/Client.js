const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Client = sequelize.define('client', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    tenant_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    unit_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'units',
            key: 'id'
        }
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    social_name: {
        type: DataTypes.STRING,
        allowNull: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: true
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: true
    },
    cpf: {
        type: DataTypes.STRING,
        allowNull: true
    },
    gender: {
        type: DataTypes.STRING,
        allowNull: true
    },
    birth_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    plan_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    package_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    photo_url: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    observation: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    crm_stage: {
        type: DataTypes.STRING,
        defaultValue: 'new', // 'new', 'contacted', 'scheduled', 'won', 'lost'
        allowNull: true
    },
    how_found_us: {
        type: DataTypes.STRING, // Acquisition Channel
        allowNull: true
    },
    indicated_by: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Name of the person who referred this client'
    },
    status: {
        type: DataTypes.STRING,
        allowNull: true
    },
    blocked_reason: {
        type: DataTypes.STRING,
        allowNull: true
    },
    address: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {}
    },
    marital_status: {
        type: DataTypes.STRING,
        allowNull: true
    },
    history: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: []
    },
    preferences: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: []
    },
    packages: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: []
    },
    procedure_photos: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: []
    },
    documents: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: []
    },
    additional_phones: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: []
    },
    last_visit: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    total_visits: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    preferred_unit: {
        type: DataTypes.STRING,
        allowNull: true
    },
    password: {
        type: DataTypes.STRING,
        defaultValue: '123'
    },
    login_email: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Email used by client to login to the app (different from visual email)'
    },
    reminders: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: []
    },
    relationships: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: []
    },
    is_complete_registration: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
    }
}, {
    tableName: 'clients',
    underscored: true
});

module.exports = Client;
