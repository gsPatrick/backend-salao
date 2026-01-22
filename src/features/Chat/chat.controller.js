const ChatMessage = require('./chat.model');
const { User } = require('../../models');
const { Op } = require('sequelize');

exports.getContacts = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        // Get all users except current
        const users = await User.findAll({
            where: {
                id: { [Op.ne]: currentUserId }
            },
            attributes: ['id', 'name', 'avatar_url', 'role']
        });

        // We could attach last message preview here in a real app
        // For now, just return users
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getHistory = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const { contactId } = req.params;

        const messages = await ChatMessage.findAll({
            where: {
                [Op.or]: [
                    { sender_id: currentUserId, receiver_id: contactId },
                    { sender_id: contactId, receiver_id: currentUserId }
                ]
            },
            order: [['created_at', 'ASC']]
        });

        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const { contactId } = req.body;

        await ChatMessage.update({ read: true }, {
            where: {
                sender_id: contactId,
                receiver_id: currentUserId,
                read: false
            }
        });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
