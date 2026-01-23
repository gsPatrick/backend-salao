const { AdBanner } = require('../../models');

class AdminController {
    async listBanners(req, res) {
        try {
            // Fetch active banners within date range
            const banners = await AdBanner.findAll({
                where: {
                    is_active: true
                },
                order: [['order', 'ASC']]
            });

            // Map to expected structure: title, image_url, button_text, link
            const mappedBanners = banners.map(banner => ({
                id: banner.id,
                title: banner.title,
                image_url: banner.image_url,
                button_text: 'Saiba mais', // Default logic as requested by prompt "button_text"
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
