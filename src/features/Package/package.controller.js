const { MonthlyPackage, PackageSubscription, Service, Appointment } = require('../../models');
const { Op } = require('sequelize');
const { parseMonetaryValue } = require('../../utils/number');

// --- Packages ---

exports.listPackages = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const unitId = req.headers['x-unit-id'] || req.query.unitId;

        const where = {
            tenant_id: tenantId,
            active: true,
            is_suspended: false,
            [Op.or]: [
                { unit_id: null },
                { unit_id: unitId }
            ]
        };

        if (!unitId) {
            delete where[Op.or];
        }

        const packages = await MonthlyPackage.findAll({
            where,
            order: [['created_at', 'DESC']]
        });

        const formatted = packages.map(p => ({
            id: p.id,
            name: p.name,
            price: parseFloat(p.price),
            description: p.description,
            duration: p.duration,
            isActive: p.active,
            suspended: p.is_suspended,
            isFavorite: p.is_favorite,
            usageType: p.usage_type,
            createdAt: p.created_at,
            sessions: p.sessions,
            unit: p.unit,
            unit_id: p.unit_id,
            category: p.category
        }));

        res.json(formatted);
    } catch (error) {
        console.error('Error listing packages:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.createPackage = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const data = req.body;

        // Sanitize numeric inputs
        if (data.price) data.price = parseMonetaryValue(data.price);

        // Sanitize duration to ensure integer (prevent "teste123" error)
        let duration = 1;
        if (data.duration) {
            const parsed = parseInt(data.duration, 10);
            if (!isNaN(parsed)) duration = parsed;
        }

        const pkg = await MonthlyPackage.create({
            tenant_id: tenantId,
            unit_id: data.unit_id || data.unitId || req.headers['x-unit-id'],
            name: data.name,
            price: data.price,
            description: data.description,
            duration: duration,
            active: data.isActive !== undefined ? data.isActive : data.active !== undefined ? data.active : true,
            is_suspended: data.suspended !== undefined ? data.suspended : data.is_suspended !== undefined ? data.is_suspended : false,
            is_favorite: data.isFavorite !== undefined ? data.isFavorite : data.is_favorite !== undefined ? data.is_favorite : false,
            usage_type: data.usageType || 'Serviços',
            sessions: data.sessions || null,
            category: data.category || null,
            unit: data.unit || null
        });

        console.log('Package created:', pkg.id);
        res.json(formatPackage(pkg));
    } catch (error) {
        console.error('Error creating package:', error);
        res.status(500).json({ error: error.message });
    }
};

function formatPackage(p) {
    return {
        id: p.id,
        name: p.name,
        price: parseFloat(p.price),
        description: p.description,
        duration: p.duration,
        isActive: p.active,
        suspended: p.is_suspended,
        isFavorite: p.is_favorite,
        usageType: p.usage_type,
        createdAt: p.created_at,
        sessions: p.sessions,
        unit: p.unit,
        unit_id: p.unit_id,
        category: p.category
    };
}

exports.updatePackage = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { id } = req.params;
        const data = req.body;

        const pkg = await MonthlyPackage.findOne({ where: { id, tenant_id: tenantId } });
        if (!pkg && req.isSuperAdmin) {
            // SuperAdmin can update global packages
            const globalPkg = await MonthlyPackage.findOne({ where: { id, tenant_id: null } });
            if (globalPkg) return await updateAndSend(globalPkg, data, res);
        }
        if (!pkg) return res.status(404).json({ error: 'Pacote não encontrado' });

        return await updateAndSend(pkg, data, res);
    } catch (error) {
        console.error('Error updating package:', error);
        res.status(500).json({ error: error.message });
    }
};

async function updateAndSend(pkg, data, res) {
    let duration = pkg.duration;
    if (data.duration !== undefined) {
        const parsed = parseInt(data.duration, 10);
        if (!isNaN(parsed)) duration = parsed;
    }

    // Sanitize numeric inputs
    if (data.price) data.price = parseMonetaryValue(data.price);

    await pkg.update({
        name: data.name,
        price: data.price,
        description: data.description,
        duration: duration,
        active: data.isActive !== undefined ? data.isActive : data.active,
        is_suspended: data.suspended !== undefined ? data.suspended : data.is_suspended,
        is_favorite: data.isFavorite !== undefined ? data.isFavorite : data.is_favorite,
        usage_type: data.usageType !== undefined ? data.usageType : pkg.usage_type,
        sessions: data.sessions !== undefined ? data.sessions : pkg.sessions,
        category: data.category !== undefined ? data.category : pkg.category,
        unit: data.unit !== undefined ? data.unit : pkg.unit,
        unit_id: data.unit_id !== undefined ? data.unit_id : (data.unitId !== undefined ? data.unitId : pkg.unit_id)
    });
    return res.json(formatPackage(pkg));
}

