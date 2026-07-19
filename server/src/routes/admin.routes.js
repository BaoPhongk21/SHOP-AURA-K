const express = require('express');
const router = express.Router();

// Import các Controller đã được chia nhỏ
const dashboardController = require('../controllers/dashboard.controller');
const productController = require('../controllers/product.controller');
const orderController = require('../controllers/order.controller');
const userController = require('../controllers/user.controller');
const voucherController = require('../controllers/voucher.controller');
const settingController = require('../controllers/setting.controller');
const contactController = require('../controllers/contact.controller');
const bannerController = require('../controllers/banner.controller');

const { verifyToken, restrictTo, requirePermission } = require('../middlewares/auth.middleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// =================================================================
// BẢN VÁ: PUBLIC THƯ MỤC UPLOADS ĐỂ HIỂN THỊ HÌNH ẢNH
router.use('/uploads', express.static(path.join(__dirname, '../uploads')));
// =================================================================

// Cấu hình Multer để lưu ảnh vào thư mục uploads/products
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(__dirname, '../uploads/products');
        if (!fs.existsSync(dir)) { fs.mkdirSync(dir, { recursive: true }); }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
    }
});
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max cho ảnh sản phẩm
    fileFilter: function (req, file, cb) {
        // Chỉ cho phép ảnh cho upload sản phẩm
        const allowedImageMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
        if (allowedImageMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Định dạng file không được hỗ trợ. Chỉ chấp nhận ảnh.'), false);
        }
    }
});

// Cấu hình Multer riêng để lưu ảnh/video Cấu hình (Logo, Banner)
const settingsStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(__dirname, '../uploads/settings');
        if (!fs.existsSync(dir)) { fs.mkdirSync(dir, { recursive: true }); }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        // Đặt tên file có tiền tố là tên trường (logo hoặc banner) để dễ nhận biết
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});
const uploadSettings = multer({
    storage: settingsStorage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max (để hỗ trợ video)
    fileFilter: function (req, file, cb) {
        // Cho phép ảnh và video
        const allowedMimes = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
            'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'
        ];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Định dạng file không được hỗ trợ. Chỉ chấp nhận ảnh và video.'), false);
        }
    }
});

// Cấu hình Multer riêng để lưu file đính kèm từ Form Liên hệ
const contactStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(__dirname, '../uploads/contacts');
        if (!fs.existsSync(dir)) { fs.mkdirSync(dir, { recursive: true }); }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, 'contact-' + Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
    }
});
const uploadContact = multer({ 
    storage: contactStorage,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max per file
    fileFilter: function (req, file, cb) {
        const allowedMimes = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
            'video/mp4', 'video/webm'
        ];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Định dạng file không được hỗ trợ. Chỉ chấp nhận ảnh và video.'), false);
        }
    }
});

// Đường dẫn: GET /api/v1/admin/dashboard
// Được bảo vệ bằng 2 lớp: Phải có Token đăng nhập (verifyToken) và phải là Admin (isAdmin)
router.get('/dashboard', verifyToken, requirePermission('reports'), dashboardController.getDashboardStats);

// Đường dẫn: GET /api/v1/admin/products (Lấy danh sách sản phẩm cho Admin)
router.get('/products', verifyToken, requirePermission('products'), productController.getAdminProducts);

// Các route quản lý Danh mục (Categories)
const categoryController = require('../controllers/category.controller');
router.get('/categories', verifyToken, restrictTo('admin', 'staff'), categoryController.getAllCategories);
router.post('/categories', verifyToken, restrictTo('admin'), categoryController.createCategory);
router.put('/categories/:id', verifyToken, restrictTo('admin'), categoryController.updateCategory);
router.delete('/categories/:id', verifyToken, restrictTo('admin'), categoryController.deleteCategory);

// Các route Thêm, Sửa, Xóa sản phẩm
router.post('/products', verifyToken, restrictTo('admin'), upload.single('image'), productController.createProduct);
router.put('/products/:id', verifyToken, restrictTo('admin'), upload.single('image'), productController.updateProduct);
router.delete('/products/:id', verifyToken, restrictTo('admin'), productController.deleteProduct);

