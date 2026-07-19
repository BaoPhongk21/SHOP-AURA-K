const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Color = sequelize.define('Color', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    code: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'colors',
    timestamps: false
});

module.exports = Color;