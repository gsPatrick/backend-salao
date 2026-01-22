const { TrainingVideo, AdBanner } = require('../../models');

class SuperAdminService {
    // Training Videos
    async getAllVideos() {
        return TrainingVideo.findAll({ where: { is_active: true }, order: [['order', 'ASC']] });
    }

    async getVideoById(id) {
        const video = await TrainingVideo.findByPk(id);
        if (!video) throw new Error('Vídeo não encontrado');
        return video;
    }

    async createVideo(data) {
        return TrainingVideo.create(data);
    }

    async updateVideo(id, data) {
        const video = await TrainingVideo.findByPk(id);
        if (!video) throw new Error('Vídeo não encontrado');
        await video.update(data);
        return video;
    }

    async deleteVideo(id) {
        const video = await TrainingVideo.findByPk(id);
        if (!video) throw new Error('Vídeo não encontrado');
        await video.update({ is_active: false });
        return { message: 'Vídeo removido' };
    }

    // Ad Banners
    async getAllBanners() {
        return AdBanner.findAll({
            where: { is_active: true },
            order: [['order', 'ASC']]
        });
    }

    async getBannerById(id) {
        const banner = await AdBanner.findByPk(id);
        if (!banner) throw new Error('Banner não encontrado');
        return banner;
    }

    async createBanner(data) {
        return AdBanner.create(data);
    }

    async updateBanner(id, data) {
        const banner = await AdBanner.findByPk(id);
        if (!banner) throw new Error('Banner não encontrado');
        await banner.update(data);
        return banner;
    }

    async deleteBanner(id) {
        const banner = await AdBanner.findByPk(id);
        if (!banner) throw new Error('Banner não encontrado');
        await banner.update({ is_active: false });
        return { message: 'Banner removido' };
    }

    async trackBannerClick(id) {
        const banner = await AdBanner.findByPk(id);
        if (!banner) throw new Error('Banner não encontrado');
        await banner.increment('click_count');
        return banner;
    }
}

module.exports = new SuperAdminService();
