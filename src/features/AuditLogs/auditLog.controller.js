const auditLogService = require('../../services/auditLog.service');

class AuditLogController {
    /**
     * GET /api/audit-logs
     */
    async getLogs(req, res) {
        try {
            const { limit, offset } = req.query;
            const logs = await auditLogService.getLogs(req.tenantId, {
                limit: parseInt(limit) || 50,
                offset: parseInt(offset) || 0
            });

            res.json({
                success: true,
                data: logs
            });
        } catch (error) {
            console.error('Error fetching audit logs:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao buscar logs de auditoria'
            });
        }
    }
}

module.exports = new AuditLogController();
