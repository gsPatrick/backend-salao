const { MonthlyPackage, PackageSubscription } = require('./package.model');
const { Op } = require('sequelize');

// --- Packages ---

exports.listPackages = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const packages = await MonthlyPackage.findAll({
            where: {
                [Op.or]: [
                    { tenant_id: tenantId },
                    { tenant_id: null }
                ]
            },
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
            createdAt: p.created_at
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

        const pkg = await MonthlyPackage.create({
            tenant_id: tenantId,
            name: data.name,
            price: data.price,
            description: data.description,
            duration: data.duration,
            active: data.isActive !== undefined ? data.isActive : data.active !== undefined ? data.active : true,
            is_suspended: data.suspended !== undefined ? data.suspended : data.is_suspended !== undefined ? data.is_suspended : false,
            is_favorite: data.isFavorite !== undefined ? data.isFavorite : data.is_favorite !== undefined ? data.is_favorite : false
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
        createdAt: p.created_at
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
    await pkg.update({
        name: data.name,
        price: data.price,
        description: data.description,
        duration: data.duration,
        active: data.isActive !== undefined ? data.isActive : data.active,
        is_suspended: data.suspended !== undefined ? data.suspended : data.is_suspended,
        is_favorite: data.isFavorite !== undefined ? data.isFavorite : data.is_favorite
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

        await pkg.update({ is_suspended: !pkg.is_suspended });
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

        await pkg.update({ is_favorite: !pkg.is_favorite });
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
        const subscriptions = await PackageSubscription.findAll({
            where: { tenant_id: tenantId },
            include: [{ model: MonthlyPackage, as: 'package' }],
            order: [['created_at', 'DESC']]
        });

        const formatted = subscriptions.map(s => ({
            id: s.id,
            clientName: s.client_name,
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

        const s = await PackageSubscription.create({
            tenant_id: tenantId,
            package_id: data.packageId,
            client_name: data.clientName,
            client_email: data.email,
            client_phone: data.phone,
            client_address: data.address,
            responsible_name: data.responsible,
            start_date: data.startDate,
            end_date: data.endDate,
            status: 'active',
            active: true,
            notes: data.notes
        });

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
            active: data.status === 'active'
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
        const { id } = req.params;
        await PackageSubscription.destroy({ where: { id, tenant_id: tenantId } });
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
