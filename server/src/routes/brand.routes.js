const express = require('express');
const router = express.Router();
const { getAllBrands } = require('../controllers/brand.controller');

router.get('/', getAllBrands);

module.exports = router;
