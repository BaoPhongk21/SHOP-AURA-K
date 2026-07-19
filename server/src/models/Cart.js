const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

const Cart = sequelize.define('Cart', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        unique: true,
        references: {
            model: User,
            key: 'id'
        }
    }
}, {
    tableName: 'carts',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

// Quan hệ với User
Cart.belongsTo(User, { foreignKey: 'user_id' });

// Quan hệ với CartItem (Để ở cuối để tránh lỗi vòng lặp require)
const CartItem = require('./CartItem');
Cart.hasMany(CartItem, { foreignKey: 'cart_id', as: 'items' });

module.exports = Cart;