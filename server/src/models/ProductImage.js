const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ProductImage = sequelize.define('ProductImage', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
    },
    product_id: {
        type: DataTypes.BIGINT,
        allowNull: false
    },
    image_url: {
        type: DataTypes.STRING(500),
        allowNull: false
    },
    alt_text: {
        type: DataTypes.STRING(255)
    },
    sort_order: {
        type: DataTypes.INTEGER,
        defaultValue: 1
    },
    is_primary: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    tableName: 'product_images',
    timestamps: false
});

module.exports = ProductImage;