const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const AcquisitionChannel = sequelize.define('acquisition_channel', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    tenant_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    unit_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'units',
            key: 'id'
        }
    },
    unit_name: {
        type: DataTypes.STRING,
        allowNull: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    duration: {
        type: DataTypes.STRING,
        defaultValue: 'Contínuo'
    },
    clients_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    suspended: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    archived: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    tableName: 'acquisition_channels',
    underscored: true
});

module.exports = AcquisitionChannel;
