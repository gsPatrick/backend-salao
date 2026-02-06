const stockService = require('./stock.service');
const auditLogService = require('../../services/auditLog.service');
const { parseMonetaryValue } = require('../../utils/number');

exports.listProducts = async (req, res) => {
    try {
        const unitId = req.headers['x-unit-id'] || req.query.unitId;
        const products = await stockService.listProducts(req.tenantId, unitId);
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
        const unitId = req.headers['x-unit-id'] || req.body.unitId;

        // Sanitize numeric inputs
        const sanitizedBody = { ...req.body };
        if (sanitizedBody.sale_price) sanitizedBody.sale_price = parseMonetaryValue(sanitizedBody.sale_price);
        if (sanitizedBody.cost_price) sanitizedBody.cost_price = parseMonetaryValue(sanitizedBody.cost_price);

        const data = { ...sanitizedBody, tenant_id: req.tenantId, unit_id: unitId };
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
        // Sanitize numeric inputs
        const sanitizedBody = { ...req.body };
        if (sanitizedBody.sale_price) sanitizedBody.sale_price = parseMonetaryValue(sanitizedBody.sale_price);
        if (sanitizedBody.cost_price) sanitizedBody.cost_price = parseMonetaryValue(sanitizedBody.cost_price);

        const product = await stockService.updateProduct(req.params.id, sanitizedBody, req.tenantId);

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
