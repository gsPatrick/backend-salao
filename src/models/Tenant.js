const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Tenant = sequelize.define('Tenant', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        name: {
            type: DataTypes.STRING(200),
            allowNull: false,
        },
        slug: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true,
        },
        plan_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'plans',
                key: 'id',
            },
        },
        owner_user_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'Set after first user is created',
        },
        phone: {
            type: DataTypes.STRING(20),
            allowNull: true,
        },
        email: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        whatsapp: {
            type: DataTypes.STRING(20),
            allowNull: true,
        },
        cnpj_cpf: {
            type: DataTypes.STRING(20),
            allowNull: true,
        },
        address: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: {},
        },
        logo_url: {
            type: DataTypes.STRING(500),
            allowNull: true,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        primary_color: {
            type: DataTypes.STRING(20),
            allowNull: true,
            defaultValue: '#000000',
        },
        checkin_message: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        terms_and_conditions: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        business_hours: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: {},
        },
        settings: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: {},
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        trial_ends_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        subscription_status: {
            type: DataTypes.ENUM('trial', 'active', 'past_due', 'canceled', 'ACTIVE', 'OVERDUE', 'CANCELED'),
            allowNull: false,
            defaultValue: 'trial',
        },
        asaas_customer_id: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        asaas_subscription_id: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        next_billing_date: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
    }, {
        tableName: 'tenants',
        timestamps: true,
    });

    Tenant.associate = (models) => {
        Tenant.belongsTo(models.Plan, {
            foreignKey: 'plan_id',
            as: 'plan',
        });
        Tenant.hasMany(models.User, {
            foreignKey: 'tenant_id',
            as: 'users',
        });
        Tenant.hasMany(models.Client, {
            foreignKey: 'tenant_id',
            as: 'clients',
        });
        Tenant.hasMany(models.Professional, {
            foreignKey: 'tenant_id',
            as: 'professionals',
        });
        Tenant.hasMany(models.Service, {
            foreignKey: 'tenant_id',
            as: 'services',
        });
        Tenant.hasMany(models.Appointment, {
            foreignKey: 'tenant_id',
            as: 'appointments',
        });
        Tenant.hasMany(models.FinancialTransaction, {
            foreignKey: 'tenant_id',
            as: 'transactions',
        });
    };

    return Tenant;
};
