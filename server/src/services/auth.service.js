const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const crypto = require('crypto');
const { sendRegistrationOtpEmail, sendResetPasswordOtpEmail, sendPhoneVerificationOtpEmail, sendEmailViaEmailJS } = require('../config/resend');
const { sequelize } = require('../config/database');
const logger = require('../utils/logger');
const { createAuthToken } = require('../utils/authSession');

const otpStore = new Map();
const loginAttemptsStore = new Map();

// Hàm hỗ trợ gửi email cảnh báo bảo mật (Di chuyển từ controller)
const sendSecurityAlertEmail = async (user) => {
    try {
        const secret = process.env.JWT_SECRET;
        if (!secret) throw new Error('Cấu hình máy chủ bị lỗi: Thiếu JWT_SECRET');
        const lockToken = jwt.sign({ id: user.id, action: 'lock' }, secret, { expiresIn: '1h' });
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const lockUrl = `${frontendUrl}/login?action=emergency_lock&token=${lockToken}`;

        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #dc2626;">Cảnh báo đăng nhập bất thường</h2>
                <p>Chào bạn, tài khoản <strong>${user.email}</strong> vừa có nhiều lần đăng nhập sai.</p>
                <p>Để bảo vệ tài khoản, chúng tôi đã tạm khóa quyền truy cập. Nếu không phải là bạn, hãy sử dụng liên kết khẩn cấp dưới đây:</p>
                <a href="${lockUrl}" style="display: inline-block; padding: 10px 20px; background-color: #dc2626; color: white; text-decoration: none; border-radius: 5px;">Khóa tài khoản khẩn cấp</a>
            </div>`;

        await sendEmailViaEmailJS('template_security', {
            to_email: user.email,
            subject: '[Aura K] Cảnh báo bảo mật tài khoản',
            message_html: htmlContent
        });
    } catch (err) { logger.error('Lỗi gửi email cảnh báo bảo mật:', err); }
};

class AuthService {
    async registerStep1(userData) {
        const email = userData.email.toLowerCase().trim();
        const username = userData.username.trim();
        const phone = userData.phone.trim();

        // Kiểm tra trùng lặp từng trường cụ thể
        const existingEmail = await User.findOne({ where: { email } });
        if (existingEmail) {
            throw new Error('Email đã tồn tại.');
        }

        const existingUsername = await User.findOne({ where: { username } });
        if (existingUsername) {
            throw new Error('Tên đăng nhập đã tồn tại.');
        }

        const existingPhone = await User.findOne({ where: { phone } });
        if (existingPhone) {
            throw new Error('Số điện thoại đã tồn tại.');
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 60 * 1000;

        if (otpStore.has(email) && otpStore.get(email).timeoutId) {
            clearTimeout(otpStore.get(email).timeoutId);
        }

        const timeoutId = setTimeout(() => otpStore.delete(email), 60 * 1000);

        otpStore.set(email, {
            userData: { ...userData, email, username, phone },
            otp,
            expiresAt,
            timeoutId
        });

        try {
            await sendRegistrationOtpEmail(email, otp);
        } catch (emailError) {
            logger.error(`Lỗi gửi OTP qua EmailJS đến ${email}:`, emailError);
            if (process.env.NODE_ENV === 'production') {
                throw new Error('Không thể gửi mã OTP xác nhận qua Email. Vui lòng thử lại sau.');
            }
            logger.info(`[DEV MODE] OTP cho ${email} là: ${otp} (Bypass EmailJS error)`);
        }
        return true;
    }

    async verifyOtpAndRegister(email, otp) {
        const emailKey = email.toLowerCase().trim();
        const record = otpStore.get(emailKey);
        if (!record || record.otp !== otp || Date.now() > record.expiresAt) {
            throw new Error('Mã OTP không hợp lệ hoặc đã hết hạn.');
        }

        const { firstName, lastName, username, phone, password } = record.userData;
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        try {
            const newUser = await User.create({
                name: `${firstName} ${lastName}`.trim(),
                username,
                phone,
                email: emailKey,
                password: hashedPassword,
                role: 'customer'
            });

            if (record.timeoutId) {
                clearTimeout(record.timeoutId);
            }
            otpStore.delete(emailKey);
            return newUser;
        } catch (error) {
            logger.error('Lỗi khi lưu người dùng vào Database:', error);
            if (error.name === 'SequelizeUniqueConstraintError') {
                const field = error.errors?.[0]?.path || '';
                if (field.includes('email')) {
                    throw new Error('Email đã tồn tại.');
                } else if (field.includes('username')) {
                    throw new Error('Tên đăng nhập đã tồn tại.');
                } else if (field.includes('phone')) {
                    throw new Error('Số điện thoại đã tồn tại.');
                }
                throw new Error('Tài khoản, email hoặc số điện thoại đã tồn tại.');
            }
            throw new Error('Lỗi cơ sở dữ liệu. Không thể hoàn tất đăng ký.');
        }
    }

    async login(identifier, password) {
        const loginId = identifier.toLowerCase().trim();
        const user = await User.findOne({
            where: { [Op.or]: [{ email: loginId }, { username: identifier.trim() }, { phone: identifier.trim() }] }
        });

        if (!user) throw new Error('Tài khoản không tồn tại.');

        // Nếu tài khoản được tạo qua Google/Facebook (không có mật khẩu), hướng dẫn đăng nhập bằng mạng xã hội
        if (!user.password) {
            throw new Error('Tài khoản này được đăng ký bằng Google/Facebook. Vui lòng đăng nhập bằng Google hoặc Facebook.');
        }

        const MAX_ATTEMPTS = 6;
        const LOCK_TIME_MS = 10 * 60 * 1000;
        const attemptRecord = loginAttemptsStore.get(identifier);

        if (attemptRecord && attemptRecord.lockUntil && Date.now() < attemptRecord.lockUntil) {
            throw new Error('Tài khoản bị khóa tạm thời. Thử lại sau.');
        }

        const isMatch = user.password ? await bcrypt.compare(password, user.password) : false;

        if (!isMatch) {
            let attempts = (attemptRecord ? attemptRecord.attempts : 0) + 1;
            if (attempts >= MAX_ATTEMPTS) {
                loginAttemptsStore.set(identifier, { attempts, lockUntil: Date.now() + LOCK_TIME_MS });
                sendSecurityAlertEmail(user); // Gửi cảnh báo khi tài khoản bị khóa
                throw new Error('Tài khoản đã bị khóa 10 phút do nhập sai quá nhiều lần.');
            }
            loginAttemptsStore.set(identifier, { attempts, lockUntil: null });
            throw new Error(`Mật khẩu không chính xác. Bạn còn ${MAX_ATTEMPTS - attempts} lần thử.`);
        }

        loginAttemptsStore.delete(identifier);
        if (user.is_active === false) throw new Error('Tài khoản đã bị khóa an toàn.');

        const role = (user.role || 'customer').toLowerCase();
        const secret = process.env.JWT_SECRET;
        if (!secret) throw new Error('Cấu hình máy chủ bị lỗi: Thiếu JWT_SECRET');
        const pwSnippet = user.password ? crypto.createHash('sha256').update(user.password).digest('hex').substring(0, 16) : '';
        const token = createAuthToken({ id: user.id, role, pwSnippet }, secret, { expiresIn: '7d' });

        const permissions = await this.getRolePermissions(role);

        return {
            token,
            user: {
                ...user.toJSON(),
                role,
                permissions
            }
        };
    }

    normalizePermissions(perms) {
        return {
            products: !!perms?.products,
            orders: !!perms?.orders,
            customers: !!perms?.customers,
            reports: !!perms?.reports,
            settings: !!perms?.settings,
            vouchers: !!perms?.vouchers,
            inventory: !!perms?.inventory,
        };
    }

    async getRolePermissions(role) {
        const normalizedRole = String(role || 'customer').toLowerCase().trim();

        if (normalizedRole === 'admin') {
            return { products: true, orders: true, customers: true, reports: true, settings: true, vouchers: true, inventory: true };
        }

        try {
            const [[perms]] = await sequelize.query(
                'SELECT products, orders, customers, reports, settings, vouchers, inventory FROM role_permissions WHERE LOWER(role_name) = LOWER(?)',
                { replacements: [normalizedRole] }
            );
            if (perms) return this.normalizePermissions(perms);
        } catch (e) { }

        if (normalizedRole === 'staff') {
            return { products: false, orders: true, customers: true, reports: false, settings: false, vouchers: false, inventory: false };
        }

        return { products: false, orders: false, customers: false, reports: false, settings: false, vouchers: false, inventory: false };
    }

    async facebookLogin(token) {
        const fbResponse = await fetch(`https://graph.facebook.com/me?fields=id,name,email,first_name,last_name,picture.type(large)&access_token=${token}`);
        const fbData = await fbResponse.json();

        if (fbData.error) throw new Error('Token Facebook không hợp lệ hoặc đã hết hạn.');

        const email = fbData.email || `${fbData.id}@facebook.com`;
        const avatarUrl = fbData.picture?.data?.url || null;

        let user = await User.findOne({ where: { email } });

        if (!user) {
            const dummyPhoneFb = '0' + fbData.id.substring(0, 9);
            const checkConflict = await User.findOne({ where: { [Op.or]: [{ username: `fb_${fbData.id}` }, { phone: dummyPhoneFb }] } });

            user = await User.create({
                name: fbData.name || 'Người dùng Facebook',
                username: `fb_${fbData.id}`,
                email: email,
                phone: checkConflict ? `09${Math.floor(10000000 + Math.random() * 90000000)}` : dummyPhoneFb,
                password: null,
                role: 'customer',
                avatar: avatarUrl
            });

            await this._giftNewUserVouchers(user.id);
        } else if (!user.avatar && avatarUrl) {
            user.avatar = avatarUrl;
            await user.save();
        }

        if (user.is_active === false) throw new Error('Tài khoản của bạn đã bị khóa an toàn.');

        return this._generateAuthResponse(user);
    }

    async googleLogin(token) {
        const googleResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!googleResponse.ok) {
            const errData = await googleResponse.json().catch(() => ({}));
            logger.error('Google UserInfo API error:', errData);
            throw new Error('Không thể lấy thông tin từ Google. Token có thể đã hết hạn.');
        }

        const googleData = await googleResponse.json();

        const email = googleData.email;
        const avatarUrl = googleData.picture || null;

        if (!email) throw new Error('Không thể lấy thông tin email từ tài khoản Google của bạn.');

        let user = await User.findOne({ where: { email } });

        if (!user) {
            const dummyPhoneGg = '0' + googleData.sub.substring(0, 9);
            const checkConflict = await User.findOne({ where: { [Op.or]: [{ username: `gg_${googleData.sub}` }, { phone: dummyPhoneGg }] } });

            user = await User.create({
                name: googleData.name || 'Người dùng Google',
                username: `gg_${googleData.sub}`,
                email: email,
                phone: checkConflict ? `08${Math.floor(10000000 + Math.random() * 90000000)}` : dummyPhoneGg,
                password: null,
                role: 'customer',
                avatar: avatarUrl
            });

            await this._giftNewUserVouchers(user.id);
        } else if (!user.avatar && avatarUrl) {
            user.avatar = avatarUrl;
            await user.save();
        }

        if (user.is_active === false) throw new Error('Tài khoản của bạn đã bị khóa an toàn.');

        return this._generateAuthResponse(user);
    }

    async getCurrentUser(userId) {
        const user = await User.findByPk(userId, { attributes: { exclude: ['password', 'is_admin', 'isAdmin'] } });
        if (!user) throw new Error('Người dùng không tồn tại.');

        const totalOrders = await sequelize.query('SELECT COUNT(id) as total_orders FROM orders WHERE user_id = ? AND status != ?', { replacements: [user.id, 'cancelled'] });
        const [[phoneVerifiedResult]] = await sequelize.query('SELECT phone_verified FROM users WHERE id = ?', { replacements: [user.id] });
        const phoneVerified = phoneVerifiedResult?.phone_verified || false;

        const [[spendingResult]] = await sequelize.query("SELECT SUM(total_amount) as total_spending FROM orders WHERE user_id = ? AND status = 'completed'", { replacements: [user.id] });
        const totalSpending = Number(spendingResult?.total_spending || 0);
        const dynamicLoyaltyPoints = Math.floor(totalSpending / 100000);

        // Cập nhật lại rank động dựa trên total_spending để đồng bộ với Frontend (Frontend dùng bronze, silver, gold, diamond)
        let dynamicRank = 'bronze';
        if (totalSpending >= 50000000) dynamicRank = 'diamond';
        else if (totalSpending >= 20000000) dynamicRank = 'gold';
        else if (totalSpending >= 5000000) dynamicRank = 'silver';

        // Tự động đồng bộ rank và điểm vào bảng users nếu khác biệt
        if (user.rank !== dynamicRank || user.loyalty_points !== dynamicLoyaltyPoints) {
            await sequelize.query('UPDATE users SET rank = ?, loyalty_points = ? WHERE id = ?', { replacements: [dynamicRank, dynamicLoyaltyPoints, user.id] });
            user.rank = dynamicRank;
            user.loyalty_points = dynamicLoyaltyPoints;
        }

        const userRole = (user.role || 'customer').toLowerCase();
        const permissions = await this.getRolePermissions(userRole);

        return {
            ...user.toJSON(),
            role: userRole,
            total_orders: parseInt(totalOrders[0][0].total_orders) || 0,
            total_spending: totalSpending,
            loyalty_points: dynamicLoyaltyPoints,
            rank: dynamicRank,
            phone_verified: phoneVerified,
            permissions: permissions
        };
    }

    async changePassword(userId, currentPassword, newPassword) {
        const user = await User.findOne({ where: { id: userId } });
        if (!user) throw new Error('Không tìm thấy người dùng.');

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) throw new Error('Mật khẩu hiện tại không chính xác.');

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        const secret = process.env.JWT_SECRET;
        if (!secret) throw new Error('Cấu hình máy chủ bị lỗi: Thiếu JWT_SECRET');
        const pwSnippet = user.password ? crypto.createHash('sha256').update(user.password).digest('hex').substring(0, 16) : '';
        return createAuthToken({ id: user.id, role: user.role || 'customer', pwSnippet }, secret, { expiresIn: '7d' });
    }

    async checkEmailExists(email) {
        const user = await User.findOne({ where: { email } });
        return !!user;
    }

    async forgotPassword(identifier) {
        const user = await User.findOne({ where: { [Op.or]: [{ email: identifier }, { phone: identifier }] } });
        if (!user) throw new Error('Không tìm thấy tài khoản với thông tin này.');

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 60 * 1000;

        if (otpStore.has(identifier) && otpStore.get(identifier).timeoutId) clearTimeout(otpStore.get(identifier).timeoutId);
        const timeoutId = setTimeout(() => otpStore.delete(identifier), 60 * 1000);

        otpStore.set(identifier, { otp, expiresAt, userId: user.id, type: 'reset_password', timeoutId });

        const isEmail = identifier.includes('@');
        if (isEmail) await sendResetPasswordOtpEmail(identifier, otp);
        else logger.info(`[SMS MOCK] Gửi OTP ${otp} đến số điện thoại ${identifier}`);

        return isEmail ? 'email' : 'số điện thoại';
    }

    async resetPassword(identifier, otp, newPassword) {
        const record = otpStore.get(identifier);
        if (!record || record.type !== 'reset_password' || Date.now() > record.expiresAt || record.otp !== otp) {
            throw new Error('Mã OTP không hợp lệ hoặc đã hết hạn.');
        }

        const user = await User.findByPk(record.userId);
        if (!user) throw new Error('Người dùng không tồn tại.');

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        otpStore.delete(identifier);
    }

    async sendPhoneOtp(userId) {
        const user = await User.findByPk(userId);
        if (!user) throw new Error('Người dùng không tồn tại.');
        if (!user.phone) throw new Error('Tài khoản chưa cập nhật số điện thoại.');

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 60 * 1000;
        const phoneKey = `phone_${user.phone}`;

        if (otpStore.has(phoneKey) && otpStore.get(phoneKey).timeoutId) clearTimeout(otpStore.get(phoneKey).timeoutId);
        const timeoutId = setTimeout(() => otpStore.delete(phoneKey), 60 * 1000);

        otpStore.set(phoneKey, { otp, expiresAt, userId: user.id, type: 'verify_phone', timeoutId });
        
        // Gửi email thông báo OTP (thay vì SMS)
        try {
            await sendPhoneVerificationOtpEmail(user.email, otp);
        } catch (emailErr) {
            logger.warn(`Không thể gửi email OTP xác nhận số điện thoại: ${emailErr.message}`);
        }
        logger.info(`[SMS MOCK] Mã OTP xác nhận số điện thoại của bạn là: ${otp}. Đã gửi đến ${user.phone} và email ${user.email}`);
    }

    async verifyPhoneOtp(userId, otp) {
        const user = await User.findByPk(userId);
        if (!user) throw new Error('Người dùng không tồn tại.');

        const record = otpStore.get(`phone_${user.phone}`);
        if (!record || record.type !== 'verify_phone' || Date.now() > record.expiresAt || record.otp !== otp) {
            throw new Error('Mã OTP không hợp lệ hoặc đã hết hạn.');
        }

        await sequelize.query('UPDATE users SET phone_verified = true WHERE id = ?', { replacements: [userId] });
        otpStore.delete(`phone_${user.phone}`);
    }

    async emergencyLock(lockToken, password) {
        const secret = process.env.JWT_SECRET;
        if (!secret) throw new Error('Cấu hình máy chủ bị lỗi: Thiếu JWT_SECRET');
        const decoded = jwt.verify(lockToken, secret);
        if (decoded.action !== 'lock') throw new Error('Hành động không hợp lệ.');

        const user = await User.findByPk(decoded.id);
        if (!user) throw new Error('Người dùng không tồn tại.');

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) throw new Error('Mật khẩu không chính xác.');

        await sequelize.query('UPDATE users SET is_active = false, updated_at = NOW() WHERE id = ?', { replacements: [user.id] });
    }

    // Hàm hỗ trợ nội bộ để tặng voucher cho người dùng mới
    async _giftNewUserVouchers(userId) {
        try {
            const [coupons] = await sequelize.query("SELECT id, code FROM coupons WHERE code IN ('FREESHIP_NEW', 'GIAM10_2TR')");
            for (const c of coupons) {
                const qty = c.code === 'FREESHIP_NEW' ? 2 : 1;
                await sequelize.query("INSERT INTO user_coupons (user_id, coupon_id, quantity) VALUES (?, ?, ?) ON CONFLICT DO NOTHING", { replacements: [userId, c.id, qty] });
            }
        } catch (err) { logger.error('Lỗi tặng voucher cho user mới:', err); }
    }

    // Hàm hỗ trợ nội bộ để tạo response chuẩn cho login/social login
    async _generateAuthResponse(user) {
        const role = (user.role || 'customer').toLowerCase();
        const secret = process.env.JWT_SECRET;
        if (!secret) throw new Error('Cấu hình máy chủ bị lỗi: Thiếu JWT_SECRET');
        const pwSnippet = user.password ? crypto.createHash('sha256').update(user.password).digest('hex').substring(0, 16) : '';
        const token = createAuthToken({ id: user.id, role, pwSnippet }, secret, { expiresIn: '7d' });

        const permissions = await this.getRolePermissions(role);

        const { password, ...userData } = user.toJSON();
        delete userData.is_admin;
        delete userData.isAdmin;

        return { token, user: { ...userData, role, permissions } };
    }
}

module.exports = new AuthService();