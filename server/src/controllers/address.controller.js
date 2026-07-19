const { sequelize } = require('../config/database');

// Helper: Đảm bảo bảng và các cột cần thiết tồn tại
const initAddressTable = async () => {
    try {
        // Tạo bảng addresses nếu chưa có
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS addresses (
                id SERIAL PRIMARY KEY,
                user_id INTEGER,
                name VARCHAR(255),
                phone VARCHAR(50),
                street TEXT,
                ward VARCHAR(100),
                district VARCHAR(100),
                city VARCHAR(100),
                is_default BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Đảm bảo bảng users có đầy đủ các cột để đồng bộ địa chỉ mặc định
        await sequelize.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT').catch(() => { });
        await sequelize.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS ward VARCHAR(100)').catch(() => { });
        await sequelize.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS district VARCHAR(100)').catch(() => { });
        await sequelize.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(100)').catch(() => { });
    } catch (error) {
        console.error('Lỗi khởi tạo cấu trúc địa chỉ:', error);
    }
};

// ===================== LẤY DANH SÁCH ĐỊA CHỈ CỦA USER =====================
const getAddresses = async (req, res) => {
    try {
        const userId = req.user.id;

        await initAddressTable();

        const [addresses] = await sequelize.query(
            `SELECT id, name, phone, street, ward, district, city, is_default
             FROM addresses
             WHERE user_id = ?
             ORDER BY is_default DESC, created_at DESC`,
            { replacements: [userId] }
        );

        res.status(200).json({ success: true, data: addresses });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách địa chỉ:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi lấy danh sách địa chỉ.' });
    }
};

// ===================== THÊM ĐỊA CHỈ MỚI =====================
const createAddress = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, phone, street, ward, district, city, isDefault } = req.body;

        await initAddressTable();

        // Validate dữ liệu
        if (!name || !phone || !street || !ward || !district || !city) {
            return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin địa chỉ.' });
        }

        // Nếu đặt làm mặc định hoặc đây là địa chỉ đầu tiên -> bỏ mặc định cũ
        const [[{ count }]] = await sequelize.query(
            'SELECT COUNT(id) as count FROM addresses WHERE user_id = ?',
            { replacements: [userId] }
        );
        const shouldBeDefault = isDefault || parseInt(count) === 0;

        if (shouldBeDefault) {
            await sequelize.query(
                'UPDATE addresses SET is_default = false, updated_at = NOW() WHERE user_id = ? AND is_default = true',
                { replacements: [userId] }
            );
        }

        // Chèn địa chỉ mới
        const [result] = await sequelize.query(
            `INSERT INTO addresses (user_id, name, phone, street, ward, district, city, is_default, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
             RETURNING id`,
            { replacements: [userId, name, phone, street, ward, district, city, shouldBeDefault] }
        );

        const newId = result[0]?.id;

        // Nếu là địa chỉ mặc định, cập nhật thông tin trên bảng users
        if (shouldBeDefault) {
            await sequelize.query(
                'UPDATE users SET phone = ?, address = ?, ward = ?, district = ?, city = ?, updated_at = NOW() WHERE id = ?',
                { replacements: [phone, street, ward, district, city, userId] }
            );
        }

        res.status(201).json({
            success: true,
            message: 'Thêm địa chỉ mới thành công!',
            data: { id: newId, name, phone, street, ward, district, city, is_default: shouldBeDefault }
        });
    } catch (error) {
        console.error('Lỗi khi thêm địa chỉ:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi thêm địa chỉ.' });
    }
};

// ===================== CẬP NHẬT ĐỊA CHỈ =====================
const updateAddress = async (req, res) => {
    try {
        const userId = req.user.id;
        const addressId = req.params.id;
        const { name, phone, street, ward, district, city, isDefault } = req.body;

        // Validate dữ liệu
        if (!name || !phone || !street || !ward || !district || !city) {
            return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin địa chỉ.' });
        }

        // Kiểm tra địa chỉ thuộc về user đang đăng nhập
        const [[existing]] = await sequelize.query(
            'SELECT id FROM addresses WHERE id = ? AND user_id = ?',
            { replacements: [addressId, userId] }
        );
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy địa chỉ.' });
        }

        // Nếu đặt làm mặc định -> bỏ mặc định cũ
        if (isDefault) {
            await sequelize.query(
                'UPDATE addresses SET is_default = false, updated_at = NOW() WHERE user_id = ? AND is_default = true',
                { replacements: [userId] }
            );
        }

        // Cập nhật
        await sequelize.query(
            `UPDATE addresses SET name = ?, phone = ?, street = ?, ward = ?, district = ?, city = ?, is_default = ?, updated_at = NOW()
             WHERE id = ? AND user_id = ?`,
            { replacements: [name, phone, street, ward, district, city, isDefault || false, addressId, userId] }
        );

        // Nếu là địa chỉ mặc định, cập nhật thông tin trên bảng users
        if (isDefault) {
            await sequelize.query(
                'UPDATE users SET phone = ?, address = ?, ward = ?, district = ?, city = ?, updated_at = NOW() WHERE id = ?',
                { replacements: [phone, street, ward, district, city, userId] }
            );
        }

        res.status(200).json({
            success: true,
            message: 'Cập nhật địa chỉ thành công!',
            data: { id: parseInt(addressId), name, phone, street, ward, district, city, is_default: isDefault || false }
        });
    } catch (error) {
        console.error('Lỗi khi cập nhật địa chỉ:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi cập nhật địa chỉ.' });
    }
};

// ===================== XÓA ĐỊA CHỈ =====================
const deleteAddress = async (req, res) => {
    try {
        const userId = req.user.id;
        const addressId = req.params.id;

        // Kiểm tra địa chỉ thuộc về user đang đăng nhập
        const [[existing]] = await sequelize.query(
            'SELECT id, is_default FROM addresses WHERE id = ? AND user_id = ?',
            { replacements: [addressId, userId] }
        );
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy địa chỉ.' });
        }

        // Không cho xóa địa chỉ mặc định (để đảm bảo luôn có 1 địa chỉ chính)
        if (existing.is_default) {
            return res.status(400).json({ success: false, message: 'Không thể xóa địa chỉ mặc định. Vui lòng đặt một địa chỉ khác làm mặc định trước.' });
        }

        await sequelize.query(
            'DELETE FROM addresses WHERE id = ? AND user_id = ?',
            { replacements: [addressId, userId] }
        );

        res.status(200).json({ success: true, message: 'Đã xóa địa chỉ thành công.' });
    } catch (error) {
        console.error('Lỗi khi xóa địa chỉ:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi xóa địa chỉ.' });
    }
};

module.exports = { getAddresses, createAddress, updateAddress, deleteAddress };
