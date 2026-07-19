const { sequelize } = require('../config/database');
const jwt = require('jsonwebtoken');

const getAdminVouchers = async (req, res) => {
    try {
        const [rawVouchers] = await sequelize.query('SELECT * FROM coupons ORDER BY id DESC');
        const vouchers = rawVouchers.map(v => {
            let status = 'Đang hoạt động';
            const now = new Date();
            const endDate = v.end_date || v.expiry_date;

            if (v.is_active === false || v.is_active === 0) status = 'Tạm khóa';
            else if (endDate && new Date(endDate) < now) status = 'Đã hết hạn';
            else if (v.start_date && new Date(v.start_date) > now) status = 'Đã lên lịch';

            const discountType = v.discount_type === 'percent' || v.discount_percent
                ? 'Phần trăm (%)'
                : v.discount_type === 'freeship'
                    ? 'Freeship (Miễn phí vận chuyển)'
                    : 'Số tiền cố định';
            const discountValue = v.discount_type === 'freeship' ? 0 : (v.discount_value || v.discount_percent || v.value || 0);

            return {
                id: v.id, code: v.code, type: discountType, value: discountValue,
                used: v.current_usage || v.used || 0, usage_limit: v.usage_limit || null,
                status: status, end_date: endDate, raw_type: v.discount_type || (v.discount_percent ? 'percent' : 'fixed'),
                raw_value: discountValue,
                raw_min_order_value: v.min_order_value || 0, raw_start_date: v.start_date,
                raw_end_date: endDate, raw_is_active: !(v.is_active === false || v.is_active === 0),
                max_discount_amount: v.max_discount_amount || null,
                limit_per_user: v.limit_per_user || 1,
                min_rank_required: v.min_rank_required || null
            };
        });

        // Đếm số lượt dùng mã giảm giá trong ngày hôm nay từ đơn hàng thực tế
        let usedToday = 0;
        let totalSaved = 0;
        try {
            const [[todayUsage]] = await sequelize.query(`
                SELECT COUNT(id) as count FROM orders
                WHERE coupon_code IS NOT NULL
                AND DATE(created_at) = CURRENT_DATE
                AND status != 'cancelled'
            `);
            usedToday = parseInt(todayUsage?.count || 0);
        } catch (e) { console.error('Error counting usedToday:', e.message); }

        res.status(200).json({ success: true, data: { vouchers: vouchers, stats: { totalVouchers: vouchers.length, activeVouchers: vouchers.filter(v => v.status === 'Đang hoạt động').length, usedToday: usedToday, totalSaved: totalSaved } } });
    } catch (error) { res.status(500).json({ success: false, message: 'Lỗi server khi lấy danh sách mã giảm giá.' }); }
};

