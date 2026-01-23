const stockService = require('./stock.service');

exports.listProducts = async (req, res) => {
    try {
        const products = await stockService.listProducts(req.user.tenant_id);
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getProduct = async (req, res) => {
    try {
        const product = await stockService.getProduct(req.params.id, req.user.tenant_id);
        res.json(product);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

exports.createProduct = async (req, res) => {
    try {
        const product = await stockService.createProduct(req.body, req.user.tenant_id);
        res.status(201).json(product);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateProduct = async (req, res) => {
    try {
        const product = await stockService.updateProduct(req.params.id, req.body, req.user.tenant_id);
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        const result = await stockService.deleteProduct(req.params.id, req.user.tenant_id);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.adjustStock = async (req, res) => {
    try {
        const result = await stockService.adjustStock(req.body, req.user.tenant_id, req.user.id);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
