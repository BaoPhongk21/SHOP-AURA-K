const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Cấu hình Multer lưu ảnh biên lai chuyển khoản của khách hàng
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(__dirname, '../uploads/receipts');
        if (!fs.existsSync(dir)){ fs.mkdirSync(dir, { recursive: true }); }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, 'receipt-' + Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
    }
});
const uploadReceipt = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max for receipts
    fileFilter: function (req, file, cb) {
        const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
        if (allowedMimes.includes(file.mimetype)) cb(null, true);
        else cb(new Error('Định dạng file không được hỗ trợ. Chỉ chấp nhận ảnh.'), false);
    }
});

// Lấy danh sách đơn hàng của User đang đăng nhập
router.get('/my-orders', verifyToken, orderController.getMyOrders);

// Lấy chi tiết một đơn hàng
router.get('/:id', verifyToken, orderController.getOrderById);

// Endpoint tạo đơn hàng (đã được bảo vệ bởi verifyToken)
// For local concurrency testing you can set SKIP_ORDER_AUTH_FOR_TEST=1 to allow
// creating orders without authentication. This must NEVER be enabled in production.
router.post('/', verifyToken, orderController.createOrder);

// Endpoint để lấy link thanh toán lại cho đơn hàng bị lỗi
router.post('/:id/retry-payment', verifyToken, orderController.retryPayment);

// === VNPAY INTEGRATION ROUTES ===
// URL VNPay sẽ gọi để báo cáo kết quả giao dịch (Instant Payment Notification)
router.get('/vnpay_ipn', orderController.vnpayIpn);
// URL người dùng sẽ được chuyển về sau khi thanh toán xong
router.get('/vnpay_return', orderController.vnpayReturn);

// Khách hàng xác nhận đã thanh toán thành công (Chuyển khoản / MoMo)
router.put('/:id/confirm-payment', verifyToken, orderController.confirmPayment);

// Khách hàng gửi ảnh biên lai chuyển khoản (Chuyển khoản / MoMo)
router.put('/:id/upload-receipt', verifyToken, uploadReceipt.single('receipt'), orderController.uploadReceipt);

// Endpoint hủy đơn hàng do người dùng yêu cầu
router.put('/:id/cancel', verifyToken, orderController.cancelOrder);

// Khách hàng xác nhận đã nhận hàng thành công
router.put('/:id/delivered', verifyToken, orderController.markOrderDelivered);

// Khách hàng báo cáo rủi ro (Chưa nhận được hàng)
router.put('/:id/risk', verifyToken, orderController.reportOrderRisk);

module.exports = router;