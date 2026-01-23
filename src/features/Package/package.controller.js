const { MonthlyPackage, PackageSubscription } = require('./package.model');
const { Op } = require('sequelize');

// --- Packages ---

exports.listPackages = async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const packages = await MonthlyPackage.findAll({
            where: { tenant_id: tenantId },
            order: [['created_at', 'DESC']]
        });

        const formatted = packages.map(p => ({
            id: p.id,
            name: p.name,
            price: parseFloat(p.price),
            description: p.description,
            duration: p.duration,
            isActive: p.active,
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
        const tenantId = req.user.tenant_id;
        const data = req.body;

        const pkg = await MonthlyPackage.create({
            tenant_id: tenantId,
            name: data.name,
            price: data.price,
            description: data.description,
            duration: data.duration,
            active: data.isActive !== undefined ? data.isActive : true
        });

        res.json(pkg);
    } catch (error) {
        console.error('Error creating package:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.updatePackage = async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { id } = req.params;
        const data = req.body;

        const pkg = await MonthlyPackage.findOne({ where: { id, tenant_id: tenantId } });
        if (!pkg) return res.status(404).json({ error: 'Pacote não encontrado' });

        await pkg.update({
            name: data.name,
            price: data.price,
            description: data.description,
            duration: data.duration,
            active: data.isActive
        });

        res.json(pkg);
    } catch (error) {
        console.error('Error updating package:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.deletePackage = async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { id } = req.params;
        await MonthlyPackage.destroy({ where: { id, tenant_id: tenantId } });
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting package:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.togglePackage = async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { id } = req.params;
        const pkg = await MonthlyPackage.findOne({ where: { id, tenant_id: tenantId } });
        if (!pkg) return res.status(404).json({ error: 'Pacote não encontrado' });

        await pkg.update({ active: !pkg.active });
        res.json({ active: pkg.active });
    } catch (error) {
        console.error('Error toggling package:', error);
        res.status(500).json({ error: error.message });
    }
};


// --- Subscriptions ---

exports.listSubscriptions = async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
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
        const tenantId = req.user.tenant_id;
        const data = req.body;

        const subscription = await PackageSubscription.create({
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

        res.json(subscription);
    } catch (error) {
        console.error('Error creating subscription:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.updateSubscription = async (req, res) => { // Assuming update is mostly notes or status
    try {
        const tenantId = req.user.tenant_id;
        const { id } = req.params;
        const data = req.body;

        const sub = await PackageSubscription.findOne({ where: { id, tenant_id: tenantId } });
        if (!sub) return res.status(404).json({ error: 'Assinatura não encontrada' });

        await sub.update({
            // Allow updating client info if needed, but primarily status/notes
            notes: data.notes,
            status: data.status,
            active: data.status === 'active'
        });

        res.json(sub);
    } catch (error) {
        console.error('Error updating subscription:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.deleteSubscription = async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
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
        const tenantId = req.user.tenant_id;
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
