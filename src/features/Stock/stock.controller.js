const { Product, StockTransaction } = require('../../models');
const { Op } = require('sequelize');

exports.listProducts = async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const products = await Product.findAll({
            where: { tenant_id: tenantId, is_active: true }
        });
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenant_id;
        const product = await Product.findOne({
            where: { id, tenant_id: tenantId }
        });
        if (!product) return res.status(404).json({ message: 'Produto não encontrado' });
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createProduct = async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const product = await Product.create({ ...req.body, tenant_id: tenantId });
        res.status(201).json(product);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenant_id;
        const product = await Product.findOne({ where: { id, tenant_id: tenantId } });
        if (!product) return res.status(404).json({ message: 'Produto não encontrado' });

        await product.update(req.body);
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenant_id;
        const product = await Product.findOne({ where: { id, tenant_id: tenantId } });
        if (!product) return res.status(404).json({ message: 'Produto não encontrado' });

        await product.update({ is_active: false });
        res.json({ message: 'Produto excluído com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.adjustStock = async (req, res) => {
    try {
        const { productId, type, quantity, reason } = req.body;
        const tenantId = req.user.tenant_id;

        const product = await Product.findOne({ where: { id: productId, tenant_id: tenantId } });
        if (!product) return res.status(404).json({ message: 'Produto não encontrado' });

        const previousQuantity = product.stock_quantity;
        let newQuantity = previousQuantity;

        if (type === 'in') newQuantity += quantity;
        else if (type === 'out') newQuantity -= quantity;
        else if (type === 'adjustment') newQuantity = quantity;

        await product.update({ stock_quantity: newQuantity });

        const transaction = await StockTransaction.create({
            tenant_id: tenantId,
            product_id: productId,
            type,
            quantity,
            previous_quantity: previousQuantity,
            new_quantity: newQuantity,
            reason,
            user_id: req.user.id
        });

        res.json({ product, transaction });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
