const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database'); // Đảm bảo đường dẫn đến file cấu hình DB của bạn là chính xác

const User = sequelize.define('User', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
    },
    email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true
    },
    username: {
        type: DataTypes.STRING(100),
        unique: true
    },
    password: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    name: {
        type: DataTypes.STRING(100)
    },
    phone: {
        type: DataTypes.STRING(20)
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    role: {
        type: DataTypes.ENUM('admin', 'staff', 'customer'),
        allowNull: false,
        defaultValue: 'customer'
    },
    rank: {
        type: DataTypes.STRING(20),
        defaultValue: 'bronze'
    },
    address: {
        type: DataTypes.TEXT
    },
    ward: {
        type: DataTypes.STRING(100)
    },
    district: {
        type: DataTypes.STRING(100)
    },
    city: {
        type: DataTypes.STRING(100)
    },
    avatar: {
        type: DataTypes.STRING(255)
    }
}, {
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = User;