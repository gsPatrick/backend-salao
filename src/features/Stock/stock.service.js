const { Product, StockTransaction } = require('../../models');

class StockService {
    async listProducts(tenantId) {
        return Product.findAll({
            where: { tenant_id: tenantId, is_active: true }
        });
    }

    async getProduct(id, tenantId) {
        const product = await Product.findOne({
            where: { id, tenant_id: tenantId }
        });
        if (!product) throw new Error('Produto não encontrado');
        return product;
    }

    async createProduct(data, tenantId) {
        return Product.create({ ...data, tenant_id: tenantId });
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
            product_id: productId,
            type,
            quantity,
            previous_quantity: previousQuantity,
            new_quantity: newQuantity,
            reason,
            user_id: userId
        });

        return { product, transaction };
    }
}

module.exports = new StockService();
