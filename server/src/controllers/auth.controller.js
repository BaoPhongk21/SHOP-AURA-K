const User = require('../models/User');
const Order = require('../models/Order'); // Giả định bạn có model Order
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const authService = require('../services/auth.service');
// Import validation schemas
const authValidation = require('../validations/auth.validation');



const registerUser = async (req, res) => {
    try { // Controller chỉ còn nhiệm vụ validate và gọi service
        // Validate input data bằng Joi
        if (!authValidation || !authValidation.registerValidation) {
            throw new Error("Hệ thống kiểm tra dữ liệu chưa sẵn sàng.");
        }
        const { error } = authValidation.registerValidation.validate(req.body);
        if (error) {
            return res.status(400).json({ success: false, message: error.details[0].message });
        }

        await authService.registerStep1(req.body);
        res.status(200).json({
            success: true,
            message: 'Đăng ký thành công bước 1! Hệ thống đã gửi mã xác nhận đến Gmail của bạn.'
        });
    } catch (error) { // Xử lý lỗi tập trung
        res.status(400).json({ success: false, message: error.message });
    }
};

const loginUser = async (req, res) => {
    try { // Controller chỉ còn nhiệm vụ validate và gọi service
        // Validate input data bằng Joi
        if (authValidation && authValidation.loginValidation) {
            const { error } = authValidation.loginValidation.validate(req.body);
            if (error) {
                return res.status(400).json({ success: false, message: error.details[0].message });
            }
        }

        const { identifier, password } = req.body;
        const result = await authService.login(identifier, password);
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        res.status(401).json({ success: false, message: error.message }); // Lỗi từ service sẽ được ném ra
    }
};

const facebookLogin = async (req, res) => {
    try { // Controller chỉ còn nhiệm vụ lấy token và gọi service
        const { token } = req.body;
        if (!token) return res.status(400).json({ success: false, message: 'Thiếu token Facebook.' });
        const result = await authService.facebookLogin(token);
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const googleLogin = async (req, res) => {
    try { // Controller chỉ còn nhiệm vụ lấy token và gọi service
        const { token } = req.body;
        if (!token) return res.status(400).json({ success: false, message: 'Thiếu token Google.' });
        const result = await authService.googleLogin(token);
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const getCurrentUser = async (req, res) => {
    try { // Controller chỉ còn nhiệm vụ lấy userId và gọi service
        const userData = await authService.getCurrentUser(req.user.id);
        res.status(200).json({ success: true, data: { user: userData } });
    } catch (error) {
        res.status(404).json({ success: false, message: error.message });
    }
};

const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;
        const newToken = await authService.changePassword(userId, currentPassword, newPassword);
        res.status(200).json({ success: true, message: 'Thay đổi mật khẩu thành công!', token: newToken });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const checkEmailExists = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, message: 'Vui lòng cung cấp email.' });
        const exists = await authService.checkEmailExists(email);
        res.status(200).json({ success: true, exists, message: exists ? 'Email đã tồn tại.' : undefined });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server nội bộ.' });
    }
};

const verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        await authService.verifyOtpAndRegister(email, otp);
        res.status(201).json({ success: true, message: 'Bạn đã đăng ký thành công! Vui lòng đăng nhập.' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const forgotPassword = async (req, res) => {
    try {
        const { identifier } = req.body;
        if (!identifier) return res.status(400).json({ success: false, message: 'Vui lòng cung cấp email hoặc số điện thoại.' });
        const type = await authService.forgotPassword(identifier);
        res.status(200).json({ success: true, message: `Mã OTP đã được gửi đến ${type} của bạn.` });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { identifier, otp, newPassword } = req.body;
        await authService.resetPassword(identifier, otp, newPassword);
        res.status(200).json({ success: true, message: 'Khôi phục mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// ===================== XÁC NHẬN SỐ ĐIỆN THOẠI =====================
const sendPhoneOtp = async (req, res) => {
    try {
        const userId = req.user.id;
        await authService.sendPhoneOtp(userId);
        res.status(200).json({ success: true, message: 'Mã OTP đã được gửi đến số điện thoại. (Vui lòng kiểm tra Terminal Backend).' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const verifyPhoneOtp = async (req, res) => {
    try {
        const userId = req.user.id;
        const { otp } = req.body;
        await authService.verifyPhoneOtp(userId, otp);
        res.status(200).json({ success: true, message: 'Xác nhận số điện thoại thành công!' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const emergencyLock = async (req, res) => {
    try {
        const { token, password } = req.body;
        if (!token) return res.status(400).json({ success: false, message: 'Token không hợp lệ.' }); // Validate token
        if (!password) return res.status(400).json({ success: false, message: 'Vui lòng nhập mật khẩu.' }); // Validate password
        await authService.emergencyLock(token, password);
        res.status(200).json({ success: true, message: 'Tài khoản của bạn đã được khóa an toàn để tránh kẻ gian xâm nhập.' });
    } catch (error) {
        res.status(400).json({ success: false, message: 'Lỗi! Token không hợp lệ hoặc đã hết hạn.' });
    }
};

module.exports = { registerUser, loginUser, getCurrentUser, changePassword, checkEmailExists, verifyOtp, forgotPassword, resetPassword, facebookLogin, googleLogin, sendPhoneOtp, verifyPhoneOtp, emergencyLock };