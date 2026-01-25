const stockService = require('./stock.service');

exports.listProducts = async (req, res) => {
    try {
        const products = await stockService.listProducts(req.tenantId);
        res.json({ success: true, data: products });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getProduct = async (req, res) => {
    try {
        const product = await stockService.getProduct(req.params.id, req.tenantId);
        res.json({ success: true, data: product });
    } catch (error) {
        res.status(404).json({ success: false, message: error.message });
    }
};

exports.createProduct = async (req, res) => {
    try {
        const data = { ...req.body, tenant_id: req.tenantId };
        const product = await stockService.createProduct(data, req.tenantId);
        res.status(201).json({ success: true, data: product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateProduct = async (req, res) => {
    try {
        const product = await stockService.updateProduct(req.params.id, req.body, req.tenantId);
        res.json({ success: true, data: product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        const result = await stockService.deleteProduct(req.params.id, req.tenantId);
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.adjustStock = async (req, res) => {
    try {
        const result = await stockService.adjustStock(req.body, req.tenantId, req.user.id);
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.toggleSuspend = async (req, res) => {
    try {
        const product = await stockService.toggleSuspend(req.params.id, req.tenantId);
        res.json({ success: true, data: product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.toggleFavorite = async (req, res) => {
    try {
        const product = await stockService.toggleFavorite(req.params.id, req.tenantId);
        res.json({ success: true, data: product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateQuantity = async (req, res) => {
    try {
        const product = await stockService.updateQuantity(req.params.id, req.body.change, req.tenantId, req.user.id);
        res.json({ success: true, data: product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
