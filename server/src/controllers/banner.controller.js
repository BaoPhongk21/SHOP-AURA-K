const { sequelize } = require('../config/database');

// Lấy danh sách banner (admin - thấy cả active & inactive)
const getBanners = async (req, res) => {
    try {
        const [banners] = await sequelize.query(`
            SELECT id, page_key, title, image_url, link_url, sort_order, is_active, created_at, updated_at
            FROM banners
            ORDER BY page_key ASC, sort_order ASC, id ASC
        `);

        res.status(200).json({ success: true, data: banners });
    } catch (error) {
        console.error('Get banners error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách banner.' });
    }
};

// Lấy danh sách banner theo trang (public - chỉ active)
const getBannersByPage = async (req, res) => {
    try {
        const { pageKey } = req.params;
        const [banners] = await sequelize.query(`
            SELECT id, page_key, title, image_url, link_url, sort_order
            FROM banners
            WHERE page_key = ? AND is_active = true
            ORDER BY sort_order ASC, id ASC
        `, { replacements: [pageKey] });

        res.status(200).json({ success: true, data: banners });
    } catch (error) {
        console.error('Get banners by page error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi lấy banner theo trang.' });
    }
};

// Tạo banner mới
const createBanner = async (req, res) => {
    try {
        const { page_key, title, link_url, sort_order, is_active } = req.body;

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Vui lòng chọn ảnh banner.' });
        }
        if (!page_key) {
            return res.status(400).json({ success: false, message: 'Vui lòng chọn trang áp dụng.' });
        }

        const imageUrl = `/uploads/settings/${req.file.filename}`;
        const sortOrder = sort_order !== undefined && sort_order !== '' ? Number(sort_order) : 0;
        const activeFlag = is_active === false || is_active === 'false' || is_active === 0 || is_active === '0' ? false : true;

        const [result] = await sequelize.query(`
            INSERT INTO banners (page_key, title, image_url, link_url, sort_order, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
            RETURNING id, page_key, title, image_url, link_url, sort_order, is_active
        `, {
            replacements: [page_key, title || null, imageUrl, link_url || null, sortOrder, activeFlag]
        });

        const newBanner = result && result[0] ? result[0] : null;
        res.status(201).json({ success: true, message: 'Thêm banner thành công!', data: newBanner });
    } catch (error) {
        console.error('Create banner error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi tạo banner: ' + error.message });
    }
};

// Cập nhật banner
const updateBanner = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, link_url, sort_order, is_active } = req.body;

        const [existing] = await sequelize.query('SELECT id, image_url FROM banners WHERE id = ?', { replacements: [id] });
        if (!existing || existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Banner không tồn tại.' });
        }

        let imageUrl = existing[0].image_url;
        if (req.file) {
            imageUrl = `/uploads/settings/${req.file.filename}`;
        }

        const sortOrder = sort_order !== undefined && sort_order !== '' ? Number(sort_order) : 0;
        const activeFlag = is_active === false || is_active === 'false' || is_active === 0 || is_active === '0' ? false : true;

        await sequelize.query(`
            UPDATE banners
            SET title = ?, image_url = ?, link_url = ?, sort_order = ?, is_active = ?, updated_at = NOW()
            WHERE id = ?
        `, {
            replacements: [title || null, imageUrl, link_url || null, sortOrder, activeFlag, id]
        });

        const [updated] = await sequelize.query('SELECT id, page_key, title, image_url, link_url, sort_order, is_active FROM banners WHERE id = ?', { replacements: [id] });
        res.status(200).json({ success: true, message: 'Cập nhật banner thành công!', data: updated[0] });
    } catch (error) {
        console.error('Update banner error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi cập nhật banner: ' + error.message });
    }
};

// Xóa banner
const deleteBanner = async (req, res) => {
    try {
        const { id } = req.params;
        const [existing] = await sequelize.query('SELECT id FROM banners WHERE id = ?', { replacements: [id] });
        if (!existing || existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Banner không tồn tại.' });
        }

        await sequelize.query('DELETE FROM banners WHERE id = ?', { replacements: [id] });
        res.status(200).json({ success: true, message: 'Xóa banner thành công!' });
    } catch (error) {
        console.error('Delete banner error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi xóa banner: ' + error.message });
    }
};

// Bật/Tắt nhanh banner
const toggleBanner = async (req, res) => {
    try {
        const { id } = req.params;
        const [existing] = await sequelize.query('SELECT id, is_active FROM banners WHERE id = ?', { replacements: [id] });
        if (!existing || existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Banner không tồn tại.' });
        }

        const newStatus = !existing[0].is_active;
        await sequelize.query('UPDATE banners SET is_active = ?, updated_at = NOW() WHERE id = ?', { replacements: [newStatus, id] });

        res.status(200).json({ success: true, message: newStatus ? 'Đã bật banner.' : 'Đã tắt banner.', is_active: newStatus });
    } catch (error) {
        console.error('Toggle banner error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi thay đổi trạng thái banner.' });
    }
};

module.exports = {
    getBanners,
    getBannersByPage,
    createBanner,
    updateBanner,
    deleteBanner,
    toggleBanner
};