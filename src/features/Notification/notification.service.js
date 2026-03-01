const { Notification, User } = require('../../models');

class NotificationService {
    async create(data) {
        const { tenant_id, unit_id, user_id, title, message, type } = data;
        return await Notification.create({
            tenant_id,
            unit_id,
            user_id,
            title,
            message,
            type: type || 'info',
            is_read: false
        });
    }

    async notifyUser(userId, tenantId, unitId, title, message, type = 'info') {
        return this.create({
            user_id: userId,
            tenant_id: tenantId,
            unit_id: unitId,
            title,
            message,
            type
        });
    }

    async notifyAdmins(tenantId, unitId, title, message, type = 'info') {
        const admins = await User.findAll({
            where: {
                tenant_id: tenantId,
                role: ['admin', 'Administrador']
            }
        });

        const promises = admins.map(admin => this.notifyUser(admin.id, tenantId, unitId, title, message, type));
        return Promise.all(promises);
    }

    async notifyManagers(tenantId, unitId, title, message, type = 'info') {
        const managers = await User.findAll({
            where: {
                tenant_id: tenantId,
                role: ['admin', 'Administrador', 'gerente', 'Gerente']
            }
        });

        const promises = managers.map(manager => this.notifyUser(manager.id, tenantId, unitId, title, message, type));
        return Promise.all(promises);
    }
}

module.exports = new NotificationService();
