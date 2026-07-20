const { sequelize } = require('../config/database');
const { safeEmit } = require('../utils/socketio.helper');
const { sendEmailViaEmailJS } = require('../config/resend');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const getAdminUsers = async (req, res) => {
    try {
        // TỐI ƯU: Gộp các truy vấn thống kê vào một để tăng hiệu năng
        const [[stats]] = await sequelize.query(`
            SELECT
                COUNT(*) AS "totalUsers",
                SUM(CASE WHEN created_at >= date_trunc('month', CURRENT_DATE) THEN 1 ELSE 0 END) AS "newThisMonth"
            FROM users
        `);

        const [users] = await sequelize.query(`
            SELECT u.id, u.name, u.email, u.role, u.is_active, u.created_at, u.rank, u.avatar,
                   COUNT(DISTINCT o.id) as order_count,
                   COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN o.total_amount ELSE 0 END), 0) as total_spending
            FROM users u
            LEFT JOIN orders o ON u.id = o.user_id
            GROUP BY u.id, u.name, u.email, u.role, u.is_active, u.created_at, u.rank, u.avatar
            ORDER BY u.created_at DESC
        `);

        const { totalUsers, newThisMonth } = stats;

        const formattedUsers = users.map(user => {
            const dbRole = user.role || 'customer';
            const displayRole = dbRole === 'admin' ? 'Admin' : (dbRole === 'staff' ? 'Nhân viên' : 'Khách hàng');
            const name = user.name || 'Người dùng';
            const initials = (name.charAt(0) || 'U').toUpperCase();

            return {
                id: user.id,
                name: name,
                email: user.email || 'Không có email',
                role: displayRole,
                status: user.is_active === false || user.is_active === 0 ? 'Tạm khóa' : 'Hoạt động',
                date: new Date(user.created_at || new Date()).toLocaleDateString('vi-VN'),
                rank: user.rank || 'bronze',
                order_count: parseInt(user.order_count) || 0,
                total_spending: parseFloat(user.total_spending) || 0,
                initials: initials,
                avatar: user.avatar || null,
                bgClass: displayRole === 'Admin' ? 'bg-blue-100' : (displayRole === 'Nhân viên' ? 'bg-amber-100' : 'bg-slate-100'),
                textClass: displayRole === 'Admin' ? 'text-primary' : (displayRole === 'Nhân viên' ? 'text-amber-700' : 'text-slate-600')
            };
        });

        res.status(200).json({ success: true, data: { users: formattedUsers, stats: { totalUsers: Number(totalUsers || 0), newThisMonth: Number(newThisMonth || 0), activeSessions: "N/A" } } });
    } catch (error) { res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

const getAdminUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const [[user]] = await sequelize.query(`
            SELECT id, name, email, phone, role, is_active, created_at, updated_at, avatar, username
            FROM users WHERE id = ?
        `, { replacements: [id] });

        if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });

        const [[{ total_orders }]] = await sequelize.query('SELECT COUNT(id) as total_orders FROM orders WHERE user_id = ?', { replacements: [id] });
        const [[{ total_spent }]] = await sequelize.query("SELECT COALESCE(SUM(total_amount), 0) as total_spent FROM orders WHERE user_id = ? AND status != 'cancelled'", { replacements: [id] });

        res.status(200).json({
            success: true,
            data: {
                ...user,
                total_orders: parseInt(total_orders) || 0,
                total_spent: parseInt(total_spent) || 0
            }
        });
    } catch (error) { res.status(500).json({ success: false, message: 'Lỗi server.' }); }
};

