const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const SignedContract = sequelize.define('SignedContract', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    tenant_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    plan_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    content: {
        type: DataTypes.TEXT('long'),
        allowNull: false
    },
    signature: {
        type: DataTypes.TEXT('long'),
        allowNull: true
    },
    verification_photo: {
        type: DataTypes.TEXT('long'),
        allowNull: true
    },
    signed_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('signed', 'expired', 'cancelled'),
        defaultValue: 'signed'
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'signed_contracts',
    timestamps: true,
    underscored: true
});

module.exports = SignedContract;
