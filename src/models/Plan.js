const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Plan = sequelize.define('Plan', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true,
        },
        display_name: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0,
        },
        max_professionals: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'null = unlimited',
        },
        max_clients: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'null = unlimited',
        },
        max_units: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1,
        },
        // Feature Flags
        ai_voice_response: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        priority_support: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        whatsapp_integration: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        financial_reports: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        marketing_campaigns: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
    }, {
        tableName: 'plans',
        timestamps: true,
    });

    return Plan;
};
