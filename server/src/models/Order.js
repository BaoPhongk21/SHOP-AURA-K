const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

const Order = sequelize.define('Order', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.BIGINT,
        allowNull: true, // Cho phép guest checkout (không cần đăng nhập)
        references: {
            model: User,
            key: 'id'
        }
    },
    customer_name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    customer_email: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    customer_phone: {
        type: DataTypes.STRING(20),
        allowNull: false
    },
    shipping_address: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    payment_method: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'cod' // Mặc định là thanh toán khi nhận hàng
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    subtotal: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false
    },
    shipping_fee: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0
    },
    discount: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0
    },
    total_amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false
    },
    status: {
        type: DataTypes.STRING(50),
        defaultValue: 'pending' // Các trạng thái: pending, processing, shipped, delivered, cancelled
    }
}, {
    tableName: 'orders',
    timestamps: true,
    underscored: true, // Tự động convert camelCase sang snake_case cho các cột mặc định
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

Order.belongsTo(User, { foreignKey: 'user_id' });

module.exports = Order;