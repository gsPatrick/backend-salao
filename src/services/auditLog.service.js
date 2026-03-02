const { AuditLog, User } = require('../models');

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
     * @param {object} metadata - Optional info (req object for IP/UA, unitId).
     */
    async record(tenantId, userId, action, entity, entityId, details, metadata = {}) {
        try {
            // Sanitize unitId to ensure it's a valid integer or null
            let unit_id = metadata.unitId;
            if (unit_id) {
                const parsedUnitId = parseInt(unit_id);
                unit_id = isNaN(parsedUnitId) ? null : parsedUnitId;
            }

            const logData = {
                tenant_id: tenantId || null,
                unit_id: unit_id || null,
                user_id: userId || null,
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
        const limit = parseInt(filters.limit) || 50;
        const offset = parseInt(filters.offset) || 0;
        const unitId = filters.unitId;

        const where = {};
        if (tenantId) where.tenant_id = tenantId;

        if (unitId && !isNaN(parseInt(unitId))) {
            where.unit_id = parseInt(unitId);
        }

        return await AuditLog.findAll({
            where,
            limit,
            offset,
            order: [['created_at', 'DESC']],
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'avatar_url', 'email']
                }
            ]
        });
    }
}

module.exports = new AuditLogService();