const addAdminUser = async (req, res) => {
    try {
        const { firstName, lastName, email, password, role, phone } = req.body;
        if (!firstName || !lastName || !email || !password || !role) {
            return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin.' });
        }

        // 1. Kiểm tra xem email đã tồn tại chưa bằng truy vấn SQL
        const [[existingUser]] = await sequelize.query('SELECT id FROM users WHERE email = ?', { replacements: [email] });
        if (existingUser) return res.status(400).json({ success: false, message: 'Email này đã được sử dụng.' });

        // 2. Hash mật khẩu
        const salt = await require('bcryptjs').genSalt(10);
        const hashedPassword = await require('bcryptjs').hash(password, salt);
        const dbRole = role === 'Admin' ? 'admin' : (role === 'Nhân viên' ? 'staff' : 'customer');

        // 3. Chèn người dùng mới vào CSDL bằng truy vấn SQL
        await sequelize.query(
            'INSERT INTO users (name, email, phone, password, role, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, true, NOW(), NOW())',
            {
                replacements: [`${lastName || ''} ${firstName || ''}`.trim() || 'User', email, phone || null, hashedPassword, dbRole]
            }
        );

        res.status(201).json({ success: true, message: 'Thêm người dùng thành công!' });
    } catch (error) {
        console.error("Lỗi khi thêm người dùng:", error);
        res.status(500).json({ success: false, message: 'Lỗi server khi thêm người dùng.' });
    }
};

const updateAdminUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { firstName, lastName, email, role } = req.body;
        if (!firstName || !lastName || !email || !role) return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin.' });
        if (String(req.user.id) === String(id) && (req.user.role === 'admin' && role !== 'Admin')) return res.status(403).json({ success: false, message: 'Bạn không thể tự hạ vai trò của chính mình.' });

        const dbRole = role === 'Admin' ? 'admin' : (role === 'Nhân viên' ? 'staff' : 'customer');
        // Fix: đảo thứ tự đúng: lastName (họ) + firstName (tên)
        const fullName = `${lastName || ''} ${firstName || ''}`.trim();
        await sequelize.query('UPDATE users SET name = ?, email = ?, role = ?, updated_at = NOW() WHERE id = ?', { replacements: [fullName, email, dbRole, id] });

        safeEmit(req, 'permissions_updated');

        res.status(200).json({ success: true, message: 'Cập nhật thông tin người dùng thành công!' });
    } catch (error) { res.status(500).json({ success: false, message: 'Lỗi server.' }); }
};

const deleteAdminUser = async (req, res) => {
    try {
        const { id } = req.params;
        if (String(req.user.id) === String(id)) return res.status(403).json({ success: false, message: 'Bạn không thể tự khóa tài khoản của chính mình.' });
        await sequelize.query('UPDATE users SET is_active = false, updated_at = NOW() WHERE id = ?', { replacements: [id] });
        res.status(200).json({ success: true, message: 'Khóa người dùng thành công (Soft delete)!' });
    } catch (error) { res.status(500).json({ success: false, message: 'Không thể khóa người dùng này.' }); }
};

const toggleUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        if (String(req.user.id) === String(id)) return res.status(403).json({ success: false, message: 'Bạn không thể tự khóa tài khoản của chính mình.' });

        const [[user]] = await sequelize.query('SELECT is_active FROM users WHERE id = ?', { replacements: [id] });
        if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });

        // Đảo ngược trạng thái hiện tại một cách đơn giản
        const newStatus = !user.is_active;

        await sequelize.query('UPDATE users SET is_active = ?, updated_at = NOW() WHERE id = ?', { replacements: [newStatus, id] });

        res.status(200).json({ success: true, message: newStatus ? 'Đã mở khóa tài khoản!' : 'Đã tạm khóa tài khoản!' });
    } catch (error) { res.status(500).json({ success: false, message: 'Lỗi server.' }); }
};

