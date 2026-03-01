const { Product, StockTransaction, Notification } = require('../../models');

class StockService {
    async listProducts(tenantId, unitId = null) {
        const where = { tenant_id: tenantId, is_active: true };
        if (unitId) {
            where.unit_id = unitId;
        }
        return Product.findAll({ where });
    }

    async getProduct(id, tenantId) {
        const product = await Product.findOne({
            where: { id, tenant_id: tenantId }
        });
        if (!product) throw new Error('Produto não encontrado');
        return product;
    }

    async createProduct(data, tenantId) {
        return Product.create({ ...data, tenant_id: tenantId, unit_id: data.unit_id });
    }

    async updateProduct(id, data, tenantId) {
        const product = await this.getProduct(id, tenantId);
        await product.update(data);
        return product;
    }

    async deleteProduct(id, tenantId) {
        const product = await this.getProduct(id, tenantId);
        await product.update({ is_active: false });
        return { message: 'Produto excluído com sucesso' };
    }

    async adjustStock(data, tenantId, userId) {
        const { productId, type, quantity, reason } = data;

        const product = await this.getProduct(productId, tenantId);
        const previousQuantity = product.stock_quantity;
        let newQuantity = previousQuantity;

        if (type === 'in') newQuantity += quantity;
        else if (type === 'out') newQuantity -= quantity;
        else if (type === 'adjustment') newQuantity = quantity;

        await product.update({ stock_quantity: newQuantity });

        const transaction = await StockTransaction.create({
            tenant_id: tenantId,
            unit_id: product.unit_id,
            product_id: productId,
            type,
            quantity,
            previous_quantity: previousQuantity,
            new_quantity: newQuantity,
            reason,
            user_id: userId
        });

        // Check for low stock alert
        this.checkLowStock(product, tenantId).catch(err => console.error('[Stock Alert Error]:', err));

        return { product, transaction };
    }

    async toggleSuspend(id, tenantId) {
        const product = await this.getProduct(id, tenantId);
        const current = product.get('is_suspended');
        product.set('is_suspended', !current);
        await product.save();
        return product;
    }

    async toggleFavorite(id, tenantId) {
        const product = await this.getProduct(id, tenantId);
        const current = product.get('is_favorite');
        product.set('is_favorite', !current);
        await product.save();
        return product;
    }

    async updateQuantity(id, change, tenantId, userId) {
        const product = await this.getProduct(id, tenantId);
        const previousQuantity = product.stock_quantity;
        const newQuantity = previousQuantity + change;

        await product.update({ stock_quantity: newQuantity });

        await StockTransaction.create({
            tenant_id: tenantId,
            unit_id: product.unit_id,
            product_id: id,
            type: change > 0 ? 'in' : 'out',
            quantity: Math.abs(change),
            previous_quantity: previousQuantity,
            new_quantity: newQuantity,
            reason: 'Ajuste rápido pelo painel de estoque',
            user_id: userId
        });

        // Check for low stock alert
        this.checkLowStock(product, tenantId).catch(err => console.error('[Stock Alert Error]:', err));

        return product;

    }

    async deleteCategory(category, tenantId) {
        return Product.update(
            { category: '' },
            { where: { category, tenant_id: tenantId } }
        );
    }
    async checkLowStock(product, tenantId) {
        if (product.stock_quantity <= product.min_stock_level) {
            const notificationService = require('../Notification/notification.service');
            const title = 'Estoque Baixo';
            const message = `Estoque baixo: ${product.name} (${product.stock_quantity} unidades restantes)`;

            // Check if already notified today to prevent duplicates
            const { Op } = require('sequelize');
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);

            const existing = await Notification.findOne({
                where: {
                    tenant_id: tenantId,
                    title,
                    message: { [Op.like]: `%${product.name}%` },
                    created_at: { [Op.gte]: todayStart }
                }
            });

            if (!existing) {
                await notificationService.notifyManagers(tenantId, product.unit_id, title, message, 'warning');
            }
        }
    }
}


module.exports = new StockService();
