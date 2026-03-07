const jwt = require('jsonwebtoken');
const config = require('../../config');
const { User, Tenant, Plan, Unit, Client, PackageSubscription, SalonPlanSubscription, MonthlyPackage, SalonPlan } = require('../../models');

class AuthService {
    /**
     * Login with email and password
     */
    async login(email, password) {
        const sanitizedEmail = email.trim().toLowerCase();
        // Find user by email
        const user = await User.findOne({
            where: { email: sanitizedEmail },
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
            // Try to find in Client table
            const client = await this.getClientByEmail(sanitizedEmail);

            if (client) {
                if (!client.is_active) {
                    throw new Error('Cliente desativado');
                }

                // Simple password check (assuming plaintext '123' legacy or simple match)
                // In production, this should also use bcrypt or similar if needed.
                if (client.password !== password) {
                    throw new Error('Credenciais inválidas');
                }

                const token = this.generateToken({
                    id: client.id,
                    email: client.email,
                    tenant_id: client.tenant_id,
                    is_super_admin: false,
                    role: 'cliente'
                });

                return {
                    token,
                    user: await this.formatClientResponse(client)
                };
            }

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

        const token = this.generateToken(user);

        // Prepare user response (without password)
        const userResponse = this.formatUserResponse(user);

        return {
            token,
            user: userResponse,
        };
    }

    async getClientByEmail(email) {
        const sanitizedEmail = email.trim().toLowerCase();
        // Check both email and login_email fields
        return Client.findOne({
            where: {
                [require('sequelize').Op.or]: [
                    { email: sanitizedEmail },
                    { login_email: sanitizedEmail }
                ]
            },
            order: [['is_active', 'DESC']],
            include: [
                {
                    model: Tenant,
                    as: 'tenant',
                    include: [{ model: Plan, as: 'plan' }]
                },
                {
                    model: PackageSubscription,
                    as: 'subscriptions',
                    include: [{ model: MonthlyPackage, as: 'package', attributes: ['id', 'name', 'sessions'] }]
                },
                {
                    model: SalonPlanSubscription,
                    as: 'plan_subscriptions',
                    include: [{ model: SalonPlan, as: 'plan', attributes: ['id', 'name', 'sessions'] }]
                }
            ],
        });
    }

    /**
     * Register client by CPF (sync with existing pre-registered client)
     * Only allows registration if CPF already exists in the system
     */
    async clientRegisterByCpf(data) {
        const { cpf, loginEmail, password } = data;

        if (!cpf || !loginEmail || !password) {
            throw new Error('CPF, email e senha são obrigatórios');
        }

        const sanitizedCpf = cpf.replace(/\D/g, '');
        const sanitizedEmail = loginEmail.trim().toLowerCase();

        // Check if login_email is already in use
        const emailInUse = await Client.findOne({
            where: {
                login_email: sanitizedEmail,
                cpf: { [require('sequelize').Op.ne]: sanitizedCpf }
            }
        });

        if (emailInUse) {
            throw new Error('Este email já está em uso por outro cliente');
        }

        // Find client by CPF
        const client = await Client.findOne({
            where: { cpf: sanitizedCpf },
            include: [{ model: Tenant, as: 'tenant', include: [{ model: Plan, as: 'plan' }] }],
        });

        if (!client) {
            throw new Error('CPF não encontrado. Você precisa estar cadastrado em um de nossos salões para criar sua conta.');
        }

        if (!client.is_active) {
            throw new Error('Cliente desativado');
        }

        // Check if client already has login credentials
        if (client.login_email && client.password !== '123') {
            throw new Error('Este CPF já possui uma conta. Por favor, faça login com seu email.');
        }

        // Update client with login credentials
        await client.update({
            login_email: sanitizedEmail,
            password: password
        });

        // Reload client with relationships
        const fullClient = await Client.findByPk(client.id, {
            include: [
                {
                    model: Tenant,
                    as: 'tenant',
                    include: [{ model: Plan, as: 'plan' }]
                },
                {
                    model: PackageSubscription,
                    as: 'subscriptions',
                    include: [{ model: MonthlyPackage, as: 'package', attributes: ['id', 'name', 'sessions'] }]
                },
                {
                    model: SalonPlanSubscription,
                    as: 'plan_subscriptions',
                    include: [{ model: SalonPlan, as: 'plan', attributes: ['id', 'name', 'sessions'] }]
                }
            ],
        });

        // Generate token
        const token = this.generateToken({
            id: client.id,
            email: sanitizedEmail,
            tenant_id: client.tenant_id,
            is_super_admin: false,
            role: 'cliente'
        });

        return {
            token,
            user: await this.formatClientResponse(fullClient),
            linkedClient: {
                name: client.name,
                unit_id: client.unit_id,
                tenant_id: client.tenant_id
            }
        };
    }

    /**
     * Check if CPF exists in the system
     */
    async checkCpfExists(cpf) {
        const sanitizedCpf = cpf.replace(/\D/g, '');
        const client = await Client.findOne({
            where: { cpf: sanitizedCpf },
            include: [{ model: Tenant, as: 'tenant' }],
        });

        if (!client) {
            return { exists: false };
        }

        return {
            exists: true,
            clientName: client.name,
            hasLoginCredentials: !!(client.login_email && client.password !== '123'),
            tenantName: client.tenant?.name
        };
    }

    /**
     * Check if email exists in the system (User or Client)
     */
    async checkEmailExists(email) {
        const sanitizedEmail = email.trim().toLowerCase();
        
        const user = await User.findOne({ where: { email: sanitizedEmail } });
        if (user) return { exists: true };

        const client = await Client.findOne({
            where: {
                [require('sequelize').Op.or]: [
                    { email: sanitizedEmail },
                    { login_email: sanitizedEmail }
                ]
            }
        });

        return { exists: !!client };
    }

    /**
     * Format client response (similar to user)
     */
    async formatClientResponse(client) {
        const clientData = client.toJSON();
        const { Appointment } = require('../../models');
        const { Op } = require('sequelize');
        
        // Merge JSONB packages with associated subscriptions
        const jsonPackages = Array.isArray(clientData.packages) ? clientData.packages : [];
        
        const mappedPackages = [
            ...jsonPackages.map(pkg => ({
                id: pkg.id,
                name: pkg.name || 'Pacote/Plano',
                package_id: pkg.package_id,
                plan_id: pkg.plan_id,
                type: pkg.type || 'package'
            })),
            ...(clientData.subscriptions || []).map(s => ({
                id: s.id,
                name: s.package?.name || 'Pacote',
                package_id: s.package_id,
                type: 'package'
            })),
            ...(clientData.plan_subscriptions || []).map(s => ({
                id: s.id,
                name: s.plan?.name || 'Plano',
                plan_id: s.plan_id,
                type: 'plan'
            }))
        ];

        // Deduplicate by name + type
        const uniqueTemplates = [];
        const seenNames = new Set();
        for (const pkg of mappedPackages) {
            const key = `${pkg.name}-${pkg.type}`;
            if (!seenNames.has(key)) {
                uniqueTemplates.push(pkg);
                seenNames.add(key);
            }
        }

        // DYNAMISM: Tally sessions from Appointment table to match Admin Panel
        const finalPackages = await Promise.all(uniqueTemplates.map(async (tpl) => {
            const where = {
                client_id: clientData.id,
                tenant_id: clientData.tenant_id,
                status: { [Op.notIn]: ['cancelado', 'faltou'] }
            };

            let total = 0;
            if (tpl.type === 'package') {
                where.package_id = tpl.package_id;
                const pkgDef = await MonthlyPackage.findByPk(tpl.package_id);
                total = pkgDef ? parseInt(pkgDef.sessions) || 0 : 0;
            } else {
                where.salon_plan_id = tpl.plan_id;
                const planDef = await SalonPlan.findByPk(tpl.plan_id);
                total = planDef ? parseInt(planDef.sessions) || 0 : 0;
            }

            const count = await Appointment.count({ where });

            return {
                name: tpl.name,
                completedSessions: count,
                totalSessions: total,
                type: tpl.type
            };
        }));

        console.log(`[DEBUG-AUTH] Formatting client ${clientData.id}. Dynamic Packages:`, finalPackages.length);

        return {
            id: clientData.id,
            name: clientData.name,
            email: clientData.email,
            avatarUrl: clientData.photo_url || `https://i.pravatar.cc/150?u=${clientData.email}`,
            role: 'cliente',
            is_super_admin: false,
            tenant_id: clientData.tenant_id,
            permissions: {},
            tenant: clientData.tenant ? {
                id: clientData.tenant.id,
                name: clientData.tenant.name,
                slug: clientData.tenant.slug,
                subscription_status: clientData.tenant.subscription_status,
                address: clientData.tenant.address,
                plan: clientData.tenant.plan ? {
                    id: clientData.tenant.plan.id,
                    name: clientData.tenant.plan.name,
                    display_name: clientData.tenant.plan.display_name,
                    ai_voice_response: clientData.tenant.plan.ai_voice_response,
                    priority_support: clientData.tenant.plan.priority_support,
                    whatsapp_integration: clientData.tenant.plan.whatsapp_integration,
                    financial_reports: clientData.tenant.plan.financial_reports,
                    marketing_campaigns: clientData.tenant.plan.marketing_campaigns,
                } : null,
            } : null,
            packages: finalPackages
        };
    }

    /**
     * Register a new tenant with admin user or a new client
     */
    async register(data) {
        const { tenantName, userName, email, password, planId, userType, tenantId, phone, adminPhone, cnpj_cpf, segmentType } = data;

        if (userType === 'client') {
            const sanitizedEmail = email.trim().toLowerCase();
            // Check if email already exists in User or Client table
            const existingUser = await User.findOne({ where: { email: sanitizedEmail } });
            const existingClient = await Client.findOne({ where: { email: sanitizedEmail, is_active: true } });

            if (existingUser || existingClient) {
                throw new Error('Email já cadastrado');
            }

            let targetTenantId = tenantId;
            if (!targetTenantId) {
                // For client registration, we need a tenant. 
                // In a multi-tenant setup, this should come from the current context/slug.
                // Fallback to the first tenant for now if not provided (e.g. testing)
                const defaultTenant = await Tenant.findOne();
                if (defaultTenant) {
                    targetTenantId = defaultTenant.id;
                } else {
                    throw new Error('Nenhum salão disponível para cadastro');
                }
            }

            const client = await Client.create({
                name: userName,
                email: sanitizedEmail,
                phone,
                password, // Note: Existing logic uses plaintext passwords for clients in this POC, 
                // but should use hashing in production.
                tenant_id: targetTenantId,
                is_active: true
            });

            // Reload client with relationships
            const fullClient = await Client.findByPk(client.id, {
                include: [
                    {
                        model: Tenant,
                        as: 'tenant',
                        include: [{ model: Plan, as: 'plan' }]
                    },
                    {
                        model: PackageSubscription,
                        as: 'subscriptions',
                        include: [{ model: MonthlyPackage, as: 'package', attributes: ['id', 'name', 'sessions'] }]
                    },
                    {
                        model: SalonPlanSubscription,
                        as: 'plan_subscriptions',
                        include: [{ model: SalonPlan, as: 'plan', attributes: ['id', 'name', 'sessions'] }]
                    }
                ],
            });

            // Generate token
            const token = this.generateToken({
                id: client.id,
                email: client.email,
                tenant_id: client.tenant_id,
                is_super_admin: false,
                role: 'cliente'
            });

            return {
                token,
                user: this.formatClientResponse(fullClient),
            };
        }

        // --- Original Salon Registration Logic ---
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
            plan = await Plan.findOne({ where: { name: 'Empresa Essencial' } });
        }

        if (!plan) {
            throw new Error('Plano não encontrado');
        }

        // Create tenant
        const slug = this.generateSlug(tenantName);
        
        const tenant = await Tenant.create({
            name: tenantName,
            slug,
            cnpj_cpf,
            logo_url: '/sa-sq.png',
            settings: { segment: segmentType },
            plan_id: plan.id,
            subscription_status: 'trial',
            trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
        });

        // Create admin user
        const user = await User.create({
            tenant_id: tenant.id,
            name: userName,
            email: email.toLowerCase(),
            phone: adminPhone ? adminPhone.replace(/\D/g, '') : null,
            password, // Will be hashed by hook
            role: 'admin',
            is_super_admin: false,
            is_active: true,
        });

        // Update tenant owner
        await tenant.update({ owner_user_id: user.id });

        // Create default unit (Unidade Matriz)
        await Unit.create({
            tenant_id: tenant.id,
            name: 'Unidade Matriz',
            is_suspended: false,
            address: {},
            working_hours: [
                { day: 'Segunda-feira', open: true, start: '08:00', end: '18:00', lunch_start: '12:00', lunch_end: '13:00' },
                { day: 'Terça-feira', open: true, start: '08:00', end: '18:00', lunch_start: '12:00', lunch_end: '13:00' },
                { day: 'Quarta-feira', open: true, start: '08:00', end: '18:00', lunch_start: '12:00', lunch_end: '13:00' },
                { day: 'Quinta-feira', open: true, start: '08:00', end: '18:00', lunch_start: '12:00', lunch_end: '13:00' },
                { day: 'Sexta-feira', open: true, start: '08:00', end: '18:00', lunch_start: '12:00', lunch_end: '13:00' },
                { day: 'Sábado', open: true, start: '08:00', end: '14:00', lunch_start: '12:00', lunch_end: '13:00' },
                { day: 'Domingo', open: false, start: '08:00', end: '18:00', lunch_start: '12:00', lunch_end: '13:00' },
            ],
            checkin_message: 'Seja bem-vindo ao @' + tenantName + '! Seu atendimento começará em breve.'
        });

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
        if (currentUser.role === 'cliente') {
            const client = await Client.findByPk(currentUser.id, {
                include: [
                    {
                        model: Tenant,
                        as: 'tenant',
                        include: [{ model: Plan, as: 'plan' }]
                    },
                    {
                        model: PackageSubscription,
                        as: 'subscriptions',
                        include: [{ model: MonthlyPackage, as: 'package', attributes: ['id', 'name', 'sessions'] }]
                    },
                    {
                        model: SalonPlanSubscription,
                        as: 'plan_subscriptions',
                        include: [{ model: SalonPlan, as: 'plan', attributes: ['id', 'name', 'sessions'] }]
                    }
                ],
            });

            if (!client || !client.is_active) {
                throw new Error('Cliente inválido');
            }

            const token = this.generateToken({
                id: client.id,
                email: client.email,
                tenant_id: client.tenant_id,
                is_super_admin: false,
                role: 'cliente'
            });

            return {
                token,
                user: await this.formatClientResponse(client),
            };
        }

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
    async getProfile(userId, role) {
        if (role === 'cliente') {
            const client = await Client.findByPk(userId, {
                include: [
                    {
                        model: Tenant,
                        as: 'tenant',
                        include: [{ model: Plan, as: 'plan' }]
                    },
                    {
                        model: PackageSubscription,
                        as: 'subscriptions',
                        include: [{ model: MonthlyPackage, as: 'package', attributes: ['id', 'name', 'sessions'] }]
                    },
                    {
                        model: SalonPlanSubscription,
                        as: 'plan_subscriptions',
                        include: [{ model: SalonPlan, as: 'plan', attributes: ['id', 'name', 'sessions'] }]
                    }
                ],
            });

            if (!client) {
                throw new Error('Cliente não encontrado');
            }

            return await this.formatClientResponse(client);
        }

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
                address: userData.tenant.address, // Include address for geolocation
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

    /**
     * Forgot Password
     */
    async forgotPassword(email) {
        const sanitizedEmail = email.trim().toLowerCase();
        
        // 1. Check in User table (Colaborators)
        const user = await User.findOne({ where: { email: sanitizedEmail } });
        if (user) {
            // Generate temporary 6 digit password
            const tempPassword = Math.floor(100000 + Math.random() * 900000).toString();
            
            // Update user password (presumed hook will hash it)
            await user.update({ password: tempPassword });
            
            // Call email service
            const emailService = require('../../services/email.service');
            await emailService.sendPasswordRecoveryEmail(user, tempPassword);
            
            return {
                success: true,
                message: 'Um link com a nova senha temporária foi enviado para o seu e-mail.'
            };
        }

        // 2. Check in Client table
        const client = await this.getClientByEmail(sanitizedEmail);
        if (client) {
            // Client passwords are plain text in current database architecture
            const currentPassword = client.password;

            if (!currentPassword) {
                 throw new Error('Nenhuma senha encontrada para este usuário. Entre em contato com o suporte.');
            }

            // Call email service
            const emailService = require('../../services/email.service');
            await emailService.sendPasswordRecoveryEmail(client, currentPassword);

            return {
                success: true,
                message: 'Sua senha foi enviada para o e-mail cadastrado.'
            };
        }

        // If not found in either
        throw new Error('O e-mail informado não foi encontrado.');
    }
}

module.exports = new AuthService();
