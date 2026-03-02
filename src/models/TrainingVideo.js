const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const TrainingVideo = sequelize.define('TrainingVideo', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        title: {
            type: DataTypes.STRING(200),
            allowNull: false,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        video_url: {
            type: DataTypes.STRING(500),
            allowNull: false,
        },
        thumbnail_url: {
            type: DataTypes.STRING(500),
            allowNull: true,
        },
        duration: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'Duration in seconds',
        },
        category: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        order: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
    }, {
        tableName: 'training_videos',
        timestamps: true,
    });

    // No tenant_id - this is a global resource managed by Super Admin

    return TrainingVideo;
};
