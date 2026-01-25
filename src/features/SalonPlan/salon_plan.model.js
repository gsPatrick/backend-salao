const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const SalonPlan = sequelize.define('SalonPlan', {
    id: {
        type: DataTypes.BIGINT,
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
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    duration: {
        type: DataTypes.STRING, // e.g., "1 mês", "15 dias"
        allowNull: true
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    sessions: {
        type: DataTypes.STRING, // e.g., "Ilimitadas", "10"
        allowNull: true
    },
    category: {
        type: DataTypes.STRING,
        allowNull: true
    },
    unit: {
        type: DataTypes.STRING,
        allowNull: true
    },
    is_suspended: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    is_favorite: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    tableName: 'salon_plans',
    timestamps: true,
    underscored: true
});

module.exports = SalonPlan;
