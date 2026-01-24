const jwt = require('jsonwebtoken');
const config = require('../../config');
const { User, Tenant, Plan } = require('../../models');

/**
 * Authentication middleware
 * Verifies JWT token and attaches user, tenant_id to request
 */
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Token de acesso não fornecido',
            });
        }

        const token = authHeader.split(' ')[1];

        let decoded;
        try {
            decoded = jwt.verify(token, config.jwt.secret);
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: 'Token expirado',
                    code: 'TOKEN_EXPIRED',
                });
            }
            return res.status(401).json({
                success: false,
                message: 'Token inválido',
            });
        }

        // Fetch user with tenant and plan
        const user = await User.findByPk(decoded.userId, {
            include: [
                {
                    model: Tenant,
                    as: 'tenant',
                    include: [
                        {
                            model: Plan,
                            as: 'plan',
                        },
                    ],
                },
            ],
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Usuário não encontrado',
            });
        }

        if (!user.is_active) {
            return res.status(403).json({
                success: false,
                message: 'Usuário desativado',
            });
        }

        // Attach to request - KEY: tenant_id and user_id for all queries
        req.user = user;
        req.userId = user.id;
        req.tenantId = user.tenant_id; // null for Super Admin
        req.isSuperAdmin = user.is_super_admin;
        req.userRole = user.role;
        req.plan = user.tenant?.plan || null;

        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro interno de autenticação',
        });
    }
};

/**
 * Require Super Admin role
 */
const requireSuperAdmin = (req, res, next) => {
    if (!req.isSuperAdmin) {
        return res.status(403).json({
            success: false,
            message: 'Acesso negado. Apenas Super Admin pode acessar este recurso.',
        });
    }
    next();
};

/**
 * Require specific roles
 */
const requireRoles = (...roles) => {
    return (req, res, next) => {
        if (req.isSuperAdmin) {
            return next(); // Super Admin can access everything
        }

        console.log(`[RBAC Check] Role: ${req.userRole}, Required: ${roles.join(', ')}, isSuperAdmin: ${req.isSuperAdmin}`);
        if (!roles.includes(req.userRole)) {
            console.log(`[RBAC Denied] Role ${req.userRole} not in [${roles.join(', ')}]`);
            return res.status(403).json({
                success: false,
                message: `Acesso negado. Requer uma das seguintes funções: ${roles.join(', ')}`,
            });
        }
        next();
    };
};

/**
 * Require tenant context (blocks Super Admin from tenant-specific routes)
 */
const requireTenant = (req, res, next) => {
    if (!req.tenantId && !req.isSuperAdmin) {
        return res.status(403).json({
            success: false,
            message: 'Contexto de tenant necessário',
        });
    }
    next();
};

/**
 * Check if plan allows a specific feature
 */
const requirePlanFeature = (feature) => {
    return (req, res, next) => {
        if (req.isSuperAdmin) {
            return next(); // Super Admin has all features
        }

        if (!req.plan) {
            return res.status(403).json({
                success: false,
                message: 'Plano não encontrado',
            });
        }

        if (!req.plan[feature]) {
            return res.status(403).json({
                success: false,
                message: `Recurso "${feature}" não disponível no seu plano. Faça upgrade para acessar.`,
                code: 'PLAN_UPGRADE_REQUIRED',
                feature: feature,
                currentPlan: req.plan.display_name,
            });
        }

        next();
    };
};

// Import subscription blocker
const { checkSubscriptionStatus } = require('../../middlewares/subscription.middleware');

module.exports = {
    authenticate,
    requireSuperAdmin,
    requireRoles,
    requireTenant,
    requirePlanFeature,
    checkSubscriptionStatus, // Re-export for convenience
};
