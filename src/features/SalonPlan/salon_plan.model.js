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
    unit_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'units',
            key: 'id'
        }
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
    active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    is_suspended: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    is_favorite: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    usage_type: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'Serviços'
    }
}, {
    tableName: 'salon_plans',
    timestamps: true,
    underscored: true
});

module.exports = SalonPlan;
