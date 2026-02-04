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
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: [],
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
            type: DataTypes.STRING(2048), // Increased for safety
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
        cnpj_cpf: {
            type: DataTypes.STRING(20),
            allowNull: true,
        },
        admin_name: {
            type: DataTypes.STRING(200),
            allowNull: true,
        },
        admin_phone: {
            type: DataTypes.STRING(20),
            allowNull: true,
        },
        smtp_settings: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: {},
        },
        settings: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: {},
        },
    }, {
        tableName: 'units',
        timestamps: true,
        underscored: true,
    });



    return Unit;
};
