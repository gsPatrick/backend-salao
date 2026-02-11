const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Appointment = sequelize.define('Appointment', {
        id: {
            type: DataTypes.BIGINT,
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
        unit_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'units',
                key: 'id',
            },
        },
        client_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'clients',
                key: 'id',
            },
        },
        professional_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'professionals',
                key: 'id',
            },
        },
        service_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'services',
                key: 'id',
            },
        },
        package_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
            references: {
                model: 'monthly_packages',
                key: 'id',
            },
        },
        salon_plan_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
            references: {
                model: 'salon_plans',
                key: 'id',
            },
        },
        date: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        time: {
            type: DataTypes.TIME,
            allowNull: true,
        },
        end_time: {
            type: DataTypes.TIME,
            allowNull: true,
        },
        status: {
            type: DataTypes.ENUM(
                'agendado',
                'confirmado',
                'em_atendimento',
                'concluido',
                'faltou',
                'cancelado',
                'reagendado'
            ),
            allowNull: false,
            defaultValue: 'agendado',
        },
        price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        unit: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        reminder_sent: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        confirmation_sent: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        created_by_user_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
    }, {
        tableName: 'appointments',
        timestamps: true,
        underscored: true,
    });



    return Appointment;
};
