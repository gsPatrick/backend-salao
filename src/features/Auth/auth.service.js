const jwt = require('jsonwebtoken');
const config = require('../../config');
const { User, Tenant, Plan } = require('../../models');

class AuthService {
    /**
     * Login with email and password
     */
    async login(email, password) {
        // Find user by email
        const user = await User.findOne({
            where: { email: email.toLowerCase() },
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
            throw new Error('Credenciais inválidas');
        }

        if (!user.is_active) {
            throw new Error('Usuário desativado');
        }

        // Verify password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            throw new Error('Credenciais inválidas');
        }

        // Update last login
        await user.update({ last_login_at: new Date() });

        // Generate JWT token
        const token = this.generateToken(user);

        // Prepare user response (without password)
        const userResponse = this.formatUserResponse(user);

        return {
            token,
            user: userResponse,
        };
    }

    /**
     * Register a new tenant with admin user
     */
    async register(data) {
        const { tenantName, userName, email, password, planId } = data;

        // Check if email already exists
        const existingUser = await User.findOne({
            where: { email: email.toLowerCase() },
        });

        if (existingUser) {
            throw new Error('Email já cadastrado');
        }

        // Get default plan if not specified
        let plan;
        if (planId) {
            plan = await Plan.findByPk(planId);
        } else {
            plan = await Plan.findOne({ where: { name: 'essencial' } });
        }

        if (!plan) {
            throw new Error('Plano não encontrado');
        }

        // Create tenant
        const slug = this.generateSlug(tenantName);
        const tenant = await Tenant.create({
            name: tenantName,
            slug,
            plan_id: plan.id,
            subscription_status: 'trial',
            trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
        });

        // Create admin user
        const user = await User.create({
            tenant_id: tenant.id,
            name: userName,
            email: email.toLowerCase(),
            password, // Will be hashed by hook
            role: 'admin',
            is_super_admin: false,
            is_active: true,
        });

        // Update tenant owner
        await tenant.update({ owner_user_id: user.id });

        // Reload user with relationships
        const fullUser = await User.findByPk(user.id, {
            include: [
                {
                    model: Tenant,
                    as: 'tenant',
                    include: [{ model: Plan, as: 'plan' }],
                },
            ],
        });

        // Generate token
        const token = this.generateToken(fullUser);

        return {
            token,
            user: this.formatUserResponse(fullUser),
        };
    }

    /**
     * Refresh JWT token
     */
    async refreshToken(currentUser) {
        const user = await User.findByPk(currentUser.id, {
            include: [
                {
                    model: Tenant,
                    as: 'tenant',
                    include: [{ model: Plan, as: 'plan' }],
                },
            ],
        });

        if (!user || !user.is_active) {
            throw new Error('Usuário inválido');
        }

        const token = this.generateToken(user);

        return {
            token,
            user: this.formatUserResponse(user),
        };
    }

    /**
     * Get current user profile
     */
    async getProfile(userId) {
        const user = await User.findByPk(userId, {
            include: [
                {
                    model: Tenant,
                    as: 'tenant',
                    include: [{ model: Plan, as: 'plan' }],
                },
            ],
        });

        if (!user) {
            throw new Error('Usuário não encontrado');
        }

        return this.formatUserResponse(user);
    }

    /**
     * Change password
     */
    async changePassword(userId, currentPassword, newPassword) {
        const user = await User.findByPk(userId);

        if (!user) {
            throw new Error('Usuário não encontrado');
        }

        const isPasswordValid = await user.comparePassword(currentPassword);
        if (!isPasswordValid) {
            throw new Error('Senha atual incorreta');
        }

        await user.update({ password: newPassword });

        return { message: 'Senha alterada com sucesso' };
    }

    /**
     * Generate JWT token
     */
    generateToken(user) {
        return jwt.sign(
            {
                userId: user.id,
                email: user.email,
                tenantId: user.tenant_id,
                isSuperAdmin: user.is_super_admin,
                role: user.role,
            },
            config.jwt.secret,
            { expiresIn: config.jwt.expiresIn }
        );
    }

    /**
     * Format user response (remove sensitive data)
     */
    formatUserResponse(user) {
        const userData = user.toJSON();

        return {
            id: userData.id,
            name: userData.name,
            email: userData.email,
            avatarUrl: userData.avatar_url,
            role: userData.role,
            is_super_admin: userData.is_super_admin,
            tenant_id: userData.tenant_id,
            permissions: userData.permissions,
            tenant: userData.tenant ? {
                id: userData.tenant.id,
                name: userData.tenant.name,
                slug: userData.tenant.slug,
                subscription_status: userData.tenant.subscription_status,
                plan: userData.tenant.plan ? {
                    id: userData.tenant.plan.id,
                    name: userData.tenant.plan.name,
                    display_name: userData.tenant.plan.display_name,
                    ai_voice_response: userData.tenant.plan.ai_voice_response,
                    priority_support: userData.tenant.plan.priority_support,
                    whatsapp_integration: userData.tenant.plan.whatsapp_integration,
                    financial_reports: userData.tenant.plan.financial_reports,
                    marketing_campaigns: userData.tenant.plan.marketing_campaigns,
                } : null,
            } : null,
        };
    }

    /**
     * Generate URL-friendly slug
     */
    generateSlug(name) {
        return name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove accents
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '')
            + '-' + Date.now().toString(36);
    }
}

module.exports = new AuthService();