const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { firstName, lastName, phone } = req.body;

        let avatarUrl = null;
        if (req.file) {
            const originalPath = req.file.path;
            const newFilename = `${path.parse(req.file.filename).name}.webp`;
            const newPath = path.join(path.dirname(originalPath), newFilename);

            await sharp(originalPath)
                .resize({ width: 200, height: 200, fit: 'cover' })
                .webp({ quality: 80 })
                .toFile(newPath);

            fs.unlinkSync(originalPath); // Xóa file gốc
            avatarUrl = `/uploads/avatars/${newFilename}`;
        }

        // Lấy thông tin cũ để không bị ghi đè thành null nếu client không gửi lên
        const [[user]] = await sequelize.query('SELECT name, phone, avatar FROM users WHERE id = ?', { replacements: [userId] });

        if (!user) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
        }

        const newName = (firstName || lastName) ? `${firstName || ''} ${lastName || ''}`.trim() : user.name;
        const newPhone = phone !== undefined ? phone : user.phone;
        const newAvatar = avatarUrl ? avatarUrl : user.avatar;

        await sequelize.query(
            'UPDATE users SET name = ?, phone = ?, avatar = ?, updated_at = NOW() WHERE id = ?',
            { replacements: [newName, newPhone, newAvatar, userId] }
        );

        // Lấy lại thông tin user đầy đủ sau khi update
        const [[updatedUser]] = await sequelize.query(`
            SELECT id, name, email, phone, role, rank, avatar, address, ward, district, city, created_at
            FROM users WHERE id = ?
        `, { replacements: [userId] });

        res.status(200).json({
            success: true,
            message: 'Cập nhật thông tin thành công!',
            data: {
                avatar: newAvatar,
                user: {
                    ...updatedUser
                }
            }
        });
    } catch (error) {
        console.error('Lỗi khi cập nhật profile:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi cập nhật thông tin' });
    }
};

// ===================== BÁO CÁO BẢO MẬT HỆ THỐNG =====================

const getSecurityReport = async (req, res) => {
    try {
        // Lấy dữ liệu thống kê từ CSDL
        const [[{ total_users }]] = await sequelize.query('SELECT COUNT(id) as total_users FROM users');
        const [[{ locked_accounts }]] = await sequelize.query('SELECT COUNT(id) as locked_accounts FROM users WHERE is_active = false OR is_active = 0');
        const [[{ admin_staff_count }]] = await sequelize.query("SELECT COUNT(id) as admin_staff_count FROM users WHERE role IN ('admin', 'staff')");

        // Đảm bảo cột tồn tại để không văng lỗi khi truy vấn
        await sequelize.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE').catch(() => { });
        const [[{ unverified_phones }]] = await sequelize.query('SELECT COUNT(id) as unverified_phones FROM users WHERE phone_verified = false OR phone_verified IS NULL');

        // Lấy danh sách các tài khoản vừa bị khóa gần đây
        const [recentLockedUsers] = await sequelize.query(`
            SELECT id, name, email, role, updated_at 
            FROM users 
            WHERE is_active = false OR is_active = 0 
            ORDER BY updated_at DESC LIMIT 10
        `);

        res.status(200).json({
            success: true,
            data: {
                stats: {
                    totalUsers: parseInt(total_users) || 0,
                    lockedAccounts: parseInt(locked_accounts) || 0,
                    adminStaffCount: parseInt(admin_staff_count) || 0,
                    unverifiedPhones: parseInt(unverified_phones) || 0
                },
                recentLockedUsers
            }
        });
    } catch (error) {
        console.error('Lỗi khi lấy báo cáo bảo mật:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi lấy báo cáo bảo mật.' });
    }
};

