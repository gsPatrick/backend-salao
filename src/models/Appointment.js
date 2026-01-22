const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Appointment = sequelize.define('Appointment', {
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
            allowNull: false,
            references: {
                model: 'services',
                key: 'id',
            },
        },
        date: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        time: {
            type: DataTypes.TIME,
            allowNull: false,
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
    });

    Appointment.associate = (models) => {
        Appointment.belongsTo(models.Tenant, {
            foreignKey: 'tenant_id',
            as: 'tenant',
        });
        Appointment.belongsTo(models.Client, {
            foreignKey: 'client_id',
            as: 'client',
        });
        Appointment.belongsTo(models.Professional, {
            foreignKey: 'professional_id',
            as: 'professional',
        });
        Appointment.belongsTo(models.Service, {
            foreignKey: 'service_id',
            as: 'service',
        });
    };

    return Appointment;
};
