const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const StockTransaction = sequelize.define('stock_transaction', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    tenant_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    product_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM('in', 'out', 'adjustment'),
        allowNull: false
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    previous_quantity: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    new_quantity: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    reason: {
        type: DataTypes.STRING,
        allowNull: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    tableName: 'stock_transactions',
    underscored: true
});

module.exports = StockTransaction;
