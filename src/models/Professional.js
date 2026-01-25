const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Professional = sequelize.define('Professional', {
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
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id',
            },
            comment: 'Optional link to system user',
        },
        name: {
            type: DataTypes.STRING(200),
            allowNull: false,
        },
        social_name: {
            type: DataTypes.STRING(200),
            allowNull: true,
        },
        photo: {
            type: DataTypes.STRING(500),
            allowNull: true,
            defaultValue: 'https://i.pravatar.cc/150?u=default',
        },
        occupation: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        specialties: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: [],
        },
        cpf: {
            type: DataTypes.STRING(14),
            allowNull: true,
        },
        birthdate: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        marital_status: {
            type: DataTypes.STRING(50),
            allowNull: true,
        },
        pis: {
            type: DataTypes.STRING(20),
            allowNull: true,
        },
        phone: {
            type: DataTypes.STRING(20),
            allowNull: true,
        },
        email: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        address: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: {},
        },
        unit: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        // Schedule settings
        start_time: {
            type: DataTypes.TIME,
            allowNull: true,
            defaultValue: '09:00',
        },
        lunch_start: {
            type: DataTypes.TIME,
            allowNull: true,
            defaultValue: '12:00',
        },
        lunch_end: {
            type: DataTypes.TIME,
            allowNull: true,
            defaultValue: '13:00',
        },
        end_time: {
            type: DataTypes.TIME,
            allowNull: true,
            defaultValue: '18:00',
        },
        allow_overtime: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        open_schedule: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        commission: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: 0.00,
        },
        is_suspended: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        is_archived: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        documents: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: [],
        },
    }, {
        tableName: 'professionals',
        timestamps: true,
    });

    Professional.associate = (models) => {
        Professional.belongsTo(models.Tenant, {
            foreignKey: 'tenant_id',
            as: 'tenant',
        });
        Professional.belongsTo(models.User, {
            foreignKey: 'user_id',
            as: 'user',
        });
        Professional.hasMany(models.Appointment, {
            foreignKey: 'professional_id',
            as: 'appointments',
        });
        Professional.belongsToMany(models.Service, {
            through: 'professional_services',
            foreignKey: 'professional_id',
            otherKey: 'service_id',
            as: 'services',
        });
    };

    return Professional;
};
