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
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: { isEmail: true }
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
    photo_url: {
        type: DataTypes.STRING,
        allowNull: true
    },
    observation: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: 'clients',
    underscored: true
});

module.exports = Client;
