const express = require('express');
const router = express.Router();
const { getAllCategories } = require('../controllers/category.controller');

// Route: GET /api/categories
router.get('/', getAllCategories);

module.exports = router;