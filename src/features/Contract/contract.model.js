const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const ContractTemplate = sequelize.define('ContractTemplate', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    tenant_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    title: { // Maps to 'name' in frontend, but title is better DB name. will map in controller.
        type: DataTypes.STRING,
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM('Contrato', 'Termo'),
        allowNull: false,
        defaultValue: 'Contrato'
    },
    content: {
        type: DataTypes.TEXT('long'),
        allowNull: false
    },
    active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'contract_templates',
    timestamps: true,
    underscored: true
});

module.exports = ContractTemplate;
