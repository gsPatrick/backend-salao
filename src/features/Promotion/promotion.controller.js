const Promotion = require('./promotion.model');

exports.list = async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const promotions = await Promotion.findAll({
            where: { tenant_id: tenantId },
            order: [['created_at', 'DESC']]
        });

        // Transform to frontend format if needed, but model is close enough
        // Frontend expects: id, title, subtitle, description, callToAction, image, promotionUrl, targetArea, actionButton, startDate, endDate, isActive, clicks
        const formatted = promotions.map(p => ({
            id: p.id,
            type: p.type,
            title: p.title,
            subtitle: p.subtitle,
            description: p.description,
            callToAction: p.call_to_action,
            image: p.image_url, // standard
            bannerImage: p.image_url, // exclusive
            promotionUrl: p.link_url, // standard
            bannerLink: p.link_url, // exclusive
            targetArea: p.target_area,
            actionButton: p.action_button,
            startDate: p.start_date,
            endDate: p.end_date,
            isActive: p.active,
            clicks: p.clicks,
            createdAt: p.created_at
        }));

        res.json(formatted);
    } catch (error) {
        console.error('Error listing promotions:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.create = async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const data = req.body;

        const promotion = await Promotion.create({
            tenant_id: tenantId,
            type: data.type || 'standard',
            title: data.title,
            subtitle: data.subtitle,
            description: data.description,
            call_to_action: data.callToAction,
            image_url: data.image || data.bannerImage,
            link_url: data.promotionUrl || data.bannerLink,
            target_area: data.targetArea,
            action_button: data.actionButton,
            start_date: data.startDate,
            end_date: data.endDate,
            active: data.isActive !== undefined ? data.isActive : true
        });

        res.json(promotion);
    } catch (error) {
        console.error('Error creating promotion:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.update = async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { id } = req.params;
        const data = req.body;

        const promotion = await Promotion.findOne({ where: { id, tenant_id: tenantId } });
        if (!promotion) return res.status(404).json({ error: 'Promoção não encontrada' });

        await promotion.update({
            title: data.title,
            subtitle: data.subtitle,
            description: data.description,
            call_to_action: data.callToAction,
            image_url: data.image || data.bannerImage,
            link_url: data.promotionUrl || data.bannerLink,
            target_area: data.targetArea,
            action_button: data.actionButton,
            start_date: data.startDate,
            end_date: data.endDate,
            active: data.isActive
        });

        res.json(promotion);
    } catch (error) {
        console.error('Error updating promotion:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.delete = async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { id } = req.params;
        await Promotion.destroy({ where: { id, tenant_id: tenantId } });
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting promotion:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.toggle = async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { id } = req.params;
        const promotion = await Promotion.findOne({ where: { id, tenant_id: tenantId } });
        if (!promotion) return res.status(404).json({ error: 'Promoção não encontrada' });

        await promotion.update({ active: !promotion.active });
        res.json({ active: promotion.active });
    } catch (error) {
        console.error('Error toggling promotion:', error);
        res.status(500).json({ error: error.message });
    }
};