exports.deletePackage = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { id } = req.params;
        const where = { id };
        if (!req.isSuperAdmin) {
            where.tenant_id = tenantId;
        }
        await MonthlyPackage.destroy({ where });
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting package:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.togglePackage = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { id } = req.params;
        const where = { id };
        if (!req.isSuperAdmin) {
            where.tenant_id = tenantId;
        }
        const pkg = await MonthlyPackage.findOne({ where });
        if (!pkg) return res.status(404).json({ error: 'Pacote não encontrado' });

        const current = pkg.get('is_suspended');
        pkg.set('is_suspended', !current);
        await pkg.save();
        res.json(formatPackage(pkg));
    } catch (error) {
        console.error('Error toggling package:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.toggleFavoritePackage = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { id } = req.params;
        const where = { id };
        if (!req.isSuperAdmin) {
            where.tenant_id = tenantId;
        }
        const pkg = await MonthlyPackage.findOne({ where });
        if (!pkg) return res.status(404).json({ error: 'Pacote não encontrado' });

        const current = pkg.get('is_favorite');
        pkg.set('is_favorite', !current);
        await pkg.save();
        res.json(formatPackage(pkg));
    } catch (error) {
        console.error('Error toggling favorite package:', error);
        res.status(500).json({ error: error.message });
    }
};


// --- Subscriptions ---

exports.listSubscriptions = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const unitId = req.headers['x-unit-id'] || req.query.unitId;
        const where = { tenant_id: tenantId };
        if (unitId) where.unit_id = unitId;

        const subscriptions = await PackageSubscription.findAll({
            where,
            include: [{ model: MonthlyPackage, as: 'package' }],
            order: [['created_at', 'DESC']]
        });

        const formatted = subscriptions.map(s => ({
            id: s.id,
            clientName: s.client_name,
            cnpjCpf: s.cnpj_cpf,
            address: s.client_address,
            phone: s.client_phone,
            email: s.client_email,
            responsible: s.responsible_name,
            packageId: s.package_id,
            packageName: s.package ? s.package.name : 'Pacote Removido',
            packagePrice: s.package ? parseFloat(s.package.price) : 0,
            displayDuration: s.package ? s.package.duration : 0, // or calculate from dates
            startDate: s.start_date,
            endDate: s.end_date,
            isActive: s.active,
            status: s.status,
            notes: s.notes,
            clicks: s.clicks,
            totalSessions: s.total_sessions,
            createdAt: s.created_at
        }));

        res.json(formatted);
    } catch (error) {
        console.error('Error listing subscriptions:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.createSubscription = async (req, res) => {
    try {
        // Use token tenantId (secure) or fallback to body (for Super Admin or if allowed)
        const tenantId = req.tenantId || req.body.tenantId;

        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID é obrigatório.' });
        }
        const data = req.body;

        const unitId = req.headers['x-unit-id'] || data.unitId;

        const pkg = await MonthlyPackage.findByPk(data.packageId);
        if (!pkg) {
            return res.status(404).json({ error: 'Pacote não encontrado.' });
        }

        const s = await PackageSubscription.create({
            tenant_id: tenantId,
            unit_id: unitId,
            package_id: data.packageId,
            client_id: data.clientId, // Ensure clientId is used if provided
            client_name: data.clientName,
            cnpj_cpf: data.cnpjCpf,
            client_email: data.email,
            client_phone: data.phone,
            client_address: data.address,
            responsible_name: data.responsible,
            start_date: data.startDate,
            end_date: data.endDate,
            status: 'active',
            active: true,
            notes: data.notes,
            total_sessions: parseInt(pkg.sessions) || null
        });

        // Record financial transaction for the full package value
        try {
            const financeService = require('../Finance/finance.service');
            const { Client } = require('../../models');
            let clientName = data.clientName;

            if (data.clientId && !clientName) {
                const client = await Client.findByPk(data.clientId);
                if (client) clientName = client.name;
            }

            await financeService.create({
                type: 'receita',
                category: 'Venda de Pacote',
                amount: pkg.price,
                date: new Date().toISOString().split('T')[0],
                description: `Venda de Pacote: ${pkg.name} para ${clientName || 'Cliente'}`,
                status: 'pago',
                payment_method: data.payment_method || data.paymentMethod || 'Dinheiro',
                unit_id: unitId,
                client_id: data.clientId
            }, tenantId);
        } catch (err) {
            console.error('[Finance Hook Error] Package Subscription (Direct):', err);
        }

        // Fetch again with include to match list format
        const subscription = await PackageSubscription.findByPk(s.id, {
            include: [{ model: MonthlyPackage, as: 'package' }]
        });

        res.json(formatSubscription(subscription));
    } catch (error) {
        console.error('Error creating subscription:', error);
        res.status(500).json({ error: error.message });
    }
};