const sendSecurityReminder = async (req, res) => {
    try {
        const { userId, type } = req.body;

        if (!userId || !type) {
            return res.status(400).json({ success: false, message: 'Vui lòng cung cấp userId và loại nhắc nhở (type).' });
        }

        const [[user]] = await sequelize.query('SELECT * FROM users WHERE id = ?', { replacements: [userId] });
        if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });
        if (!user.email) return res.status(400).json({ success: false, message: 'Người dùng này không có địa chỉ email để gửi.' });

        let subject = '';
        let htmlContent = '';
        const userName = user.name || 'Khách hàng';

        // Phân loại nội dung email dựa trên "type" gửi từ Frontend
        if (type === 'verify_phone') {
            subject = '[Aura K] Nhắc nhở: Xác thực số điện thoại của bạn';
            htmlContent = `<div style="font-family: Arial, sans-serif; max-w: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;"><h2 style="color: #003178;">Bảo mật tài khoản</h2><p>Chào <strong>${userName}</strong>,</p><p>Chúng tôi nhận thấy bạn chưa xác thực số điện thoại cho tài khoản của mình trên hệ thống Aura K.</p><p>Việc xác thực số điện thoại giúp bảo vệ tài khoản của bạn an toàn hơn và hỗ trợ chúng tôi trong việc giao hàng.</p><p>Vui lòng đăng nhập vào hệ thống, truy cập mục <strong>Hồ sơ của tôi</strong> và tiến hành xác thực số điện thoại.</p><br/><p>Trân trọng,<br/><strong>Đội ngũ Aura K</strong></p></div>`;
        } else if (type === 'password_change_recommendation') {
            subject = '[Aura K] Khuyến nghị: Thay đổi mật khẩu định kỳ';
            htmlContent = `<div style="font-family: Arial, sans-serif; max-w: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;"><h2 style="color: #d97706;">Khuyến nghị bảo mật</h2><p>Chào <strong>${userName}</strong>,</p><p>Để đảm bảo an toàn tối đa cho tài khoản của bạn tại Aura K, chúng tôi khuyến nghị bạn nên thay đổi mật khẩu định kỳ (ít nhất 3-6 tháng/lần).</p><p>Hãy sử dụng mật khẩu mạnh bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt.</p><br/><p>Trân trọng,<br/><strong>Đội ngũ Bảo mật Aura K</strong></p></div>`;
        } else if (type === 'account_locked') {
            subject = '[Aura K] Thông báo: Tài khoản của bạn đang bị tạm khóa';
            htmlContent = `<div style="font-family: Arial, sans-serif; max-w: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;"><h2 style="color: #dc2626;">Thông báo trạng thái tài khoản</h2><p>Chào <strong>${userName}</strong>,</p><p>Tài khoản của bạn trên hệ thống Aura K hiện đang trong trạng thái <strong>Tạm khóa</strong> vì lý do bảo mật hoặc vi phạm chính sách.</p><p>Nếu bạn cho rằng đây là sự nhầm lẫn, vui lòng liên hệ ngay với bộ phận CSKH của chúng tôi bằng cách phản hồi lại email này.</p><br/><p>Trân trọng,<br/><strong>Đội ngũ Aura K</strong></p></div>`;
        } else {
            return res.status(400).json({ success: false, message: 'Loại nhắc nhở không hợp lệ.' });
        }

        // Sử dụng EmailJS (Lưu ý: Bạn cần tạo template_security trên Dashboard EmailJS)
        await sendEmailViaEmailJS('template_security', {
            to_email: user.email,
            subject: subject,
            message_html: htmlContent
        }).catch(err => console.warn("Vui lòng tạo 'template_security' trên EmailJS để gửi cảnh báo này."));

        res.status(200).json({ success: true, message: `Đã gửi email nhắc nhở bảo mật thành công tới ${user.email}!` });

    } catch (error) {
        console.error('❌ Nodemailer Error (Security Reminder):', error.message);
        res.status(500).json({ success: false, message: 'Lỗi server khi gửi email. Vui lòng kiểm tra lại cấu hình (App Password).' });
    }
};

const sendBulkSecurityReminders = async (req, res) => {
    try {
        // Lấy danh sách các tài khoản đang hoạt động và có email (Giới hạn 10 người để tránh spam khi test)
        const [users] = await sequelize.query(`
            SELECT id, name, email 
            FROM users 
            WHERE email IS NOT NULL AND is_active = true
            LIMIT 10
        `);

        if (!users || users.length === 0) {
            return res.status(400).json({ success: false, message: 'Không có người dùng nào hợp lệ để gửi email.' });
        }

        let successCount = 0;

        // Gửi email cho từng người trong danh sách
        for (const user of users) {
            const userName = user.name || 'Người dùng';
            const subject = '[Aura K] Khuyến nghị: Thay đổi mật khẩu định kỳ';
            const htmlContent = `<div style="font-family: Arial, sans-serif; max-w: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;"><h2 style="color: #d97706;">Khuyến nghị bảo mật</h2><p>Chào <strong>${userName}</strong>,</p><p>Để đảm bảo an toàn tối đa cho tài khoản của bạn tại Aura K, chúng tôi khuyến nghị bạn nên thay đổi mật khẩu định kỳ (ít nhất 3-6 tháng/lần).</p><p>Hãy sử dụng mật khẩu mạnh bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt.</p><br/><p>Trân trọng,<br/><strong>Đội ngũ Bảo mật Aura K</strong></p></div>`;

            try {
                await sendEmailViaEmailJS('template_security', {
                    to_email: user.email,
                    subject: subject,
                    message_html: htmlContent
                }).catch(err => console.error(`Lỗi EmailJS cho ${user.email}:`, err.message));
                successCount++;
            } catch (err) { console.error(`Lỗi gửi mail cho ${user.email}:`, err); }
        }

        res.status(200).json({ success: true, message: `Đã gửi email nhắc nhở bảo mật thành công tới ${successCount} tài khoản!` });
    } catch (error) {
        console.error('Lỗi khi gửi email hàng loạt:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi gửi email. Vui lòng kiểm tra lại cấu hình (App Password).' });
    }
};

