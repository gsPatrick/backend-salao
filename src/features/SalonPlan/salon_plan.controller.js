const { SalonPlan, SalonPlanSubscription } = require('./salon_plan.model');
const { Op } = require('sequelize');
const { Appointment } = require('../../models');

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

// --- Subscriptions ---

exports.listSubscriptions = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { clientId, unitId } = req.query;

        const where = { tenant_id: tenantId };
        if (clientId) where.client_id = clientId;
        if (unitId) where.unit_id = unitId;

        const subs = await SalonPlanSubscription.findAll({
            where,
            include: [{ model: SalonPlan, as: 'plan' }],
            order: [['created_at', 'DESC']]
        });

        res.json(subs.map(s => ({
            id: s.id,
            planId: s.plan_id,
            planName: s.plan ? s.plan.name : 'Unknown Plan',
            clientId: s.client_id,
            startDate: s.start_date,
            endDate: s.end_date,
            status: s.status,
            usedSessions: s.used_sessions,
            totalSessions: s.total_sessions
        })));
    } catch (error) {
        console.error('Error listing plan subscriptions:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.createSubscription = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const data = req.body;
        const unitId = req.headers['x-unit-id'] || data.unitId;

        const plan = await SalonPlan.findByPk(data.planId);
        if (!plan) return res.status(404).json({ error: 'Plano não encontrado' });

        const sub = await SalonPlanSubscription.create({
            tenant_id: tenantId,
            unit_id: unitId,
            plan_id: data.planId,
            client_id: data.clientId,
            start_date: data.startDate,
            end_date: data.endDate,
            status: 'active',
            total_sessions: parseInt(plan.sessions) || null
        });

        res.json(sub);
    } catch (error) {
        console.error('Error creating plan subscription:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.updateSubscription = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { id } = req.params;
        const data = req.body;

        const sub = await SalonPlanSubscription.findOne({ where: { id, tenant_id: tenantId } });
        if (!sub) return res.status(404).json({ error: 'Assinatura não encontrada' });

        await sub.update({
            status: data.status,
            end_date: data.endDate
        });

        res.json(sub);
    } catch (error) {
        console.error('Error updating plan subscription:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.deleteSubscription = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { id } = req.params;
        const { isVirtual, clientId } = req.query;

        if (isVirtual === 'true' && clientId) {
            console.log(`[Delete] Virtual Plan Subscription: planId=${id}, clientId=${clientId}`);
            await Appointment.destroy({
                where: {
                    salon_plan_id: id,
                    client_id: clientId,
                    tenant_id: tenantId
                }
            });
            return res.json({ success: true, message: 'Agendamentos do plano excluídos com sucesso' });
        }

        const sub = await SalonPlanSubscription.findOne({ where: { id, tenant_id: tenantId } });
        if (sub) {
            // Delete associated appointments
            await Appointment.destroy({
                where: {
                    salon_plan_subscription_id: id,
                    tenant_id: tenantId
                }
            });

            // Cleanup loose appointments
            if (sub.client_id && sub.plan_id) {
                await Appointment.destroy({
                    where: {
                        salon_plan_id: sub.plan_id,
                        client_id: sub.client_id,
                        tenant_id: tenantId,
                        salon_plan_subscription_id: null
                    }
                });
            }

            await sub.destroy();
        } else {
            // Fallback cleanup
            await Appointment.destroy({
                where: {
                    salon_plan_subscription_id: id,
                    tenant_id: tenantId
                }
            });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting plan subscription:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.archiveSubscription = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { id } = req.params;
        const sub = await SalonPlanSubscription.findOne({ where: { id, tenant_id: tenantId } });
        if (!sub) return res.status(404).json({ error: 'Assinatura não encontrada' });

        const newStatus = sub.status === 'archived' ? 'active' : 'archived';
        await sub.update({ status: newStatus });
        res.json({ status: newStatus });
    } catch (error) {
        console.error('Error archiving plan subscription:', error);
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
