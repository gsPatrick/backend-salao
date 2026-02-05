const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const ScheduleBlock = sequelize.define('ScheduleBlock', {
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
        professional_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        date: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        start_time: {
            type: DataTypes.TIME,
            allowNull: false,
        },
        end_time: {
            type: DataTypes.TIME,
            allowNull: false,
        },
        reason: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        unit: {
            type: DataTypes.STRING,
            allowNull: true,
        },
    }, {
        tableName: 'schedule_blocks',
        timestamps: true,
        underscored: true,
    });

    return ScheduleBlock;
};
