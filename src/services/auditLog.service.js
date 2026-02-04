const AuditLog = require('../models/AuditLog');

class AuditLogService {
    /**
     * Records an audit log entry.
     * 
     * @param {number} tenantId - The business ID.
     * @param {number} userId - The user performing the action.
     * @param {string} action - The action type (login, create, delete, etc).
     * @param {string} entity - The unit/feature affected (Product, Marketing, etc).
     * @param {number} entityId - ID of the record affected.
     * @param {string} details - Human readable description.
     * @param {object} metadata - Optional info (req object for IP/UA).
     */
    async record(tenantId, userId, action, entity, entityId, details, metadata = {}) {
        try {
            const logData = {
                tenant_id: tenantId,
                user_id: userId,
                action,
                entity,
                entity_id: entityId,
                details,
                ip_address: metadata.ip || null,
                user_agent: metadata.userAgent || null
            };

            return await AuditLog.create(logData);
        } catch (error) {
            console.error('Failed to record audit log:', error);
            // We don't throw here to avoid breaking the main operation if logging fails
            return null;
        }
    }

    /**
     * Gets logs for a specific tenant.
     */
    async getLogs(tenantId, filters = {}) {
        const { limit = 50, offset = 0 } = filters;

        return await AuditLog.findAll({
            where: { tenant_id: tenantId },
            limit,
            offset,
            order: [['created_at', 'DESC']],
            include: [
                {
                    model: require('../models/User'),
                    as: 'user',
                    attributes: ['id', 'name', 'avatar_url', 'email']
                }
            ]
        });
    }
}

module.exports = new AuditLogService();
