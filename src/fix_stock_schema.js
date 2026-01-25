
const { sequelize } = require('./models');

async function fixStockSchema() {
    try {
        console.log('🔄 Checking Stock Schema...');
        const queryInterface = sequelize.getQueryInterface();
        const tableInfo = await queryInterface.describeTable('products');

        if (!tableInfo.is_favorite) {
            console.log('➕ Adding is_favorite column...');
            await queryInterface.addColumn('products', 'is_favorite', {
                type: require('sequelize').DataTypes.BOOLEAN,
                defaultValue: false
            });
        }

        if (!tableInfo.is_suspended) {
            console.log('➕ Adding is_suspended column...');
            await queryInterface.addColumn('products', 'is_suspended', {
                type: require('sequelize').DataTypes.BOOLEAN,
                defaultValue: false
            });
        }

        if (!tableInfo.purchase_price) {
            console.log('➕ Adding purchase_price column...');
            await queryInterface.addColumn('products', 'purchase_price', {
                type: require('sequelize').DataTypes.DECIMAL(10, 2),
                defaultValue: 0
            });
        }

        if (!tableInfo.min_stock_level) {
            console.log('➕ Adding min_stock_level column...');
            await queryInterface.addColumn('products', 'min_stock_level', {
                type: require('sequelize').DataTypes.INTEGER,
                defaultValue: 5
            });
        }

        console.log('✅ Stock Schema updated successfully!');

    } catch (error) {
        console.error('❌ Error updating Stock Schema:', error);
    } finally {
        process.exit();
    }
}

fixStockSchema();
