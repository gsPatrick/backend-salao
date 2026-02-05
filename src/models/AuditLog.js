const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const AuditLog = sequelize.define('AuditLog', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        tenant_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        unit_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'units',
                key: 'id'
            }
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        action: {
            type: DataTypes.STRING(50),
            allowNull: false,
        },
        entity: {
            type: DataTypes.STRING(50),
            allowNull: true,
        },
        entity_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        details: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        ip_address: {
            type: DataTypes.STRING(45),
            allowNull: true,
        },
        user_agent: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        created_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
    }, {
        tableName: 'audit_logs',
        timestamps: false,
        underscored: true,
    });

    return AuditLog;
};
