const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Appointment = sequelize.define('Appointment', {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        tenant_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        client_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'clients',
                key: 'id'
            }
        },
        professional_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'professionals',
                key: 'id'
            }
        },
        service_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'services',
                key: 'id'
            }
        },
        package_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        salon_plan_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        package_subscription_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        salon_plan_subscription_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        total_sessions: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 0
        },
        consumed_sessions: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 0
        },
        // NEW: Stores the sequential number of this specific session (e.g., 3 for "3rd session")
        session_index: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        // NEW: Payment Status for individual appointments
        payment_status: {
            type: DataTypes.ENUM('pending', 'paid', 'linked_to_package', 'refunded'),
            allowNull: false,
            defaultValue: 'pending'
        },
        date: {
            type: DataTypes.DATEONLY, // YYYY-MM-DD
            allowNull: true,
        },
        time: {
            type: DataTypes.TIME, // HH:MM:SS
            allowNull: true,
        },
        end_time: {
            type: DataTypes.TIME, // HH:MM:SS
            allowNull: true,
        },
        status: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'agendado', // agendado, confirmado, concluido, cancelado, faltou
        },
        price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        unit_id: {
            type: DataTypes.INTEGER,
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