const createAdminVoucher = async (req, res) => {
    try {
        const { code, discount_value, discount_type, min_order_value, start_date, end_date, usage_limit, is_active, min_rank_required, max_discount_amount, limit_per_user } = req.body;

        const [[existing]] = await sequelize.query('SELECT id FROM coupons WHERE code = ?', { replacements: [code] });
        if (existing) return res.status(400).json({ success: false, message: 'Mã giảm giá này đã tồn tại!' });

        await sequelize.query(
            `INSERT INTO coupons (code, discount_value, discount_type, min_order_value, start_date, end_date, usage_limit, is_active, current_usage, max_discount_amount, limit_per_user, min_rank_required) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
            {
                replacements: [
                    code,
                    discount_value,
                    discount_type || 'fixed',
                    min_order_value || 0,
                    start_date || new Date(),
                    end_date,
                    usage_limit || null,
                    is_active !== undefined ? is_active : true,
                    max_discount_amount || null,
                    limit_per_user || 1,
                    min_rank_required || null
                ]
            }
        );
        try {
            await sequelize.query(
                `INSERT INTO notifications (user_id, title, message, type, link) VALUES (NULL, ?, ?, ?, ?)`,
                { replacements: ['Mã giảm giá mới', `Mã giảm giá ${code} vừa được tung ra. Nhanh tay kẻo lỡ!`, 'promotion', '/products'] }
            );
        } catch (e) { console.error('Lỗi tạo thông báo voucher', e); }

        res.status(201).json({ success: true, message: 'Thêm mã giảm giá thành công!' });
    } catch (error) { res.status(500).json({ success: false, message: 'Lỗi server khi thêm mã giảm giá' }); }
};

const updateAdminVoucher = async (req, res) => {
    try {
        const { id } = req.params;
        const { code, discount_value, discount_type, min_order_value, start_date, end_date, usage_limit, is_active, min_rank_required, max_discount_amount, limit_per_user } = req.body;

        const [[existing]] = await sequelize.query('SELECT id FROM coupons WHERE code = ? AND id != ?', { replacements: [code, id] });
        if (existing) return res.status(400).json({ success: false, message: 'Mã giảm giá này đã tồn tại!' });

        await sequelize.query(
            `UPDATE coupons SET code = ?, discount_value = ?, discount_type = ?, min_order_value = ?, start_date = ?, end_date = ?, usage_limit = ?, is_active = ?, max_discount_amount = ?, limit_per_user = ?, min_rank_required = ? WHERE id = ?`,
            {
                replacements: [
                    code,
                    discount_value,
                    discount_type || 'fixed',
                    min_order_value || 0,
                    start_date,
                    end_date,
                    usage_limit || null,
                    is_active !== undefined ? is_active : true,
                    max_discount_amount || null,
                    limit_per_user || 1,
                    min_rank_required || null,
                    id
                ]
            }
        );
        res.status(200).json({ success: true, message: 'Cập nhật mã giảm giá thành công!' });
    } catch (error) { res.status(500).json({ success: false, message: 'Lỗi server khi cập nhật mã giảm giá' }); }
};

const deleteAdminVoucher = async (req, res) => {
    try {
        const { id } = req.params;
        await sequelize.query('DELETE FROM coupons WHERE id = ?', { replacements: [id] });
        res.status(200).json({ success: true, message: 'Xóa mã giảm giá thành công!' });
    } catch (error) { res.status(500).json({ success: false, message: 'Lỗi server khi xóa mã giảm giá' }); }
};

const getPublicVouchers = async (req, res) => {
    try {
        let userId = null;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            const token = req.headers.authorization.split(' ')[1];
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'my_super_secret_key');
                userId = decoded.id;
            } catch (e) { 
                console.log('Token verification failed:', e.message);
            }
        }

        // Tạo bảng user_coupons nếu chưa có
        try {
            await sequelize.query(`CREATE TABLE IF NOT EXISTS user_coupons (id SERIAL PRIMARY KEY, user_id INTEGER, coupon_id INTEGER, quantity INTEGER DEFAULT 1, UNIQUE(user_id, coupon_id))`);
        } catch (tableError) {
            console.error('Error creating user_coupons table:', tableError.message);
        }

        let rawVouchers = [];
        
        // Nếu chưa đăng nhập, không trả về bất kỳ mã giảm giá nào
        if (!userId) {
            return res.status(200).json({ success: true, data: [] });
        }

        // Kiểm tra xem bảng coupons có tồn tại không
        try {
            if (userId) {
                [rawVouchers] = await sequelize.query(`
                    SELECT c.*, COALESCE(uc.quantity, 1) as user_quantity 
                    FROM coupons c LEFT JOIN user_coupons uc ON c.id = uc.coupon_id AND uc.user_id = ?
                    WHERE (
                        uc.id IS NOT NULL 
                        OR (
                            c.is_active = true 
                            AND (c.end_date IS NULL OR c.end_date >= NOW()) 
                            AND (c.usage_limit IS NULL OR c.current_usage < c.usage_limit)
                            AND (
                                c.min_rank_required IS NULL 
                                OR c.min_rank_required = (SELECT rank FROM users WHERE id = ?)
                                OR ((SELECT rank FROM users WHERE id = ?) = 'diamond')
                                OR ((SELECT rank FROM users WHERE id = ?) = 'gold' AND c.min_rank_required IN ('bronze', 'silver', 'gold'))
                                OR ((SELECT rank FROM users WHERE id = ?) = 'silver' AND c.min_rank_required IN ('bronze', 'silver'))
                            )
                        )
                    )
                    ORDER BY c.id DESC
                `, { replacements: [userId, userId, userId, userId, userId] });
            } else {
                [rawVouchers] = await sequelize.query(`
                    SELECT *, 1 as user_quantity FROM coupons 
                    WHERE is_active = true 
                      AND (usage_limit IS NULL OR current_usage < usage_limit) 
                      AND (end_date IS NULL OR end_date >= NOW()) 
                      AND min_rank_required IS NULL
                    ORDER BY id DESC
                `);
            }
        } catch (queryError) {
            console.error('Error querying vouchers:', queryError.message);
            // Nếu bảng coupons chưa tồn tại, trả về mảng rỗng
            if (queryError.message.includes('does not exist') || queryError.message.includes('relation')) {
                return res.status(200).json({ success: true, data: [] });
            }
            throw queryError;
        }

        const vouchers = rawVouchers.map(v => {
            const discountType = v.discount_type || (v.discount_percent ? 'percent' : 'fixed');
            const discountValue = v.discount_type === 'freeship' ? 0 : (v.discount_value || v.discount_percent || v.value || 0);
            return { 
                id: v.id, 
                code: v.code, 
                type: discountType, 
                value: discountValue, 
                min_order_value: v.min_order_value, 
                end_date: v.end_date || v.expiry_date, 
                quantity: v.user_quantity,
                usage_limit: v.usage_limit,
                current_usage: v.current_usage,
                is_active: v.is_active === undefined ? 1 : v.is_active,
                is_used: v.user_quantity <= 0
            };
        });

        res.status(200).json({ success: true, data: vouchers });
    } catch (error) { 
        console.error('getPublicVouchers error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message }); 
    }
};

const giftVoucherToAll = async (req, res) => {
    try {
        const { id } = req.params;
        const { quantity = 1 } = req.body;

        const [[voucher]] = await sequelize.query('SELECT id, code FROM coupons WHERE id = ?', { replacements: [id] });
        if (!voucher) return res.status(404).json({ success: false, message: 'Không tìm thấy mã giảm giá.' });
        const [users] = await sequelize.query("SELECT id FROM users WHERE role = 'customer' OR role IS NULL");

        const t = await sequelize.transaction();
        try {
            for (const user of users) {
                // Lock row if exists to avoid race
                const [[existing]] = await sequelize.query(
                    'SELECT id, quantity FROM user_coupons WHERE user_id = ? AND coupon_id = ? FOR UPDATE',
                    { replacements: [user.id, voucher.id], transaction: t }
                );

                if (existing) {
                    const [meta] = await sequelize.query('UPDATE user_coupons SET quantity = quantity + ? WHERE id = ? RETURNING id', { replacements: [quantity, existing.id], transaction: t });
                    if (!meta || meta.length === 0) {
                        throw new Error('Không thể cập nhật lượt dùng cá nhân cho một hoặc nhiều khách hàng.');
                    }
                } else {
                    try {
                        await sequelize.query('INSERT INTO user_coupons (user_id, coupon_id, quantity) VALUES (?, ?, ?)', { replacements: [user.id, voucher.id, quantity], transaction: t });
                    } catch (insertErr) {
                        // Nếu có race dẫn tới unique violation, cố gắng UPDATE thay thế
                        const [meta2] = await sequelize.query('UPDATE user_coupons SET quantity = quantity + ? WHERE user_id = ? AND coupon_id = ? RETURNING id', { replacements: [quantity, user.id, voucher.id], transaction: t });
                        if (!meta2 || meta2.length === 0) {
                            throw insertErr;
                        }
                    }
                }
            }

            await t.commit();
            res.status(200).json({ success: true, message: `Đã tặng thêm ${quantity} lượt dùng mã ${voucher.code} cho ${users.length} khách hàng!` });
        } catch (e) {
            await t.rollback();
            throw e;
        }
    } catch (error) {
        console.error('Lỗi khi tặng mã giảm giá:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi tặng mã giảm giá.' });
    }
};

const seedVouchers = async () => {
    try {
        const defaultVouchers = [
            { code: 'WELCOME_GOLD', discount_value: 50, discount_type: 'percent', max_discount_amount: 100000, min_rank_required: 'gold', usage_limit: 100, is_active: false },
            { code: 'VIP_SILVER', discount_value: 20, discount_type: 'percent', min_rank_required: 'silver', usage_limit: 200, is_active: false },
            { code: 'BRONZE_GIFT', discount_value: 10000, discount_type: 'fixed', min_rank_required: 'bronze', usage_limit: 500, is_active: false },
            { code: 'DIAMOND_EXCLUSIVE', discount_value: 500000, discount_type: 'fixed', min_order_value: 1000000, min_rank_required: 'diamond', usage_limit: 50, is_active: false },
            { code: 'GOLD_LEVEL_UP', discount_value: 100000, discount_type: 'fixed', min_order_value: 500000, min_rank_required: 'gold', usage_limit: 100, is_active: false }
        ];

        for (const v of defaultVouchers) {
            const [[existing]] = await sequelize.query('SELECT id FROM coupons WHERE code = ?', { replacements: [v.code] });
            if (!existing) {
                await sequelize.query(
                    `INSERT INTO coupons (code, discount_value, discount_type, min_order_value, start_date, end_date, usage_limit, is_active, current_usage, max_discount_amount, limit_per_user, min_rank_required) VALUES (?, ?, ?, ?, NOW(), ?, ?, ?, 0, ?, 1, ?)`,
                    { replacements: [v.code, v.discount_value, v.discount_type, v.min_order_value || 0, new Date('2027-12-31'), v.usage_limit, v.is_active, v.max_discount_amount || null, v.min_rank_required] }
                );
            }
        }
    } catch (e) {
        console.error('Lỗi khi seed vouchers:', e);
    }
};

// seedVouchers(); // Disabled: Seeding happens automatically on first app startup after DB connection

const validateCoupon = async (req, res) => {
    try {
        const { code, subtotal } = req.body;
        if (!code) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập mã giảm giá.' });
        }

        const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.ip || 'unknown';
        
        let userId = null;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            const token = req.headers.authorization.split(' ')[1];
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'my_super_secret_key');
                userId = decoded.id;
            } catch (e) { }
        }

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập để sử dụng mã giảm giá.' });
        }

        // Tạo bảng giới hạn thử sai nếu chưa có
        try {
            await sequelize.query(`
                CREATE TABLE IF NOT EXISTS coupon_attempts (
                    id SERIAL PRIMARY KEY,
                    ip_address VARCHAR(255),
                    user_id INTEGER,
                    code_attempted VARCHAR(100),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            // Dọn dẹp các record cũ hơn 15 phút để nhẹ DB
            await sequelize.query(`DELETE FROM coupon_attempts WHERE created_at < NOW() - INTERVAL '15 minutes'`);
        } catch (tableError) {
            console.error('Error with coupon_attempts table:', tableError.message);
        }

        // Đếm số lần thử sai của IP này trong 15 phút qua
        const [[attemptCount]] = await sequelize.query(
            `SELECT COUNT(*) as count FROM coupon_attempts WHERE ip_address = ? AND created_at >= NOW() - INTERVAL '15 minutes'`,
            { replacements: [ipAddress] }
        );

        if (parseInt(attemptCount.count) >= 5) {
            return res.status(429).json({ 
                success: false, 
                message: 'Bạn đã nhập sai mã quá nhiều lần. Vui lòng thử lại sau 15 phút.' 
            });
        }

        const [[coupon]] = await sequelize.query(
            'SELECT * FROM coupons WHERE UPPER(code) = UPPER(?)',
            { replacements: [String(code).trim()] }
        );

        const recordFailedAttempt = async () => {
            await sequelize.query(
                'INSERT INTO coupon_attempts (ip_address, user_id, code_attempted) VALUES (?, ?, ?)',
                { replacements: [ipAddress, userId || null, String(code).trim()] }
            );
        };

        if (!coupon) {
            await recordFailedAttempt();
            return res.status(400).json({ success: false, message: 'Mã giảm giá không tồn tại.' });
        }

        if (!coupon.is_active || coupon.is_active === 0) {
            await recordFailedAttempt();
            return res.status(400).json({ success: false, message: 'Mã giảm giá đã bị khóa hoặc không hoạt động.' });
        }

        const now = new Date();
        if (coupon.end_date && new Date(coupon.end_date) < now) {
            await recordFailedAttempt();
            return res.status(400).json({ success: false, message: 'Mã giảm giá đã hết hạn.' });
        }
        if (coupon.start_date && new Date(coupon.start_date) > now) {
            return res.status(400).json({ success: false, message: 'Mã giảm giá chưa đến thời gian sử dụng.' });
        }

        // Kiểm tra Hạng thành viên (Rank)
        if (coupon.min_rank_required && userId) {
            const [[userRankInfo]] = await sequelize.query('SELECT rank FROM users WHERE id = ?', { replacements: [userId] });
            const userRank = userRankInfo ? (userRankInfo.rank || 'bronze').toLowerCase() : 'bronze';
            const requiredRank = coupon.min_rank_required.toLowerCase();

            const ranks = ['bronze', 'silver', 'gold', 'diamond'];
            const userRankIndex = ranks.indexOf(userRank);
            const requiredRankIndex = ranks.indexOf(requiredRank);

            if (userRankIndex < requiredRankIndex) {
                return res.status(403).json({
                    success: false,
                    message: `Mã này chỉ dành cho hạng ${requiredRank.toUpperCase()} trở lên. Hạng hiện tại của bạn là ${userRank.toUpperCase()}.`
                });
            }
        }

        if (subtotal !== undefined && coupon.min_order_value && Number(subtotal) < Number(coupon.min_order_value)) {
            return res.status(400).json({ success: false, message: `Đơn hàng chưa đạt mức tối thiểu ${Number(coupon.min_order_value).toLocaleString('vi-VN')}đ để sử dụng mã này.` });
        }

        if (coupon.usage_limit && coupon.current_usage >= coupon.usage_limit) {
            return res.status(400).json({ success: false, message: 'Mã giảm giá đã hết lượt sử dụng hệ thống.' });
        }

        if (userId) {
            const [[userCoupon]] = await sequelize.query(
                'SELECT id, quantity FROM user_coupons WHERE user_id = ? AND coupon_id = ?',
                { replacements: [userId, coupon.id] }
            );

            // Nếu đã từng được tặng và dùng hết
            if (userCoupon && userCoupon.quantity <= 0) {
                return res.status(400).json({ success: false, message: 'Bạn đã hết lượt sử dụng cá nhân cho mã này.' });
            }

            // Nếu chưa từng được tặng (public coupon)
            if (!userCoupon) {
                const [[usageCount]] = await sequelize.query(
                    'SELECT COUNT(*) as count FROM orders WHERE user_id = ? AND UPPER(coupon_code) = UPPER(?) AND status != ?',
                    { replacements: [userId, coupon.code, 'cancelled'] }
                );

                const limitPerUser = coupon.limit_per_user || 1;
                if (parseInt(usageCount.count) >= limitPerUser) {
                    return res.status(400).json({ success: false, message: `Mã này chỉ được sử dụng tối đa ${limitPerUser} lần mỗi khách hàng.` });
                }
            }
        }

        // Chuẩn hóa loại giảm giá và giá trị trả về
        const discountType = coupon.discount_type || (coupon.discount_percent ? 'percent' : 'fixed');
        const discountValue = coupon.discount_type === 'freeship' ? 0 : (coupon.discount_value || coupon.discount_percent || coupon.value || 0);

        res.status(200).json({ 
            success: true, 
            data: {
                id: coupon.id,
                code: coupon.code,
                type: discountType,
                value: discountValue,
                min_order_value: coupon.min_order_value,
                end_date: coupon.end_date || coupon.expiry_date
            },
            message: 'Mã giảm giá hợp lệ.' 
        });

    } catch (error) {
        console.error('Lỗi validateCoupon:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi xác thực mã giảm giá.' });
    }
};

module.exports = { getAdminVouchers, createAdminVoucher, updateAdminVoucher, deleteAdminVoucher, getPublicVouchers, giftVoucherToAll, validateCoupon };