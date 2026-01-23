const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AIChat = sequelize.define('AIChat', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    tenant_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    customer_phone: {
        type: DataTypes.STRING,
        allowNull: false
    },
    customer_name: {
        type: DataTypes.STRING,
        allowNull: true
    },
    last_message: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('active', 'manual', 'archived'),
        defaultValue: 'active'
    },
    history: {
        type: DataTypes.JSON, // Stores the array of messages for OpenAI
        defaultValue: []
    }
}, {
    tableName: 'ai_chats',
    timestamps: true,
    underscored: true
});

module.exports = AIChat;