// Route Nhập kho hàng loạt từ file
router.post('/products/import-bulk', verifyToken, restrictTo('admin'), upload.single('file'), productController.importProductsBulk);

// Route quản lý Kho hàng (Inventory)
router.get('/inventory/locations', verifyToken, requirePermission('inventory'), productController.getWarehouseLocations);
router.post('/inventory/locations', verifyToken, restrictTo('admin'), productController.createLocation);
router.put('/inventory/locations/:id', verifyToken, restrictTo('admin'), productController.updateLocation);
router.delete('/inventory/locations/:id', verifyToken, restrictTo('admin'), productController.deleteLocation);
router.put('/inventory/stock', verifyToken, restrictTo('admin'), productController.updateInventoryStock);
router.get('/inventory/history', verifyToken, requirePermission('inventory'), productController.getInventoryHistory);
router.put('/inventory/variant/:id/settings', verifyToken, restrictTo('admin'), productController.updateVariantSettings);
router.post('/inventory/inbound', verifyToken, restrictTo('admin'), productController.processInboundBatch);

// Đường dẫn: GET /api/v1/admin/orders (Lấy danh sách đơn hàng cho Admin)
router.get('/orders', verifyToken, requirePermission('orders'), orderController.getAdminOrders);

// Đường dẫn: PUT /api/v1/admin/orders/:id/status (Cập nhật trạng thái đơn hàng)
router.put('/orders/:id/status', verifyToken, restrictTo('admin'), orderController.updateOrderStatus);

// Đường dẫn: PUT /api/v1/admin/orders/:id/request-repayment (Yêu cầu khách hàng thanh toán lại)
router.put('/orders/:id/request-repayment', verifyToken, restrictTo('admin'), orderController.requestRepayment);

// Đường dẫn: GET /api/v1/admin/customers (Lấy danh sách người dùng/khách hàng)
router.get('/customers', verifyToken, requirePermission('customers'), userController.getAdminUsers);

// Các route quản lý người dùng (Thêm, Sửa, Xóa)
router.get('/customers/:id', verifyToken, requirePermission('customers'), userController.getAdminUserById);
router.post('/customers', verifyToken, restrictTo('admin'), userController.addAdminUser);
router.put('/customers/:id', verifyToken, restrictTo('admin'), userController.updateAdminUser);
router.delete('/customers/:id', verifyToken, restrictTo('admin'), userController.deleteAdminUser);
router.put('/customers/:id/toggle-status', verifyToken, restrictTo('admin'), userController.toggleUserStatus);

// Các route Báo cáo & Nhắc nhở Bảo mật
router.get('/security-report', verifyToken, requirePermission('customers'), userController.getSecurityReport);
router.post('/security-reminder', verifyToken, restrictTo('admin'), userController.sendSecurityReminder);
router.post('/customers/security-reminders', verifyToken, restrictTo('admin'), userController.sendBulkSecurityReminders);

// Các route quản lý Phân quyền (RBAC)
router.get('/permissions', verifyToken, restrictTo('admin', 'staff'), userController.getRolePermissions);
router.put('/permissions', verifyToken, restrictTo('admin'), userController.updateRolePermissions);

// Các route quản lý Voucher
router.get('/vouchers', verifyToken, requirePermission('vouchers'), voucherController.getAdminVouchers);
router.post('/vouchers', verifyToken, restrictTo('admin'), voucherController.createAdminVoucher);
router.put('/vouchers/:id', verifyToken, restrictTo('admin'), voucherController.updateAdminVoucher);
router.delete('/vouchers/:id', verifyToken, restrictTo('admin'), voucherController.deleteAdminVoucher);

// Route public lấy voucher cho trang Offers (Không yêu cầu Token)
router.get('/public-vouchers', voucherController.getPublicVouchers);

// Route public xác thực mã giảm giá (Rate Limited)
router.post('/validate-voucher', voucherController.validateCoupon);

