const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const Promotion = sequelize.define('Promotion', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    tenant_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM('standard', 'exclusive'),
        defaultValue: 'standard',
        allowNull: false
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    subtitle: {
        type: DataTypes.STRING,
        allowNull: true
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    call_to_action: { // 'Chamada'
        type: DataTypes.STRING,
        allowNull: true
    },
    image_url: { // Stores URL or Base64 (for now)
        type: DataTypes.TEXT('long'),
        allowNull: true
    },
    link_url: { // promotionUrl or bannerLink
        type: DataTypes.STRING,
        allowNull: true
    },
    target_area: {
        type: DataTypes.ENUM('client', 'painel'),
        defaultValue: 'painel'
    },
    action_button: {
        type: DataTypes.STRING, // 'Comprar Agora'
        allowNull: true
    },
    start_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    end_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    clicks: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
}, {
    tableName: 'promotions',
    timestamps: true,
    underscored: true
});

module.exports = Promotion;
