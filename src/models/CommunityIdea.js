const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const CommunityIdea = sequelize.define('CommunityIdea', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        title: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        votes_count: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        status: {
            type: DataTypes.ENUM('pending', 'approved', 'declined', 'implemented'),
            allowNull: false,
            defaultValue: 'pending',
        }
    }, {
        tableName: 'community_ideas',
        timestamps: true,
        underscored: true,
    });

    CommunityIdea.associate = (models) => {
        CommunityIdea.belongsTo(models.User, { foreignKey: 'user_id', as: 'author' });
        CommunityIdea.hasMany(models.CommunityIdeaVote, { foreignKey: 'idea_id', as: 'votes' });
    };

    return CommunityIdea;
};