// Route public lấy sản phẩm bán chạy (Không yêu cầu Token)
router.get('/bestsellers', productController.getBestSellingProducts);

// Route ADMIN để lấy cấu hình hệ thống (màu sắc, logo)
router.get('/settings', verifyToken, restrictTo('admin'), settingController.getSettings);

// Route public lấy trạng thái Flash Sale
router.get('/public-flash-sale', settingController.getPublicFlashSale);

// Route ADMIN để kích hoạt Flash Sale
router.post('/settings/start-flash-sale', verifyToken, restrictTo('admin'), settingController.startFlashSale);

// Route ADMIN để dừng Flash Sale
router.post('/settings/stop-flash-sale', verifyToken, restrictTo('admin'), settingController.stopFlashSale);

// Route ADMIN để lấy thông tin Flash Sale hiện tại
router.get('/settings/flash-sale', verifyToken, restrictTo('admin'), settingController.getFlashSaleAdmin);

// Route ADMIN để cập nhật Cài đặt hệ thống (Settings)
const debugSettingsMiddleware = (req, res, next) => {
    console.log('[ADMIN SETTINGS PUT] User ID:', req.user?.id);
    console.log('[ADMIN SETTINGS PUT] User Role:', req.user?.role);
    console.log('[ADMIN SETTINGS PUT] Request body:', req.body);
    console.log('[ADMIN SETTINGS PUT] Files:', Object.keys(req.files || {}));
    next();
};

// Wrap multer to catch MulterErrors locally and return 400 without bubbling to global error handler
router.put('/settings', verifyToken, restrictTo('admin'), (req, res, next) => {
    const handler = uploadSettings.fields([
        { name: 'logo', maxCount: 1 },
        { name: 'banner', maxCount: 1 },
        { name: 'vcbQr', maxCount: 1 },
        { name: 'momoQr', maxCount: 1 }
    ]);
    handler(req, res, (err) => {
        if (err) {
            // Multer specific handling
            if (err && err.name === 'MulterError') {
                console.warn('Multer warning on /admin/settings:', err.message);
                return res.status(400).json({ success: false, message: err.message });
            }
            return next(err);
        }
        next();
    });
}, debugSettingsMiddleware, settingController.updateSettings);

// Route đánh dấu tin nhắn liên hệ đã đọc
router.put('/contacts/:id/read', verifyToken, restrictTo('admin'), contactController.markContactRead);

// Route phản hồi tin nhắn liên hệ qua email
router.post('/contacts/:id/reply', verifyToken, restrictTo('admin'), contactController.replyContact);

// Route cho Form Liên hệ (Không yêu cầu đăng nhập)
router.post('/contact', uploadContact.fields([{ name: 'images', maxCount: 3 }, { name: 'video', maxCount: 1 }]), contactController.submitContactForm);

// =================================================================
// ROUTES QUẢN LÝ BANNER
// =================================================================
// Public: lấy banner theo trang (chỉ trả về banner đang active)
router.get('/banners/page/:pageKey', bannerController.getBannersByPage);

// Admin: lấy tất cả banner (cả active và inactive)
router.get('/banners', verifyToken, restrictTo('admin'), bannerController.getBanners);

// Admin: tạo banner mới
router.post('/banners', verifyToken, restrictTo('admin'), uploadSettings.single('image'), (req, res, next) => {
    // Multer error handler
    if (req.multerError) return res.status(400).json({ success: false, message: req.multerError.message });
    next();
}, bannerController.createBanner);

// Admin: cập nhật banner
router.put('/banners/:id', verifyToken, restrictTo('admin'), uploadSettings.single('image'), (req, res, next) => {
    if (req.multerError) return res.status(400).json({ success: false, message: req.multerError.message });
    next();
}, bannerController.updateBanner);

// Admin: xóa banner
router.delete('/banners/:id', verifyToken, restrictTo('admin'), bannerController.deleteBanner);

// Admin: bật/tắt banner
router.patch('/banners/:id/toggle', verifyToken, restrictTo('admin'), bannerController.toggleBanner);

module.exports = router;