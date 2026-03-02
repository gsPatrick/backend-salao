const { User, ChatMessage } = require('../../models');
const { Op } = require('sequelize');

exports.getContacts = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const tenantId = req.user.tenant_id;

        // Get all users in the same tenant except current
        const users = await User.findAll({
            where: {
                tenant_id: tenantId,
                id: { [Op.ne]: currentUserId }
            },
            attributes: ['id', 'name', 'avatar_url', 'role']
        });

        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getMessages = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const tenantId = req.user.tenant_id;
        const { contactId } = req.params;

        const messages = await ChatMessage.findAll({
            where: {
                tenant_id: tenantId,
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
        const tenantId = req.user.tenant_id;
        const { contactId } = req.body;

        await ChatMessage.update({ is_read: true }, {
            where: {
                tenant_id: tenantId,
                sender_id: contactId,
                receiver_id: currentUserId,
                is_read: false
            }
        });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.sendMessage = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const tenantId = req.user.tenant_id;
        const { receiverId, text } = req.body;

        const message = await ChatMessage.create({
            tenant_id: tenantId,
            sender_id: currentUserId,
            receiver_id: receiverId,
            content: text,
            is_ai_generated: false,
            is_read: false
        });

        res.json(message);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
