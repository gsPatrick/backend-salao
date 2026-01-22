const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const AdBanner = sequelize.define('AdBanner', {
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
        image_url: {
            type: DataTypes.STRING(500),
            allowNull: false,
        },
        link_url: {
            type: DataTypes.STRING(500),
            allowNull: true,
        },
        position: {
            type: DataTypes.ENUM('dashboard_top', 'dashboard_side', 'dashboard_bottom'),
            allowNull: false,
            defaultValue: 'dashboard_top',
        },
        order: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        start_date: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        end_date: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        click_count: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
    }, {
        tableName: 'ad_banners',
        timestamps: true,
    });

    // No tenant_id - this is a global resource managed by Super Admin

    return AdBanner;
};
