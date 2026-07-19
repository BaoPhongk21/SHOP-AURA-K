const User = require('../models/User');
const { sequelize } = require('../config/database');
const { verifyAuthToken } = require('../utils/authSession');
const logger = require('../utils/logger');
const crypto = require('crypto');

/**
 * Middleware để xác thực JWT token.
 * Nó sẽ giải mã token, tìm người dùng trong DB và gắn vào req.user.
 */
const verifyToken = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ success: false, message: 'Bạn chưa đăng nhập. Vui lòng đăng nhập để tiếp tục.' });
    }

    try {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            logger.error('CRITICAL: JWT_SECRET environment variable is missing.');
            return res.status(500).json({ success: false, message: 'Lỗi cấu hình hệ thống. Vui lòng liên hệ quản trị viên.' });
        }
        let decoded;
        try {
            decoded = verifyAuthToken(token, secret);
        } catch (tokenErr) {
            logger.warn('Invalid auth token', { error: tokenErr.message });
            return res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn.' });
        }

        const currentUser = await User.findByPk(decoded.id);
        if (!currentUser) {
            logger.warn('Token user not found', { userId: decoded.id });
            return res.status(401).json({ success: false, message: 'Người dùng của token này không còn tồn tại.' });
        }

        const currentPwSnippet = currentUser.password ? crypto.createHash('sha256').update(currentUser.password).digest('hex').substring(0, 16) : '';
        const tokenPwSnippet = decoded.pwSnippet || '';
        if (currentPwSnippet !== tokenPwSnippet) {
            logger.info('Token invalidated due to password change', { userId: currentUser.id });
            return res.status(401).json({ success: false, message: 'Phiên đăng nhập đã hết hạn do mật khẩu bị thay đổi. Vui lòng đăng nhập lại.' });
        }

        if (currentUser.is_active === false || currentUser.is_active === 0) {
            logger.info('Blocked/Inactive account tried to access', { userId: currentUser.id });
            return res.status(401).json({ success: false, message: 'Tài khoản đã bị khóa an toàn. Phiên đăng nhập bị chấm dứt.' });
        }

        const dbRole = String(currentUser.role || 'customer').toLowerCase().trim();
        const tokenRole = String(decoded.role || dbRole).toLowerCase().trim();
        const roleRank = { admin: 3, staff: 2, customer: 1 };

        // Nếu bị hạ quyền trên DB, buộc đăng nhập lại để tránh token cũ vẫn truy cập admin
        if ((roleRank[tokenRole] || 1) > (roleRank[dbRole] || 1)) {
            logger.info('Token role higher than DB role, invalidating session', { userId: currentUser.id, tokenRole, dbRole });
            return res.status(401).json({ success: false, message: 'Phiên đăng nhập đã hết hạn do thay đổi quyền. Vui lòng đăng nhập lại.' });
        }

        currentUser.role = dbRole;

        req.user = currentUser;
        next();
    } catch (error) {
        logger.error('Error in verifyToken middleware', { error: error.message });
        return res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn.' });
    }
};

/**
 * Middleware để giới hạn quyền truy cập dựa trên vai trò (role).
 * @param  {...string} roles - Danh sách các vai trò được phép (vd: 'admin', 'staff').
 */
const restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền thực hiện hành động này.' });
        }
        next();
    };
};

/**
 * Middleware kiểm tra quyền hạn chi tiết (RBAC) từ Database
 * @param {string} permissionKey - Tên cột quyền trong bảng role_permissions (vd: 'products', 'orders')
 */
const requirePermission = (permissionKey) => {
    return async (req, res, next) => {
        try {
            // ✅ Security: Whitelist allowed permission keys to prevent SQL injection
            const ALLOWED_PERMISSIONS = ['products', 'orders', 'customers', 'reports', 'settings', 'vouchers', 'inventory'];
            if (!ALLOWED_PERMISSIONS.includes(permissionKey)) {
                console.error(`Invalid permission key: ${permissionKey}`);
                return res.status(400).json({ success: false, message: 'Yêu cầu không hợp lệ.' });
            }

            const userRole = req.user.role;

            // Admin (Quản trị viên cấp cao) luôn có toàn quyền, bỏ qua check
            if (userRole === 'admin') return next();

            // Khách hàng không được phép truy cập
            if (userRole === 'customer') return res.status(403).json({ success: false, message: 'Bạn không có quyền thực hiện hành động này.' });

            // Chỉ Staff cần kiểm tra phân quyền chi tiết từ Database
            // Lấy cấu hình phân quyền hiện tại của vai trò này trong CSDL
            let hasAccess = false;
            try {
                // ✅ Security: Use backticks for identifiers, not parameters (safer approach)
                const query = `SELECT products, orders, customers, reports, settings, vouchers, inventory FROM role_permissions WHERE LOWER(role_name) = LOWER(?)`;
                const [permissions] = await sequelize.query(query, { replacements: [userRole] });
                
                if (permissions && permissions.length > 0) {
                    hasAccess = !!permissions[0][permissionKey];
                } else if (userRole === 'staff') {
                    hasAccess = ['orders', 'customers'].includes(permissionKey);
                }
            } catch (queryErr) {
                console.error('Database query error:', queryErr);
                if (userRole === 'staff') {
                    hasAccess = ['orders', 'customers'].includes(permissionKey);
                }
            }

            if (!hasAccess) {
                return res.status(403).json({ success: false, message: `Lỗi phân quyền: Vai trò của bạn không được phép thao tác với tính năng này.` });
            }

            next(); // Vượt qua bài test, cho phép truy cập API

        } catch (error) {
            console.error('Lỗi khi kiểm tra phân quyền từ DB:', error);
            return res.status(500).json({ success: false, message: 'Lỗi server khi xác thực quyền truy cập.' });
        }
    };
};

module.exports = { verifyToken, restrictTo, requirePermission };