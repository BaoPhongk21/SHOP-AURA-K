const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Address = sequelize.define('Address', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.BIGINT,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Tên người nhận'
    },
    phone: {
        type: DataTypes.STRING(20),
        allowNull: false,
        comment: 'Số điện thoại người nhận'
    },
    street: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Số nhà, ngõ, tên đường'
    },
    ward: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Phường/Xã'
    },
    district: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Quận/Huyện'
    },
    city: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Tỉnh/Thành phố'
    },
    is_default: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Địa chỉ mặc định'
    }
}, {
    tableName: 'addresses',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Address;
