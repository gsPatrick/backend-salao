const { Notification } = require('../../models');

class NotificationController {
    async list(req, res) {
        try {
            const { id: user_id, tenant_id } = req.user;
            const unitId = req.headers['x-unit-id'] || req.query.unitId;

            const where = {
                user_id,
                tenant_id,
                is_read: false
            };
            if (unitId) where.unit_id = unitId;

            const notifications = await Notification.findAll({
                where,
                order: [['created_at', 'DESC']]
            });

            res.json(notifications);
        } catch (error) {
            console.error('Error listing notifications:', error);
            res.status(500).json({ error: 'Erro ao buscar notificações' });
        }
    }

    async markAsRead(req, res) {
        try {
            const { id } = req.params;
            const { id: user_id, tenant_id } = req.user;

            const notification = await Notification.findOne({
                where: { id, user_id, tenant_id }
            });

            if (!notification) {
                return res.status(404).json({ error: 'Notificação não encontrada' });
            }

            await notification.update({ is_read: true });

            res.json({ success: true });
        } catch (error) {
            console.error('Error marking notification as read:', error);
            res.status(500).json({ error: 'Erro ao atualizar notificação' });
        }
    }
}

module.exports = new NotificationController();
