const { CommunityIdea, CommunityIdeaVote, User, sequelize } = require('../../models');

class IdeaService {
    async getAll() {
        return CommunityIdea.findAll({
            include: [
                {
                    model: User,
                    as: 'author',
                    attributes: ['id', 'name', 'avatar_url']
                },
                {
                    model: CommunityIdeaVote,
                    as: 'votes',
                    attributes: ['user_id']
                }
            ],
            order: [['votes_count', 'DESC'], ['created_at', 'DESC']]
        });
    }

    async create(data, userId) {
        return CommunityIdea.create({
            user_id: userId,
            title: data.title,
            description: data.description,
            votes_count: 1 // Start with 1 vote (author)
        }).then(async (idea) => {
            // Automatically add vote from author
            await CommunityIdeaVote.create({
                user_id: userId,
                idea_id: idea.id
            });
            return idea;
        });
    }

    async delete(id, userId, isSuperAdmin) {
        const idea = await CommunityIdea.findByPk(id);
        if (!idea) throw new Error('Ideia não encontrada');

        // Permissions: Super Admin or Author
        if (!isSuperAdmin && idea.user_id !== userId) {
            throw new Error('Sem permissão para excluir esta ideia');
        }

        await idea.destroy();
        return { success: true };
    }

    async toggleVote(ideaId, userId) {
        const t = await sequelize.transaction();
        try {
            const existingVote = await CommunityIdeaVote.findOne({
                where: { idea_id: ideaId, user_id: userId },
                transaction: t
            });

            const idea = await CommunityIdea.findByPk(ideaId, { transaction: t });
            if (!idea) throw new Error('Ideia não encontrada');

            if (existingVote) {
                // Remove vote
                await existingVote.destroy({ transaction: t });
                await idea.decrement('votes_count', { by: 1, transaction: t });
                await t.commit();
                return { voted: false, votesCount: idea.votes_count - 1 };
            } else {
                // Add vote
                await CommunityIdeaVote.create({
                    user_id: userId,
                    idea_id: ideaId
                }, { transaction: t });
                await idea.increment('votes_count', { by: 1, transaction: t });
                await t.commit();
                return { voted: true, votesCount: idea.votes_count + 1 };
            }
        } catch (error) {
            await t.rollback();
            throw error;
        }
    }
}

module.exports = new IdeaService();
