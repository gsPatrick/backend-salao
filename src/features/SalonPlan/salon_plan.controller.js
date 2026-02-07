const SalonPlan = require('./salon_plan.model');
const { Op } = require('sequelize');

exports.list = async (req, res) => {
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
        if (!unitId) delete where[Op.or];

        const plans = await SalonPlan.findAll({
            where,
            order: [['created_at', 'DESC']]
        });
        res.json(plans.map(formatPlan));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.create = async (req, res) => {
    try {
        const data = req.body;
        const unitId = data.unit_id || data.unitId || req.headers['x-unit-id'];

        const plan = await SalonPlan.create({
            ...data,
            tenant_id: req.tenantId,
            unit_id: unitId,
            active: data.isActive !== undefined ? data.isActive : data.active !== undefined ? data.active : true,
            is_suspended: data.suspended !== undefined ? data.suspended : data.is_suspended !== undefined ? data.is_suspended : false,
            is_favorite: data.isFavorite !== undefined ? data.isFavorite : data.is_favorite !== undefined ? data.is_favorite : false,
            usage_type: data.usageType || 'Serviços'
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
        const data = req.body;
        await plan.update({
            ...data,
            active: data.isActive !== undefined ? data.isActive : data.active !== undefined ? data.active : plan.active,
            is_suspended: data.suspended !== undefined ? data.suspended : data.is_suspended !== undefined ? data.is_suspended : plan.is_suspended,
            is_favorite: data.isFavorite !== undefined ? data.isFavorite : data.is_favorite !== undefined ? data.is_favorite : plan.is_favorite,
            usage_type: data.usageType !== undefined ? data.usageType : plan.usage_type
        });
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

        const current = plan.get('is_suspended');
        plan.set('is_suspended', !current);
        await plan.save();
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

        const current = plan.get('is_favorite');
        plan.set('is_favorite', !current);
        await plan.save();
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
        isActive: p.active,
        suspended: p.is_suspended,
        isFavorite: p.is_favorite,
        usageType: p.usage_type,
        createdAt: p.created_at
    };
}
