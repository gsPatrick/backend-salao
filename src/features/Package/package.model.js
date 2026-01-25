const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const MonthlyPackage = sequelize.define('MonthlyPackage', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
    },
    tenant_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    duration: { // in months
        type: DataTypes.INTEGER,
        defaultValue: 1
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
    }
}, {
    tableName: 'monthly_packages',
    timestamps: true,
    underscored: true
});

const PackageSubscription = sequelize.define('PackageSubscription', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
    },
    tenant_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    package_id: {
        type: DataTypes.BIGINT,
        allowNull: false
    },
    client_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    client_email: {
        type: DataTypes.STRING,
        allowNull: true
    },
    client_phone: {
        type: DataTypes.STRING,
        allowNull: true
    },
    client_address: {
        type: DataTypes.STRING,
        allowNull: true
    },
    responsible_name: { // Responsável
        type: DataTypes.STRING,
        allowNull: true
    },
    start_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    end_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('active', 'expired', 'archived'),
        defaultValue: 'active'
    },
    active: { // redundant with status but good for quick "isActive" check
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    clicks: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
}, {
    tableName: 'package_subscriptions',
    timestamps: true,
    underscored: true
});

// Relations
MonthlyPackage.hasMany(PackageSubscription, { foreignKey: 'package_id', as: 'subscriptions' });
PackageSubscription.belongsTo(MonthlyPackage, { foreignKey: 'package_id', as: 'package' });

module.exports = { MonthlyPackage, PackageSubscription };