const getRolePermissions = async (req, res) => {
    try {
        // 1. Tự động tạo bảng role_permissions nếu chưa tồn tại
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS role_permissions (
                role_name VARCHAR(50) PRIMARY KEY,
                products BOOLEAN DEFAULT FALSE,
                orders BOOLEAN DEFAULT FALSE,
                customers BOOLEAN DEFAULT FALSE,
                reports BOOLEAN DEFAULT FALSE,
                settings BOOLEAN DEFAULT FALSE,
                vouchers BOOLEAN DEFAULT FALSE,
                inventory BOOLEAN DEFAULT FALSE
            )
        `);

        // 2. Khởi tạo dữ liệu mặc định nếu bảng đang trống (Chỉ Admin và Staff)
        const [[{ count }]] = await sequelize.query('SELECT COUNT(*) FROM role_permissions');
        if (parseInt(count) === 0) {
            await sequelize.query(`
                INSERT INTO role_permissions (role_name, products, orders, customers, reports, settings, vouchers, inventory) VALUES 
                ('Admin', true, true, true, true, true, true, true),
                ('Staff', false, true, true, false, false, false, false)
            `);
        }

        // 3. Lấy dữ liệu và format cho Frontend (Chỉ Admin và Staff)
        const [permissions] = await sequelize.query("SELECT * FROM role_permissions WHERE role_name IN ('Admin', 'Staff')");
        const formattedPermissions = {};
        permissions.forEach(p => {
            formattedPermissions[p.role_name] = { products: p.products, orders: p.orders, customers: p.customers, reports: p.reports, settings: p.settings, vouchers: p.vouchers, inventory: p.inventory };
        });

        res.status(200).json({ success: true, data: formattedPermissions });
    } catch (error) {
        console.error('Lỗi lấy phân quyền:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi lấy phân quyền.' });
    }
};

const updateRolePermissions = async (req, res) => {
    try {
        const permissions = req.body;
        // Chỉ cập nhật cho Admin và Staff
        for (const [role, perms] of Object.entries(permissions)) {
            if (['Admin', 'Staff'].includes(role)) {
                await sequelize.query('UPDATE role_permissions SET products = ?, orders = ?, customers = ?, reports = ?, settings = ?, vouchers = ?, inventory = ? WHERE role_name = ?',
                    { replacements: [perms.products || false, perms.orders || false, perms.customers || false, perms.reports || false, perms.settings || false, perms.vouchers || false, perms.inventory || false, role] });
            }
        }

        safeEmit(req, 'permissions_updated');

        res.status(200).json({ success: true, message: 'Cập nhật phân quyền thành công!' });
    } catch (error) { res.status(500).json({ success: false, message: 'Lỗi server khi cập nhật.' }); }
};

module.exports = {
    getAdminUsers, getAdminUserById, addAdminUser, updateAdminUser, deleteAdminUser, toggleUserStatus, updateProfile,
    getSecurityReport, sendSecurityReminder, sendBulkSecurityReminders, getRolePermissions, updateRolePermissions
};