const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const ChatMessage = sequelize.define('chat_message', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    sender_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    receiver_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    attachment_url: {
        type: DataTypes.STRING,
        allowNull: true
    },
    attachment_type: {
        type: DataTypes.STRING, // 'image', 'file'
        allowNull: true
    },
    is_ai_generated: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    read: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    tableName: 'chat_messages',
    underscored: true
});

module.exports = ChatMessage;
