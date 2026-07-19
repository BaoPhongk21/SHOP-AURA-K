const express = require('express');
const router = express.Router();
const { getAddresses, createAddress, updateAddress, deleteAddress } = require('../controllers/address.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

// Tất cả các route đều yêu cầu đăng nhập
router.use(verifyToken);

// GET    /api/v1/addresses       - Lấy danh sách địa chỉ của user đang đăng nhập
router.get('/', getAddresses);

// POST   /api/v1/addresses       - Thêm địa chỉ mới
router.post('/', createAddress);

// PUT    /api/v1/addresses/:id   - Cập nhật địa chỉ
router.put('/:id', updateAddress);

// DELETE /api/v1/addresses/:id   - Xóa địa chỉ
router.delete('/:id', deleteAddress);

module.exports = router;
