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
        package_subscription_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
            references: {
                model: 'package_subscriptions',
                key: 'id'
            }
        },
        salon_plan_subscription_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
            references: {
                model: 'salon_plan_subscriptions',
                key: 'id'
            }
        },
        total_sessions: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        consumed_sessions: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        session_index: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'The sequential number of this session within the package/plan (1-based)'
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
        payment_status: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: 'pending',
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
        canceled_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        cancellation_reason: {
            type: DataTypes.TEXT,
            allowNull: true,
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
