const superAdminService = require('./superadmin.service');

class SuperAdminController {
    // Training Videos
    async getAllVideos(req, res) {
        try {
            const videos = await superAdminService.getAllVideos();
            res.json({ success: true, data: videos });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async getVideoById(req, res) {
        try {
            const video = await superAdminService.getVideoById(req.params.id);
            res.json({ success: true, data: video });
        } catch (error) {
            res.status(404).json({ success: false, message: error.message });
        }
    }

    async createVideo(req, res) {
        try {
            const video = await superAdminService.createVideo(req.body);
            res.status(201).json({ success: true, data: video });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async updateVideo(req, res) {
        try {
            const video = await superAdminService.updateVideo(req.params.id, req.body);
            res.json({ success: true, data: video });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async deleteVideo(req, res) {
        try {
            const result = await superAdminService.deleteVideo(req.params.id);
            res.json({ success: true, message: result.message });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    // Ad Banners
    async getAllBanners(req, res) {
        try {
            const banners = await superAdminService.getAllBanners();
            res.json({ success: true, data: banners });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async getBannerById(req, res) {
        try {
            const banner = await superAdminService.getBannerById(req.params.id);
            res.json({ success: true, data: banner });
        } catch (error) {
            res.status(404).json({ success: false, message: error.message });
        }
    }

    async createBanner(req, res) {
        try {
            const banner = await superAdminService.createBanner(req.body);
            res.status(201).json({ success: true, data: banner });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async updateBanner(req, res) {
        try {
            const banner = await superAdminService.updateBanner(req.params.id, req.body);
            res.json({ success: true, data: banner });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async deleteBanner(req, res) {
        try {
            const result = await superAdminService.deleteBanner(req.params.id);
            res.json({ success: true, message: result.message });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async trackBannerClick(req, res) {
        try {
            const banner = await superAdminService.trackBannerClick(req.params.id);
            res.json({ success: true, data: banner });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
}

module.exports = new SuperAdminController();
