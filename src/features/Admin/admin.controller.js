const { AdBanner } = require('../../models');

class AdminController {
    async listBanners(req, res) {
        try {
            const { area, all } = req.query;
            const where = {};

            if (!all) {
                where.is_active = true;
            }

            if (area) {
                const { Op } = require('sequelize');
                where.target_area = {
                    [Op.or]: [area, 'todos']
                };
            }

            const { Op } = require('sequelize');
            const userAddress = req.userRole === 'cliente'
                ? (req.user.address || {})
                : (req.user.tenant?.address || {});

            if (userAddress.state) {
                where.target_state = { [Op.or]: [null, '', userAddress.state] };
            } else {
                where.target_state = { [Op.or]: [null, ''] };
            }

            if (userAddress.city) {
                where.target_city = { [Op.or]: [null, '', userAddress.city] };
            } else {
                where.target_city = { [Op.or]: [null, ''] };
            }

            if (userAddress.neighborhood) {
                where.target_neighborhood = { [Op.or]: [null, '', userAddress.neighborhood] };
            } else {
                where.target_neighborhood = { [Op.or]: [null, ''] };
            }

            const banners = await AdBanner.findAll({
                where,
                order: [['order', 'ASC']]
            });

            const mappedBanners = banners.map(banner => ({
                id: banner.id,
                title: banner.title,
                subtitle: banner.subtitle || 'Destaque',
                description: banner.description,
                image_url: banner.image_url,
                mobile_image_url: banner.mobile_image_url,
                button_text: banner.button_text || 'Saiba mais',
                link: banner.link_url || '#',
                call_to_action: banner.call_to_action,
                target_area: banner.target_area,
                target_state: banner.target_state,
                target_city: banner.target_city,
                target_neighborhood: banner.target_neighborhood,
                is_active: banner.is_active,
                click_count: banner.click_count
            }));

            res.json(mappedBanners);
        } catch (error) {
            console.error('Error listing banners:', error);
            res.status(500).json({ error: 'Erro ao buscar banners' });
        }
    }

    async createBanner(req, res) {
        try {
            const data = req.body;
            const banner = await AdBanner.create({
                title: data.title,
                subtitle: data.subtitle,
                description: data.description,
                call_to_action: data.call_to_action,
                image_url: data.image_url,
                mobile_image_url: data.mobile_image_url,
                link_url: data.link_url || data.link,
                button_text: data.button_text,
                target_area: data.target_area || 'todos',
                target_state: data.target_state || null,
                target_city: data.target_city || null,
                target_neighborhood: data.target_neighborhood || null,
                is_active: data.is_active !== undefined ? data.is_active : true,
                order: data.order || 0
            });
            res.json(banner);
        } catch (error) {
            console.error('Error creating banner:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async updateBanner(req, res) {
        try {
            const { id } = req.params;
            const data = req.body;
            const banner = await AdBanner.findByPk(id);
            if (!banner) return res.status(404).json({ error: 'Banner não encontrado' });

            await banner.update({
                title: data.title,
                subtitle: data.subtitle,
                description: data.description,
                call_to_action: data.call_to_action,
                image_url: data.image_url,
                mobile_image_url: data.mobile_image_url,
                link_url: data.link_url || data.link,
                button_text: data.button_text,
                target_area: data.target_area,
                target_state: data.target_state || null,
                target_city: data.target_city || null,
                target_neighborhood: data.target_neighborhood || null,
                is_active: data.is_active,
                order: data.order
            });
            res.json(banner);
        } catch (error) {
            console.error('Error updating banner:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async deleteBanner(req, res) {
        try {
            const { id } = req.params;
            await AdBanner.destroy({ where: { id } });
            res.json({ success: true });
        } catch (error) {
            console.error('Error deleting banner:', error);
            res.status(500).json({ error: error.message });
        }
    }

}

module.exports = new AdminController();
