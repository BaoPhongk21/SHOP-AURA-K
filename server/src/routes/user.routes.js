const express = require('express');
const router = express.Router();
const { updateProfile } = require('../controllers/user.controller');
const { verifyToken } = require('../middlewares/auth.middleware'); // Nhớ đảm bảo đường dẫn này đúng với dự án của bạn
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Cấu hình Multer để lưu ảnh đại diện (Avatar)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(__dirname, '../uploads/avatars');
        if (!fs.existsSync(dir)){ fs.mkdirSync(dir, { recursive: true }); }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, 'avatar-' + req.user.id + '-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max for avatars
    fileFilter: function (req, file, cb) {
        const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
        if (allowedMimes.includes(file.mimetype)) cb(null, true);
        else cb(new Error('Định dạng file không được hỗ trợ. Chỉ chấp nhận ảnh.'), false);
    }
});

// API: PUT /api/v1/users/profile
router.put('/profile', verifyToken, upload.single('avatar'), updateProfile);

module.exports = router;