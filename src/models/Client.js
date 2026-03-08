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
    use_social_name: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
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
    rg: {
        type: DataTypes.STRING,
        allowNull: true
    },
    team: {
        type: DataTypes.STRING,
        allowNull: true
    },
    kinship: {
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
    classification: {
        type: DataTypes.STRING,
        allowNull: true
    },
    last_automated_move: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp of the last AI/Automation driven stage change'
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
    },
    total_spent: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
    },
    average_ticket: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
    },
    most_frequent_service: {
        type: DataTypes.STRING,
        allowNull: true
    },
    crm_attempt_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
        comment: 'Current attempt number within the funnel (0-8)'
    },
    crm_attempt_cycle: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        allowNull: false,
        comment: 'Current cycle number (used for Inactive funnel, max 2)'
    },
    crm_last_attempt_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Precise timestamp of the last automated message attempt'
    },
    crm_funnel_entered_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp of when the client entered the current CRM funnel'
    }
}, {
    tableName: 'clients',
    underscored: true
});

module.exports = Client;
