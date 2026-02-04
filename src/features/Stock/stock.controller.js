const stockService = require('./stock.service');
const auditLogService = require('../../services/auditLog.service');

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

        await auditLogService.record(
            req.tenantId,
            req.user.id,
            'cadastro',
            'Produto',
            product.id,
            `cadastrou o produto "${product.name}"`
        );

        res.status(201).json({ success: true, data: product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateProduct = async (req, res) => {
    try {
        const product = await stockService.updateProduct(req.params.id, req.body, req.tenantId);

        await auditLogService.record(
            req.tenantId,
            req.user.id,
            'edicao',
            'Produto',
            product.id,
            `editou o produto "${product.name}"`
        );

        res.json({ success: true, data: product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        const result = await stockService.deleteProduct(req.params.id, req.tenantId);

        await auditLogService.record(
            req.tenantId,
            req.user.id,
            'exclusao',
            'Produto',
            req.params.id,
            `excluiu um produto`
        );

        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.adjustStock = async (req, res) => {
    try {
        const result = await stockService.adjustStock(req.body, req.tenantId, req.user.id);

        await auditLogService.record(
            req.tenantId,
            req.user.id,
            'ajuste_estoque',
            'Produto',
            req.body.product_id,
            `ajustou o estoque do produto`
        );

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

exports.deleteCategory = async (req, res) => {
    try {
        const { category } = req.params;
        const result = await stockService.deleteCategory(category, req.tenantId);
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
