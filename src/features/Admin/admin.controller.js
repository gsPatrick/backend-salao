const { AdBanner } = require('../../models');

class AdminController {
    async listBanners(req, res) {
        try {
            const { area } = req.query;
            const where = { is_active: true };

            if (area) {
                const { Op } = require('sequelize');
                where.target_area = {
                    [Op.or]: [area, 'todos']
                };
            }

            const banners = await AdBanner.findAll({
                where,
                order: [['order', 'ASC']]
            });

            // Map to expected structure: title, subtitle, image_url, button_text, link, description
            const mappedBanners = banners.map(banner => ({
                id: banner.id,
                title: banner.title,
                subtitle: banner.subtitle || 'Destaque',
                description: banner.description,
                image_url: banner.image_url,
                button_text: banner.button_text || 'Saiba mais',
                link: banner.link_url || '#'
            }));

            res.json(mappedBanners);
        } catch (error) {
            console.error('Error listing banners:', error);
            res.status(500).json({ error: 'Erro ao buscar banners' });
        }
    }
}

module.exports = new AdminController();
