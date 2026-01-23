const { SupportTicket, Notification, User } = require('../../models');

class SupportService {
    async createTicket(data, userId, tenantId) {
        const { subject, department, priority, message } = data;

        const ticket = await SupportTicket.create({
            tenant_id: tenantId,
            user_id: userId,
            subject,
            department,
            priority,
            message,
            status: 'Em Aberto'
        });

        // Trigger notification for Super Admins
        try {
            const superAdmins = await User.findAll({
                where: { is_super_admin: true }
            });

            const notificationPromises = superAdmins.map(admin => {
                return Notification.create({
                    tenant_id: null, // Admin notification
                    user_id: admin.id,
                    title: 'Novo Chamado de Suporte',
                    message: `Um novo chamado foi aberto: "${subject}"`,
                    type: 'support',
                    is_read: false
                });
            });

            await Promise.all(notificationPromises);
        } catch (notifyError) {
            console.error('Error triggering support notification:', notifyError);
            // Don't fail the request if notification fails
        }

        return ticket;
    }

    async listUserTickets(userId) {
        return SupportTicket.findAll({
            where: { user_id: userId },
            order: [['created_at', 'DESC']]
        });
    }
}

module.exports = new SupportService();
