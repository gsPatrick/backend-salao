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
    unitName: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'unit_name'
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    sendType: {
        type: DataTypes.ENUM('Email', 'SMS', 'WhatsApp'),
        defaultValue: 'Email',
        field: 'send_type'
    },
    emailSubject: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'email_subject'
    },
    emailBody: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'email_body'
    },
    emailAttachmentName: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'email_attachment_name'
    },
    phoneNumber: { // Sender ID or number
        type: DataTypes.STRING,
        allowNull: true,
        field: 'phone_number'
    },
    smsBody: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'sms_body'
    },
    whatsappBody: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'whatsapp_body'
    },
    whatsappMediaName: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'whatsapp_media_name'
    },
    scheduleDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: 'schedule_date'
    },
    status: {
        type: DataTypes.ENUM('Not Sent', 'Sent'),
        defaultValue: 'Not Sent'
    },
    scheduleSettings: {
        type: DataTypes.JSONB,
        defaultValue: [],
        field: 'schedule_settings'
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
