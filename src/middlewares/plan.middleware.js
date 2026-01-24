const { Tenant, Plan } = require('../models');

/**
 * Middleware to check if the tenant's plan has a specific feature enabled
 * @param {string} feature - The feature name (e.g., 'ai_voice_response', 'marketing_campaigns')
 */
const requirePlanFeature = (feature) => {
    return async (req, res, next) => {
        try {
            if (req.isSuperAdmin) return next(); // Super Admin has all features

            const tenant = await Tenant.findByPk(req.tenantId, {
                include: [{ model: Plan, as: 'plan' }]
            });

            if (!tenant || !tenant.plan) {
                return res.status(403).json({
                    success: false,
                    message: 'Plano não encontrado para este estabelecimento'
                });
            }

            // Check if plan is active and not overdue
            if (tenant.subscription_status === 'OVERDUE') {
                return res.status(402).json({
                    success: false,
                    message: 'Assinatura pendente. Por favor, regularize seu pagamento para acessar esta função.',
                    code: 'PAYMENT_OVERDUE'
                });
            }

            // Check feature flag
            if (!tenant.plan[feature]) {
                return res.status(403).json({
                    success: false,
                    message: `O seu plano atual não inclui a funcionalidade: ${feature}`,
                    code: 'UPGRADE_REQUIRED'
                });
            }

            next();
        } catch (error) {
            console.error('[Plan Middleware] Error:', error);
            res.status(500).json({ success: false, message: 'Erro ao verificar permissões do plano' });
        }
    };
};

module.exports = { requirePlanFeature };
