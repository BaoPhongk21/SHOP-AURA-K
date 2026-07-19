// D:\Shop-quan-ao\server\src\models\ProductVariant.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ProductVariant = sequelize.define('ProductVariant', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
    },
    product_id: {
        type: DataTypes.BIGINT,
        allowNull: false
    },
    sku: {
        type: DataTypes.STRING,
        allowNull: false
    },
    price: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false
    },
    stock_quantity: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    color_id: {
        type: DataTypes.BIGINT
    },
    size_id: {
        type: DataTypes.BIGINT
    },
    location: {
        type: DataTypes.STRING,
        defaultValue: 'Khu A'
    },
    min_stock_level: {
        type: DataTypes.INTEGER,
        defaultValue: 10
    }
}, {
    tableName: 'product_variants',
    timestamps: false
});

module.exports = ProductVariant;