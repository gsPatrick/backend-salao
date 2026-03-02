const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const ProfessionalReview = sequelize.define('ProfessionalReview', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        tenant_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'tenants',
                key: 'id',
            },
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
            references: {
                model: 'professionals',
                key: 'id',
            },
        },
        client_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'clients',
                key: 'id',
            },
        },
        appointment_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
            references: {
                model: 'appointments',
                key: 'id',
            },
        },
        rating: {
            type: DataTypes.DECIMAL(2, 1),
            allowNull: false,
            validate: {
                min: 1,
                max: 5,
            },
        },
        comment: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
    }, {
        tableName: 'professional_reviews',
        timestamps: true,
    });



    return ProfessionalReview;
};
