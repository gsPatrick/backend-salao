const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Unit = sequelize.define('Unit', {
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
        phone: {
            type: DataTypes.STRING(20),
            allowNull: true,
        },
        address: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: {},
        },
        is_suspended: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        additional_phones: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: [],
        },
        logo_url: {
            type: DataTypes.STRING(500),
            allowNull: true,
        },
        primary_color: {
            type: DataTypes.STRING(20),
            allowNull: true,
        },
        working_hours: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: [],
        },
        checkin_message: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
    }, {
        tableName: 'units',
        timestamps: true,
        underscored: true,
    });

    Unit.associate = (models) => {
        Unit.belongsTo(models.Tenant, {
            foreignKey: 'tenant_id',
            as: 'tenant',
        });
    };

    return Unit;
};
