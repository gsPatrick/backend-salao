const { Model, DataTypes } = require('sequelize');

class WhatsAppSession extends Model {
    static init(sequelize) {
        super.init({
            tenant_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                primaryKey: true,
                references: {
                    model: 'Tenants',
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
            sequelize,
            tableName: 'WhatsAppSessions',
            underscored: true,
        });
    }

    static associate(models) {
        this.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
    }
}

module.exports = WhatsAppSession;
