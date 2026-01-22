const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const FinancialTransaction = sequelize.define('FinancialTransaction', {
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
        appointment_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'appointments',
                key: 'id',
            },
        },
        description: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
        },
        date: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        due_date: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        type: {
            type: DataTypes.ENUM('receita', 'despesa'),
            allowNull: false,
        },
        status: {
            type: DataTypes.ENUM('pago', 'pendente', 'vencida', 'cancelada'),
            allowNull: false,
            defaultValue: 'pendente',
        },
        payment_method: {
            type: DataTypes.STRING(50),
            allowNull: true,
        },
        category: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        unit: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        bill_attachment: {
            type: DataTypes.STRING(500),
            allowNull: true,
        },
        receipt_attachment: {
            type: DataTypes.STRING(500),
            allowNull: true,
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
    }, {
        tableName: 'financial_transactions',
        timestamps: true,
    });

    FinancialTransaction.associate = (models) => {
        FinancialTransaction.belongsTo(models.Tenant, {
            foreignKey: 'tenant_id',
            as: 'tenant',
        });
        FinancialTransaction.belongsTo(models.Appointment, {
            foreignKey: 'appointment_id',
            as: 'appointment',
        });
    };

    return FinancialTransaction;
};
