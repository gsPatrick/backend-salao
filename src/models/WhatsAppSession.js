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

    WhatsAppSession.associate = (models) => {
        WhatsAppSession.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
    };

    return WhatsAppSession;
};
