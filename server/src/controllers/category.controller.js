const { sequelize } = require('../config/database');

// Helper: Xây dựng URL hình ảnh đúng
const buildImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) return imageUrl;
    return imageUrl; // /static-assets/ hoặc /uploads/ - giữ nguyên
};



const getAllCategories = async (req, res) => {
    try {

        const [categories] = await sequelize.query('SELECT * FROM categories ORDER BY sort_order ASC, name ASC');
        const formattedCategories = categories.map(cat => {
            const imageUrl = buildImageUrl(cat.image_url);
            return { ...cat, imageUrl, image: imageUrl, image_url: imageUrl };
        });
        res.status(200).json({ success: true, count: formattedCategories.length, data: formattedCategories });
    } catch (error) {
        console.error('Lỗi lấy danh mục:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi lấy danh mục' });
    }
};

const createCategory = async (req, res) => {
    try {

        const { name, slug, description, is_active, sort_order, image_url } = req.body;
        const [newCategory] = await sequelize.query(
            'INSERT INTO categories (name, slug, description, is_active, sort_order, image_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW()) RETURNING *',
            { replacements: [name, slug || null, description || null, is_active !== false, sort_order || 0, image_url || null] }
        );
        res.status(201).json({ success: true, message: 'Đã thêm danh mục mới', data: newCategory[0] });
    } catch (error) {
        console.error('Lỗi thêm danh mục:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi thêm danh mục. Mã (slug) có thể đã tồn tại.' });
    }
};

const updateCategory = async (req, res) => {
    try {

        const { id } = req.params;
        const { name, slug, description, is_active, sort_order, image_url } = req.body;
        const [result] = await sequelize.query(
            'UPDATE categories SET name = ?, slug = ?, description = ?, is_active = ?, sort_order = ?, image_url = ?, updated_at = NOW() WHERE id = ? RETURNING *',
            { replacements: [name, slug || null, description || null, is_active !== false, sort_order || 0, image_url || null, id] }
        );
        if (result.length === 0) return res.status(404).json({ success: false, message: 'Không tìm thấy danh mục' });
        res.status(200).json({ success: true, message: 'Đã cập nhật danh mục', data: result[0] });
    } catch (error) {
        console.error('Lỗi cập nhật danh mục:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi cập nhật danh mục. Mã (slug) có thể đã tồn tại.' });
    }
};

const deleteCategory = async (req, res) => {
    try {

        const { id } = req.params;

        // Kiểm tra xem có sản phẩm nào đang dùng danh mục này không
        const [products] = await sequelize.query('SELECT id FROM products WHERE category_id = ? LIMIT 1', { replacements: [id] });
        if (products.length > 0) {
            return res.status(400).json({ success: false, message: 'Không thể xóa danh mục đang có sản phẩm. Hãy chuyển sản phẩm sang danh mục khác trước.' });
        }

        const { rowCount } = await sequelize.query(
            'DELETE FROM categories WHERE id = ?',
            { replacements: [id], raw: true }
        );

        if (rowCount === 0) return res.status(404).json({ success: false, message: 'Không tìm thấy danh mục' });

        res.status(200).json({ success: true, message: 'Đã xóa danh mục' });
    } catch (error) {
        console.error('Lỗi xóa danh mục:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi xóa danh mục' });
    }
};

module.exports = { getAllCategories, createCategory, updateCategory, deleteCategory };