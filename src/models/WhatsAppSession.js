const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const WhatsAppSession = sequelize.define('WhatsAppSession', {
        tenant_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            references: {
                model: 'tenants',
                key: 'id'
            }
        },
        unit_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            references: {
                model: 'units',
                key: 'id'
            }
        },
        key: {
            type: DataTypes.STRING,
            allowNull: false,
            primaryKey: true
        },
        value: {
            type: DataTypes.TEXT,
            allowNull: false
        }
    }, {
        tableName: 'whatsapp_sessions',
        underscored: true,
        timestamps: true
    });



    return WhatsAppSession;
};
