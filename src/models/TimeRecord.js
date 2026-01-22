const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const TimeRecord = sequelize.define('time_record', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    tenant_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    professional_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    punches: {
        type: DataTypes.JSONB, // Array of { time: 'HH:mm', type: 'in'|'out' }
        defaultValue: []
    },
    total_hours: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 0
    },
    justifications: {
        type: DataTypes.JSONB, // Array of { type: 'absence'|'overtime', reason: string, attachment: string, approved: boolean }
        defaultValue: []
    },
    status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected'),
        defaultValue: 'pending'
    }
}, {
    tableName: 'time_records',
    underscored: true
});

module.exports = TimeRecord;
