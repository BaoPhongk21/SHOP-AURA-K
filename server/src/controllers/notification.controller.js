const { sequelize } = require('../config/database');

const getMyNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Lấy thông báo cá nhân (user_id = userId) + thông báo chung (user_id IS NULL)
        const [notifications] = await sequelize.query(`
            SELECT 
                n.id, 
                n.title, 
                n.message, 
                n.type, 
                n.link, 
                n.created_at,
                CASE 
                    WHEN n.user_id IS NOT NULL THEN n.is_read
                    ELSE (SELECT COUNT(*) > 0 FROM user_notification_reads unr WHERE unr.notification_id = n.id AND unr.user_id = ?)
                END as is_read
            FROM notifications n
            WHERE n.user_id = ? OR n.user_id IS NULL
            ORDER BY n.created_at DESC
            LIMIT 50
        `, { replacements: [userId, userId] });

        res.status(200).json({ success: true, data: notifications });
    } catch (error) {
        console.error('Lỗi lấy thông báo:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi lấy thông báo' });
    }
};

const markAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params; // id thông báo

        const [[notification]] = await sequelize.query('SELECT user_id FROM notifications WHERE id = ?', { replacements: [id] });
        
        if (!notification) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo' });
        }

        if (notification.user_id === userId) {
            // Thông báo cá nhân
            await sequelize.query('UPDATE notifications SET is_read = TRUE WHERE id = ?', { replacements: [id] });
        } else if (notification.user_id === null) {
            // Thông báo chung
            await sequelize.query(`
                INSERT INTO user_notification_reads (user_id, notification_id) 
                VALUES (?, ?) ON CONFLICT DO NOTHING
            `, { replacements: [userId, id] });
        }

        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Lỗi markAsRead:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const markAllAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Đánh dấu đọc thông báo cá nhân
        await sequelize.query('UPDATE notifications SET is_read = TRUE WHERE user_id = ?', { replacements: [userId] });

        // Đánh dấu đọc tất cả thông báo chung
        const [globalNotifs] = await sequelize.query('SELECT id FROM notifications WHERE user_id IS NULL');
        for (const n of globalNotifs) {
            await sequelize.query(`
                INSERT INTO user_notification_reads (user_id, notification_id) 
                VALUES (?, ?) ON CONFLICT DO NOTHING
            `, { replacements: [userId, n.id] });
        }

        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Lỗi markAllAsRead:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

module.exports = {
    getMyNotifications,
    markAsRead,
    markAllAsRead
};
