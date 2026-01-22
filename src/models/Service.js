const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Service = sequelize.define('Service', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        tenant_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'tenants',
                key: 'id',
            },
        },
        name: {
            type: DataTypes.STRING(200),
            allowNull: false,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        duration: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 60,
            comment: 'Duration in minutes',
        },
        price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0,
        },
        category: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        unit: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        allow_any_professional: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        is_suspended: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        is_favorite: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
    }, {
        tableName: 'services',
        timestamps: true,
    });

    Service.associate = (models) => {
        Service.belongsTo(models.Tenant, {
            foreignKey: 'tenant_id',
            as: 'tenant',
        });
        Service.belongsToMany(models.Professional, {
            through: 'professional_services',
            foreignKey: 'service_id',
            otherKey: 'professional_id',
            as: 'professionals',
        });
        Service.hasMany(models.Appointment, {
            foreignKey: 'service_id',
            as: 'appointments',
        });
    };

    return Service;
};
