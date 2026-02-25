const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const CommunityIdeaVote = sequelize.define('CommunityIdeaVote', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        idea_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        }
    }, {
        tableName: 'community_idea_votes',
        timestamps: true,
        underscored: true,
    });

    CommunityIdeaVote.associate = (models) => {
        CommunityIdeaVote.belongsTo(models.User, { foreignKey: 'user_id' });
        CommunityIdeaVote.belongsTo(models.CommunityIdea, { foreignKey: 'idea_id' });
    };

    return CommunityIdeaVote;
};
