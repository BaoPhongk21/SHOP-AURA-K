const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getCurrentUser, changePassword, checkEmailExists, verifyOtp, forgotPassword, resetPassword, facebookLogin, googleLogin, sendPhoneOtp, verifyPhoneOtp, emergencyLock } = require('../controllers/auth.controller');
// express-validator removed in favor of Joi
const { verifyToken } = require('../middlewares/auth.middleware'); // Thêm middleware xác thực

router.post('/register', registerUser);

router.post('/login', loginUser);

// Route đăng nhập bằng Facebook
router.post('/facebook', facebookLogin);

// Route đăng nhập bằng Google
router.post('/google', googleLogin);

// Route lấy thông tin user đang đăng nhập (Tránh gọi nhầm vào /login)
router.get('/me', verifyToken, getCurrentUser);

// Route đổi mật khẩu
router.post('/change-password', verifyToken, changePassword);

// Route kiểm tra email đã tồn tại chưa
router.post('/check-email', checkEmailExists);

// Route kiểm tra mã OTP
router.post('/verify-otp', verifyOtp);

// Route gửi OTP quên mật khẩu
router.post('/forgot-password', forgotPassword);

// Route đặt lại mật khẩu mới
router.post('/reset-password', resetPassword);

// Route gửi OTP qua điện thoại
router.post('/send-phone-otp', verifyToken, sendPhoneOtp);

// Route xác thực OTP điện thoại
router.post('/verify-phone-otp', verifyToken, verifyPhoneOtp);

// Route khóa tài khoản khẩn cấp từ email
router.post('/emergency-lock', emergencyLock);

module.exports = router;