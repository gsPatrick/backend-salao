const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const SupportTicket = sequelize.define('SupportTicket', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        tenant_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        subject: {
            type: DataTypes.STRING(200),
            allowNull: false,
        },
        department: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        priority: {
            type: DataTypes.ENUM('Baixa', 'Média', 'Alta'),
            allowNull: false,
            defaultValue: 'Média',
        },
        message: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        status: {
            type: DataTypes.ENUM('Em Aberto', 'Resolvido'),
            allowNull: false,
            defaultValue: 'Em Aberto',
        }
    }, {
        tableName: 'support_tickets',
        timestamps: true,
        underscored: true,
    });

    return SupportTicket;
};
