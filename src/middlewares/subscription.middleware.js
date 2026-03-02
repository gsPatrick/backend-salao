const { Tenant } = require('../models');

/**
 * Middleware to check subscription status and block access for overdue/expired tenants.
 * 
 * EXCEPTIONS (routes that are NEVER blocked):
 * - /api/auth/* (login, logout, me, register)
 * - /api/payments/* (subscribe, webhook)
 * - /api/support/* (user needs to contact support even if blocked)
 * 
 * BLOCKED statuses: OVERDUE, CANCELED, canceled, or trial expired
 */
const checkSubscriptionStatus = async (req, res, next) => {
    try {
        // 1. SuperAdmin ALWAYS passes (Tenant 1 = Vitalício)
        if (req.isSuperAdmin) {
            return next();
        }

        // 2. No tenant context = public route, pass through
        if (!req.tenantId) {
            return next();
        }

        // 3. Route exceptions - these are NEVER blocked
        const path = req.originalUrl || req.path;
        const exceptedPaths = ['/api/auth', '/api/payments', '/api/support'];
        const isExcepted = exceptedPaths.some(prefix => path.startsWith(prefix));

        if (isExcepted) {
            return next();
        }

        // 4. Fetch tenant subscription status
        const tenant = await Tenant.findByPk(req.tenantId);
        if (!tenant) {
            return next(); // Tenant not found, let other middleware handle
        }

        // 5. Check for blocked statuses
        const blockedStatuses = ['OVERDUE', 'CANCELED', 'canceled'];
        const isStatusBlocked = blockedStatuses.includes(tenant.subscription_status);

        // 6. Check if trial has expired
        const now = new Date();
        const trialExpired = tenant.subscription_status === 'trial' &&
            tenant.trial_ends_at &&
            new Date(tenant.trial_ends_at) < now;

        // 7. Block if status is bad or trial expired
        if (isStatusBlocked || trialExpired) {
            console.log(`[Subscription Blocker] Tenant ${req.tenantId} blocked. Status: ${tenant.subscription_status}, Trial Ends: ${tenant.trial_ends_at}`);
            return res.status(402).json({
                success: false,
                code: 'SUBSCRIPTION_BLOCKED',
                message: 'Sua assinatura expirou ou está pendente. Realize o pagamento para continuar.',
                subscription_status: tenant.subscription_status,
                trial_ends_at: tenant.trial_ends_at,
                trial_expired: trialExpired
            });
        }

        // 8. All checks passed
        next();
    } catch (error) {
        console.error('[Subscription Middleware] Error:', error);
        next(); // On error, don't block (fail-open for now)
    }
};

module.exports = { checkSubscriptionStatus };
