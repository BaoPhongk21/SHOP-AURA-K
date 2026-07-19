const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');
const nodemailer = require('nodemailer');

module.exports = {
    // This file is now empty as all its functions were duplicates
    // of other more specific controllers (product, order, user, etc.).
    // The routes in `admin.routes.js` are already pointing to the correct controllers.
    // This file can be safely removed from the project.
};