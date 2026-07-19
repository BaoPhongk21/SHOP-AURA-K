const express = require('express');
const router = express.Router();
const { subscribeNewsletter } = require('../controllers/newsletter.controller');
const settingController = require('../controllers/setting.controller');

// Endpoint: GET /api/v1/settings (Lấy cấu hình hệ thống public: tên shop, logo, các phương thức thanh toán...)
router.get('/', settingController.getSettings);

// Endpoint: GET /api/v1/settings/public-flash-sale (Lấy trạng thái flash sale public)
router.get('/public-flash-sale', settingController.getPublicFlashSale);

// Endpoint: POST /api/v1/settings/newsletter
router.post('/newsletter', subscribeNewsletter);

module.exports = router;