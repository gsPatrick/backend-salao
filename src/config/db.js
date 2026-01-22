const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
    process.env.DB_NAME || 'bancodedados',
    process.env.DB_USER || 'bancodedados',
    process.env.DB_PASSWORD || 'bancodedados',
    {
        host: process.env.DB_HOST || '76.13.83.26',
        port: process.env.DB_PORT || 1414,
        dialect: 'postgres',
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        define: {
            timestamps: true,
            underscored: true,
        },
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000,
        },
    }
);

module.exports = sequelize;