function formatSubscription(s) {
    return {
        id: s.id,
        clientName: s.client_name,
        cnpjCpf: s.cnpj_cpf,
        address: s.client_address,
        phone: s.client_phone,
        email: s.client_email,
        responsible: s.responsible_name,
        packageId: s.package_id,
        packageName: s.package ? s.package.name : 'Pacote Removido',
        packagePrice: s.package ? parseFloat(s.package.price) : 0,
        displayDuration: s.package ? s.package.duration : 0,
        startDate: s.start_date,
        endDate: s.end_date,
        isActive: s.active,
        status: s.status,
        notes: s.notes,
        clicks: s.clicks,
        totalSessions: s.total_sessions,
        createdAt: s.created_at
    };
}

exports.updateSubscription = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { id } = req.params;
        const data = req.body;

        const sub = await PackageSubscription.findOne({
            where: { id, tenant_id: tenantId },
            include: [{ model: MonthlyPackage, as: 'package' }]
        });
        if (!sub) return res.status(404).json({ error: 'Assinatura não encontrada' });

        await sub.update({
            notes: data.notes,
            status: data.status,
            active: data.status === 'active',
            cnpj_cpf: data.cnpjCpf !== undefined ? data.cnpjCpf : sub.cnpj_cpf,
            client_name: data.clientName !== undefined ? data.clientName : sub.client_name,
            responsible_name: data.responsible !== undefined ? data.responsible : sub.responsible_name,
            client_phone: data.phone !== undefined ? data.phone : sub.client_phone,
            client_email: data.email !== undefined ? data.email : sub.client_email,
            client_address: data.address !== undefined ? data.address : sub.client_address
        });

        res.json(formatSubscription(sub));
    } catch (error) {
        console.error('Error updating subscription:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.deleteSubscription = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        let { id } = req.params;
        const { isVirtual, clientId } = req.query;

        // Sanitize ID: Remove virtual prefixes like 'apt-' or 'legacy-'
        if (typeof id === 'string' && (id.startsWith('apt-') || id.startsWith('legacy-'))) {
            id = id.replace(/^(apt-|legacy-)/, '');
        }

        // Virtual items come from history without a formal subscription record
        if (isVirtual === 'true' && clientId) {
            console.log(`[Delete] Virtual Package Subscription: packageId=${id}, clientId=${clientId}`);
            const apts = await Appointment.findAll({
                where: {
                    package_id: id,
                    client_id: clientId,
                    tenant_id: tenantId
                },
                attributes: ['id']
            });
            const aptIds = apts.map(a => a.id);
            if (aptIds.length > 0) {
                const { ProfessionalReview } = require('../../models');
                await ProfessionalReview.destroy({ where: { appointment_id: aptIds, tenant_id: tenantId } });
                await Appointment.destroy({ where: { id: aptIds } });
            }
            return res.json({ success: true, message: 'Agendamentos e avaliações do pacote excluídos com sucesso' });
        }

        // For real subscriptions, we delete appointments linked to this subscription ID
        // AND we attempt to delete the subscription itself
        const subscription = await PackageSubscription.findOne({ where: { id, tenant_id: tenantId } });

        if (subscription) {
            const apts = await Appointment.findAll({
                where: {
                    [Op.or]: [
                        { package_subscription_id: id },
                        {
                            package_id: subscription.package_id,
                            client_id: subscription.client_id,
                            package_subscription_id: null
                        }
                    ],
                    tenant_id: tenantId
                },
                attributes: ['id']
            });
            const aptIds = apts.map(a => a.id);
            if (aptIds.length > 0) {
                const { ProfessionalReview } = require('../../models');
                await ProfessionalReview.destroy({ where: { appointment_id: aptIds, tenant_id: tenantId } });
                await Appointment.destroy({ where: { id: aptIds } });
            }

            await subscription.destroy();
        } else {
            // If subscription not found, just try cleaning up appointments for this ID as fallback
            await Appointment.destroy({
                where: {
                    package_subscription_id: id,
                    tenant_id: tenantId
                }
            });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting subscription:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.archiveSubscription = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { id } = req.params;
        const sub = await PackageSubscription.findOne({ where: { id, tenant_id: tenantId } });
        if (!sub) return res.status(404).json({ error: 'Assinatura não encontrada' });

        const newStatus = sub.status === 'archived' ? 'active' : 'archived'; // Toggle archive
        await sub.update({
            status: newStatus,
            active: newStatus === 'active'
        });
        res.json({ status: newStatus });
    } catch (error) {
        console.error('Error archiving subscription:', error);
        res.status(500).json({ error: error.message });
    }
};
