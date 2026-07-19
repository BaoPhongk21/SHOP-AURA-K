const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Order = require('./Order');
const Product = require('./Product');

const OrderItem = sequelize.define('OrderItem', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
    },
    order_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
            model: Order,
            key: 'id'
        }
    },
    product_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
            model: Product,
            key: 'id'
        }
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    unit_price: { 
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false
    },
    total_price: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false
    },
    size: {
        type: DataTypes.STRING(50),
        allowNull: true
    }
}, {
    tableName: 'order_items',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

OrderItem.belongsTo(Order, { foreignKey: 'order_id' });
OrderItem.belongsTo(Product, { foreignKey: 'product_id', as: 'Product' });

module.exports = OrderItem;