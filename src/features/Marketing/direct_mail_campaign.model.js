const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const DirectMailCampaign = sequelize.define('direct_mail_campaign', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    tenant_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    unit_name: {
        type: DataTypes.STRING,
        allowNull: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    send_type: {
        type: DataTypes.ENUM('Email', 'SMS', 'WhatsApp'),
        defaultValue: 'Email'
    },
    email_subject: {
        type: DataTypes.STRING,
        allowNull: true
    },
    email_body: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    email_attachment_name: {
        type: DataTypes.STRING,
        allowNull: true
    },
    phone_number: { // Sender ID or number
        type: DataTypes.STRING,
        allowNull: true
    },
    sms_body: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    whatsapp_body: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    whatsapp_media_name: {
        type: DataTypes.STRING,
        allowNull: true
    },
    schedule_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('Not Sent', 'Sent'),
        defaultValue: 'Not Sent'
    },
    schedule_settings: {
        type: DataTypes.JSONB,
        defaultValue: []
    },
    history: {
        type: DataTypes.JSONB,
        defaultValue: []
    },
    roi: {
        type: DataTypes.JSONB,
        defaultValue: {
            totalSent: 0,
            openRate: '0%',
            clicks: 0,
            conversions: 0,
            revenue: 0
        }
    },
    archived: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    tableName: 'direct_mail_campaigns',
    underscored: true
});

module.exports = DirectMailCampaign;
