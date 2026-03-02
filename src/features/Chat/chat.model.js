const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const ChatMessage = sequelize.define('chat_message', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        tenant_id: {
            type: DataTypes.INTEGER,
            allowNull: false
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
        is_read: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        }
    }, {
        tableName: 'chat_messages',
        underscored: true
    });

    return ChatMessage;
};
