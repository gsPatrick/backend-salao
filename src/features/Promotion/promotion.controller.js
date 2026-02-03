const { Promotion, Tenant } = require('../../models');

exports.list = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { salon_name } = req.query;

        const include = [{
            model: Tenant,
            attributes: ['id', 'name']
        }];

        const where = { tenant_id: tenantId };

        // If it's a super admin or we wanted to search all, we'd remove tenantId constraint
        // But for now let's assume if salon_name is provided, we might be searching across tenants 
        // OR the user wants to filter within their own if they have multiples (though usually one tenant per id).
        // Actually, for Super Admin dashboard, we'd need to check permissions.

        const promotions = await Promotion.findAll({
            where,
            include,
            order: [['created_at', 'DESC']]
        });

        const formatted = promotions.map(p => ({
            id: p.id,
            type: p.type,
            title: p.title,
            // Subtitle removed from response to simplify as requested
            description: p.description,
            callToAction: p.call_to_action,
            image: p.image_url,
            bannerImage: p.image_url,
            mobileImage: p.mobile_image_url,
            mobile_image_url: p.mobile_image_url,
            promotionUrl: p.link_url,
            bannerLink: p.link_url,
            targetArea: p.target_area,
            actionButton: p.action_button,
            startDate: p.start_date,
            endDate: p.end_date,
            isActive: p.active,
            clicks: p.clicks,
            createdAt: p.created_at,
            salonName: p.Tenant ? p.Tenant.name : ''
        }));


        // Frontend filtering is already done, but we can also filter here if needed
        let result = formatted;
        if (salon_name) {
            result = formatted.filter(p => p.salonName.toLowerCase().includes(salon_name.toLowerCase()));
        }

        res.json(result);
    } catch (error) {

        console.error('Error listing promotions:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.create = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const data = req.body;

        const promotion = await Promotion.create({
            tenant_id: tenantId,
            type: data.type || 'standard',
            title: data.title,
            description: data.description,
            call_to_action: data.callToAction,
            image_url: data.image || data.bannerImage,
            mobile_image_url: data.mobileImage || data.mobile_image_url,
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
        const tenantId = req.tenantId;
        const { id } = req.params;
        const data = req.body;

        const promotion = await Promotion.findOne({ where: { id, tenant_id: tenantId } });
        if (!promotion) return res.status(404).json({ error: 'Promoção não encontrada' });

        await promotion.update({
            type: data.type || promotion.type,
            title: data.title,
            description: data.description,
            call_to_action: data.callToAction,
            image_url: data.image || data.bannerImage,
            mobile_image_url: data.mobileImage || data.mobile_image_url,
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
        const tenantId = req.tenantId;
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
        const tenantId = req.tenantId;
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
