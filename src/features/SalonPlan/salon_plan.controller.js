const SalonPlan = require('./salon_plan.model');

exports.list = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const plans = await SalonPlan.findAll({
            where: { tenant_id: tenantId },
            order: [['created_at', 'DESC']]
        });
        res.json(plans.map(formatPlan));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.create = async (req, res) => {
    try {
        const plan = await SalonPlan.create({
            ...req.body,
            tenant_id: req.tenantId
        });
        res.status(201).json(formatPlan(plan));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.update = async (req, res) => {
    try {
        const plan = await SalonPlan.findOne({
            where: { id: req.params.id, tenant_id: req.tenantId }
        });
        if (!plan) return res.status(404).json({ error: 'Plano não encontrado' });
        await plan.update(req.body);
        res.json(formatPlan(plan));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.delete = async (req, res) => {
    try {
        const deleted = await SalonPlan.destroy({
            where: { id: req.params.id, tenant_id: req.tenantId }
        });
        if (!deleted) return res.status(404).json({ error: 'Plano não encontrado' });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.toggleSuspend = async (req, res) => {
    try {
        const plan = await SalonPlan.findOne({
            where: { id: req.params.id, tenant_id: req.tenantId }
        });
        if (!plan) return res.status(404).json({ error: 'Plano não encontrado' });
        await plan.update({ is_suspended: !plan.is_suspended });
        res.json(formatPlan(plan));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.toggleFavorite = async (req, res) => {
    try {
        const plan = await SalonPlan.findOne({
            where: { id: req.params.id, tenant_id: req.tenantId }
        });
        if (!plan) return res.status(404).json({ error: 'Plano não encontrado' });
        await plan.update({ is_favorite: !plan.is_favorite });
        res.json(formatPlan(plan));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

function formatPlan(p) {
    return {
        id: p.id,
        name: p.name,
        description: p.description,
        duration: p.duration,
        price: parseFloat(p.price),
        sessions: p.sessions,
        category: p.category,
        unit: p.unit,
        suspended: p.is_suspended,
        isFavorite: p.is_favorite,
        createdAt: p.created_at
    };
}
