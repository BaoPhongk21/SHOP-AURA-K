const { sequelize } = require('../config/database');
const orderService = require('../services/order.service');
const path = require('path');
const { sendOrderConfirmationEmail, sendOrderStatusEmail } = require('../config/resend');

// Helper: Chuẩn hóa đường dẫn ảnh trả về cho client
// Server serve static tại /uploads/, /images/, /static-assets/ nên chỉ cần giữ nguyên path tương đối
const normalizeImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) return imageUrl;
    // Đảm bảo path luôn bắt đầu bằng / để client ghép với API_BASE_URL
    return imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
};

// Helper: Truy vấn và định dạng danh sách sản phẩm trong đơn hàng
const getFormattedOrderItems = async (orderIds) => {
    if (!orderIds || orderIds.length === 0) return {};

    const placeholders = orderIds.map(() => '?').join(',');
    const [orderItems] = await sequelize.query(`
        SELECT oi.order_id, oi.product_id, oi.quantity, oi.price as unit_price, 
               p.name as name, 
               p.price as product_price,
               p.description as product_description,
               v.size_id, s.name as size,
               v.color_id, c.name as color,
               (SELECT image_url FROM product_images pi WHERE pi.product_id = oi.product_id ORDER BY is_primary DESC LIMIT 1) as image_url
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        LEFT JOIN product_variants v ON oi.variant_id = v.id
        LEFT JOIN sizes s ON v.size_id = s.id
        LEFT JOIN colors c ON v.color_id = c.id
        WHERE oi.order_id IN (${placeholders})
    `, { replacements: orderIds });

    const itemsByOrder = {};
    orderItems.forEach(item => {
        if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];

        // Chuẩn hóa image_url về dạng /uploads/... để client build đầy đủ URL
        const imageUrl = normalizeImageUrl(item.image_url);

        itemsByOrder[item.order_id].push({
            ...item,
            image_url: imageUrl,
            image: imageUrl,
            imageUrl: imageUrl,
            price: parseFloat(item.unit_price || item.product_price || 0),
            product_name: item.name,
            productName: item.name,
            description: item.product_description || null,
            size: item.size,
            color: item.color
        });
    });
    return itemsByOrder;
};

const getAdminOrders = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        // Lấy thống kê tổng quát (Chạy truy vấn riêng để chính xác toàn bộ hệ thống)
        const [[stats]] = await sequelize.query(`
            SELECT 
                COUNT(*) as "totalOrders",
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as "newOrders",
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as "cancelledOrders",
                COALESCE(SUM(CASE WHEN status = 'completed' AND date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE) THEN total_amount ELSE 0 END), 0) as "revenueMonth"
            FROM orders
        `);

        const [orders] = await sequelize.query(`
            SELECT 
                o.*,
                u.name as user_name, u.email
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            ORDER BY o.created_at DESC
            LIMIT :limit OFFSET :offset
        `, { replacements: { limit, offset } });

        const orderIds = orders.map(o => o.id);
        const itemsByOrder = await getFormattedOrderItems(orderIds);

        const formattedOrders = orders.map(order => {
            const d = new Date(order.created_at || new Date());
            return {
                id: order.id,
                code: `#ORD-${String(order.id).padStart(4, '0')}`,
                customerName: order.recipient_name || order.user_name || 'Khách hàng',
                email: order.email || 'Không có email',
                date: d.toLocaleDateString('vi-VN'),
                time: d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                created_at: order.created_at,
                total: `${Number(order.total_amount || 0).toLocaleString('vi-VN')}đ`,
                subtotal: Number(order.total_amount || 0) - Number(order.shipping_fee || 0) + Number(order.discount_amount || 0),
                shippingFee: order.shipping_fee || 0,
                discount: order.discount_amount || 0,
                note: order.note || '',
                shippingAddress: order.shipping_address || '',
                phone: order.recipient_phone || '',
                paymentStatus: order.status === 'cancelled' ? 'Đã hủy' : (
                    order.payment_method === 'cod'
                        ? (order.status === 'completed' ? 'Đã thanh toán' : 'Chưa thanh toán (COD)')
                        : (
                            ['processing', 'shipped', 'delivered', 'completed'].includes(order.status)
                                ? 'Đã thanh toán'
                                : (order.payment_receipt ? 'Chờ duyệt biên lai' : 'Chờ chuyển khoản')
                        )
                ),
                status: order.status === 'completed' ? 'Thành công' : order.status === 'delivered' ? 'Đã giao' : order.status === 'at_risk' ? 'Rủi ro' : (order.status === 'cancelled' ? 'Đã hủy' : (order.status === 'shipped' ? 'Đang giao' : (order.status === 'processing' ? 'Đang xử lý' : 'Chờ xác nhận'))),
                raw_status: order.status || 'pending',
                paymentReceipt: order.payment_receipt || null,
                paymentMethod: order.payment_method || 'cod',
                initials: (order.recipient_name || order.user_name || 'C').charAt(0).toUpperCase(),
                bgClass: 'bg-primary-fixed',
                textClass: 'text-primary',
                items: itemsByOrder[order.id] || []
            };
        });

        res.status(200).json({
            success: true,
            data: {
                orders: formattedOrders,
                stats: stats
            }
        });
    } catch (error) {
        console.error('❌ Lỗi getAdminOrders:', error.message, error.stack);
        res.status(500).json({ success: false, message: 'Lỗi server khi lấy danh sách đơn hàng', error: error.message });
    }
};

const updateOrderStatus = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'completed', 'at_risk', 'cancelled'];
        if (!validStatuses.includes(status)) return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });

        // Đảm bảo bảng orders có cột email
        await sequelize.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS email VARCHAR(255)').catch(() => { });

        const [[order]] = await sequelize.query(
            'SELECT o.status, o.user_id, o.coupon_code, o.email, o.order_number, o.total_amount, u.email as user_email FROM orders o LEFT JOIN users u ON o.user_id = u.id WHERE o.id = ?',
            { replacements: [id], transaction: t }
        );
        await sequelize.query('SELECT id FROM orders WHERE id = ? FOR UPDATE', { replacements: [id], transaction: t });
        if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });

        const oldStatus = order.status;
        const [items] = await sequelize.query('SELECT product_id, variant_id, quantity FROM order_items WHERE order_id = ?', { replacements: [id], transaction: t });
        const isStockAlreadyDeducted = oldStatus !== 'cancelled';
        const shouldDeductStockNow = status !== 'cancelled' && !isStockAlreadyDeducted;

        // Tối ưu: Sử dụng atomic update để tránh race condition
        if (shouldDeductStockNow) { // Sử dụng parameterized query cho UPDATE
            for (const item of items) {
                if (!item.variant_id) continue;
                const [, metadata] = await sequelize.query(`
                    UPDATE product_variants SET stock_quantity = stock_quantity - ? 
                    WHERE id = ? AND stock_quantity >= ?
                `, { replacements: [item.quantity, item.variant_id, item.quantity], transaction: t, raw: true });

                if (metadata.rowCount === 0) {
                    const e = new Error(`Sản phẩm ID ${item.product_id} không đủ tồn kho.`);
                    e.status = 400;
                    throw e;
                }
            }
        }
        else if (status === 'cancelled' && isStockAlreadyDeducted) {
            for (const item of items) {
                if (!item.variant_id) continue;
                await sequelize.query(`
                    UPDATE product_variants SET stock_quantity = stock_quantity + ? 
                    WHERE id = ?
                `, { replacements: [item.quantity, item.variant_id], transaction: t });
            }
        }

        await sequelize.query('UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?', {
            replacements: [status, id],
            transaction: t
        });

        // THÊM THÔNG BÁO CHO KHÁCH HÀNG KHI ADMIN CẬP NHẬT TRẠNG THÁI
        if (status !== oldStatus && order.user_id) {
            let notifTitle = 'Cập nhật đơn hàng';
            let notifMessage = `Đơn hàng #${id} của bạn đã được cập nhật.`;
            
            if (status === 'processing') {
                notifTitle = 'Đơn hàng đang xử lý';
                notifMessage = `Đơn hàng #${id} của bạn đang được chúng tôi xử lý.`;
            } else if (status === 'shipped') {
                notifTitle = 'Đơn hàng đang giao';
                notifMessage = `Đơn hàng #${id} của bạn đã được giao cho đơn vị vận chuyển.`;
            } else if (status === 'completed') {
                notifTitle = 'Giao hàng thành công';
                notifMessage = `Đơn hàng #${id} đã giao thành công. Cảm ơn bạn đã mua sắm!`;
            } else if (status === 'cancelled') {
                notifTitle = 'Đơn hàng đã hủy';
                notifMessage = `Đơn hàng #${id} của bạn đã bị hủy.`;
            }

            try {
                await sequelize.query(
                    `INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, ?, ?)`,
                    { 
                        replacements: [order.user_id, notifTitle, notifMessage, 'order', `/account/orders`], 
                        transaction: t 
                    }
                );
            } catch (notifErr) {
                console.error('Lỗi khi gửi thông báo (Admin update status):', notifErr);
            }
        }

        // --- HOÀN LẠI HOẶC TRỪ LẠI MÃ GIẢM GIÁ NẾU ADMIN THAY ĐỔI TRẠNG THÁI HỦY ---
        if (status === 'cancelled' && oldStatus !== 'cancelled') {
            if (order.coupon_code && order.user_id) {
                try { // Sử dụng parameterized query cho UPDATE
                    const [[coupon]] = await sequelize.query('SELECT id FROM coupons WHERE UPPER(code) = UPPER(?)', { replacements: [order.coupon_code] });
                    if (coupon) {
                        try {
                            const [ucRows] = await sequelize.query('UPDATE user_coupons SET quantity = quantity + 1 WHERE user_id = ? AND coupon_id = ? RETURNING id', { replacements: [order.user_id, coupon.id], transaction: t });
                            if (!ucRows || ucRows.length === 0) {
                                console.warn('Warning: user_coupons was not updated when restoring coupon for order', order.id, order.user_id, coupon.id);
                            }
                        } catch (e) { console.warn('Warning updating user_coupons on restore:', e.message); }

                        try {
                            const [couponRows] = await sequelize.query('UPDATE coupons SET current_usage = GREATEST(current_usage - 1, 0) WHERE id = ? RETURNING id', { replacements: [coupon.id], transaction: t });
                            if (!couponRows || couponRows.length === 0) {
                                console.warn('Warning: coupon current_usage was not decremented while restoring order', order.id, coupon.id);
                            }
                        } catch (e) { console.warn('Warning updating coupons on restore:', e.message); }
                    }
                } catch (e) { }
            }
        }
        else if (oldStatus === 'cancelled' && status !== 'cancelled') {
            if (order.coupon_code && order.user_id) { // Sử dụng parameterized query cho UPDATE
                try {
                    const [[coupon]] = await sequelize.query('SELECT id FROM coupons WHERE UPPER(code) = UPPER(?)', { replacements: [order.coupon_code] });
                    if (coupon) {
                        // Giảm lượt user_coupons một cách có điều kiện
                        const [ucRowsDec] = await sequelize.query(
                            'UPDATE user_coupons SET quantity = quantity - 1 WHERE user_id = ? AND coupon_id = ? AND quantity > 0 RETURNING id',
                            { replacements: [order.user_id, coupon.id], transaction: t }
                        );

                        if (!ucRowsDec || ucRowsDec.length === 0) {
                            // Nếu không có lượt user_coupons để giảm, rollback để tránh inconsistency
                            throw new Error('Không đủ lượt cá nhân cho mã giảm giá khi phục hồi đơn.');
                        }

                        // Tăng current_usage một cách có điều kiện (không vượt usage_limit)
                        const [couponRowsInc] = await sequelize.query(
                            'UPDATE coupons SET current_usage = current_usage + 1 WHERE id = ? AND (usage_limit IS NULL OR current_usage < usage_limit) RETURNING id',
                            { replacements: [coupon.id], transaction: t }
                        );

                        if (!couponRowsInc || couponRowsInc.length === 0) {
                            throw new Error('Mã giảm giá đã hết lượt sử dụng khi phục hồi đơn.');
                        }
                    }
                } catch (e) { throw e; }
            }
        }

        // Tự động cộng điểm tích lũy khi đơn hàng khách đã xác nhận thành công (100.000đ = 1 điểm)
        if (status === 'completed' && oldStatus !== 'completed') {
            try {
                const [[orderData]] = await sequelize.query('SELECT user_id, total_amount FROM orders WHERE id = ?', { replacements: [id] }); // Sử dụng parameterized query cho UPDATE
                if (orderData && orderData.user_id) {
                    const pointsToAdd = Math.floor(Number(orderData.total_amount || 0) / 100000);
                    if (pointsToAdd > 0) {
                        await sequelize.query('UPDATE users SET loyalty_points = COALESCE(loyalty_points, 0) + ? WHERE id = ?', { replacements: [pointsToAdd, orderData.user_id], transaction: t });
                    }

                    // Cập nhật hạng (LƯU Ý: Không dùng cột total_spending vì bảng không có)
                    // ... bỏ update total_spending để tránh lỗi ...
                }
            } catch (pointError) {
                console.error('Lỗi khi cộng điểm tích lũy (Admin):', pointError);
            }
        } else if (oldStatus === 'completed' && status !== 'completed') {
            // Trừ điểm nếu chuyển từ completed sang trạng thái khác
            try { // Sử dụng parameterized query cho UPDATE
                const [[orderData]] = await sequelize.query('SELECT user_id, total_amount FROM orders WHERE id = ?', { replacements: [id] });
                if (orderData && orderData.user_id) {
                    const pointsToRemove = Math.floor(Number(orderData.total_amount || 0) / 100000);
                    if (pointsToRemove > 0) {
                        await sequelize.query('UPDATE users SET loyalty_points = GREATEST(COALESCE(loyalty_points, 0) - ?, 0) WHERE id = ?', { replacements: [pointsToRemove, orderData.user_id], transaction: t });
                    }
                }
            } catch (pointError) {
                console.error('Lỗi khi trừ điểm tích lũy (Admin):', pointError);
            }
        }

        await t.commit();

        // Phát sự kiện qua Socket.IO để Client tự động cập nhật
        const io = req.app.get('socketio');
        if (io) {
            if (order.user_id) {
                io.to(`user_${order.user_id}`).emit('order_updated', { orderId: id, status });
            }
            io.emit('admin_order_updated', { orderId: id, status });
        }

        // Gửi email thông báo trạng thái đơn hàng (chạy không đồng bộ, không block response)
        const customerEmail = order.email || order.user_email;
        if (customerEmail && status !== oldStatus) {
            const emailData = {
                orderNumber: order.order_number,
                totalAmount: order.total_amount
            };
            sendOrderStatusEmail(emailData, customerEmail, status).catch(err => {
                console.error('Lỗi gửi email thông báo trạng thái đơn hàng:', err);
            });
        }

        res.status(200).json({ success: true, message: 'Cập nhật trạng thái thành công' });
    } catch (error) {
        if (t) await t.rollback();
        res.status(500).json({ success: false, message: error.message || 'Lỗi server' });
    }
};

const createOrder = async (req, res) => {
    // BẢN VÁ: Khai báo t ở ngoài khối try để có thể rollback trong catch
    let t;
    try {
        let userId = req.user ? req.user.id : null;

        const parseNumber = (val) => {
            if (!val) return 0;
            if (typeof val === 'number') return val;
            return Number(String(val).replace(/[^0-9.-]+/g, ''));
        };

        const items = req.body.items || req.body.cartItems || req.body.orderItems || [];
        const { total_amount, subtotal, shipping_fee, discount } = req.body;
        const finalTotal = parseNumber(total_amount || req.body.totalAmount || req.body.total);
        const finalSubtotal = parseNumber(subtotal || req.body.subTotal);
        const finalShippingFee = parseNumber(shipping_fee || req.body.shippingFee);

        // logic xử lý thông tin người nhận
        const shippingInfo = req.body.shippingInfo || req.body.shipping_info || req.body.customerInfo || {};
        const finalRecipientName = req.body.recipient_name || req.body.recipientName || shippingInfo.recipientName || shippingInfo.name || req.body.name || req.body.customerName || null;
        const finalPhone = req.body.phone || req.body.phoneNumber || shippingInfo.phone || shippingInfo.phoneNumber || null;
        let finalShippingAddress = req.body.shipping_address || req.body.shippingAddress || shippingInfo.address || shippingInfo.fullAddress || req.body.address || req.body.deliveryAddress || null;
        const finalPaymentMethod = req.body.payment_method || req.body.paymentMethod || req.body.paymentType || req.body.payment || 'cod';
        const finalNote = req.body.note || req.body.order_note || req.body.orderNote || shippingInfo.note || null;

        // BẢN VÁ BẢO MẬT: TÍNH TOÁN LẠI SUBTOTAL TỪ DATABASE
        let secureSubtotal = 0;
        const validatedItems = [];

        if (!items || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Giỏ hàng trống.' });
        }

        // Lấy thông tin Flash Sale hiện tại để áp dụng giá chính xác
        let isFlashSaleActive = false;
        try { // Sử dụng parameterized query
            const [[flashSale]] = await sequelize.query("SELECT end_time, is_active FROM flash_sales_config WHERE is_active = true AND end_time > NOW() LIMIT 1");
            if (flashSale) isFlashSaleActive = true;
        } catch (e) { }

        for (const item of items) {
            const pId = item.id || item.productId || item.product_id;
            const [[product]] = await sequelize.query('SELECT name, price FROM products WHERE id = ?', { replacements: [pId] });
            if (!product) return res.status(404).json({ success: false, message: `Sản phẩm ID ${pId} không tồn tại.` }); // Sử dụng parameterized query

            let unitPrice = parseFloat(product.price);
            // BẢN VÁ: Nếu Flash Sale đang diễn ra (Toàn shop theo flash_sales_config), giảm 20%
            if (isFlashSaleActive) {
                unitPrice = unitPrice * 0.8;
            }

            secureSubtotal += unitPrice * (item.quantity || 1);
            validatedItems.push({ ...item, securePrice: unitPrice, secureName: product.name });
        }

        // CHUẨN HÓA MÃ GIẢM GIÁ: Loại bỏ trường hợp chuỗi rỗng hoặc chuỗi "null"/"undefined" từ Frontend
        let appliedCouponCode = req.body.appliedCouponCode || req.body.couponCode || null;
        if (appliedCouponCode === 'null' || appliedCouponCode === 'undefined' ||
            (typeof appliedCouponCode === 'string' && appliedCouponCode.trim() === '')) {
            appliedCouponCode = null;
        }

        // Giải mã JSON string nếu shippingInfo bị chuỗi hóa từ Frontend
        if (!finalShippingAddress && req.body.shippingInfo && typeof req.body.shippingInfo === 'string') {
            try {
                const parsed = JSON.parse(req.body.shippingInfo);
                finalShippingAddress = parsed.address || parsed.fullAddress || parsed.shippingAddress || parsed.deliveryAddress || null;
                if (!finalShippingAddress) {
                    const parts = [parsed.street, parsed.ward, parsed.district, parsed.city, parsed.province].filter(Boolean);
                    if (parts.length > 0) finalShippingAddress = parts.join(', ');
                }
            } catch (e) { }
        }

        // BẢN VÁ TỔNG HỢP: Hợp nhất logic xử lý địa chỉ để đảm bảo không bỏ sót trường hợp nào.
        // Nếu `finalShippingAddress` không phải là một chuỗi hợp lệ (có thể là null, rỗng, hoặc object),
        // tiến hành xây dựng lại nó từ các trường con.
        if (typeof finalShippingAddress !== 'string' || !finalShippingAddress.trim()) {
            // Xác định các nguồn có thể chứa các thành phần địa chỉ (ưu tiên theo thứ tự).
            const sources = [
                (finalShippingAddress && typeof finalShippingAddress === 'object') ? finalShippingAddress : null,
                (shippingInfo && typeof shippingInfo === 'object') ? shippingInfo : null,
                req.body
            ].filter(Boolean); // Lọc bỏ các nguồn không hợp lệ (null).

            // Hàm tìm kiếm một thành phần địa chỉ từ các nguồn.
            const findPart = (keys) => {
                for (const source of sources) {
                    for (const key of keys) {
                        if (source[key] && typeof source[key] === 'string' && source[key].trim()) {
                            return source[key].trim();
                        }
                    }
                }
                return null;
            };

            const addressParts = [findPart(['street', 'address', 'addressLine']), findPart(['ward', 'wardName']), findPart(['district', 'districtName']), findPart(['city', 'province', 'provinceName'])].filter(Boolean);

            if (addressParts.length > 0) {
                finalShippingAddress = addressParts.join(', ');
            } else {
                finalShippingAddress = null; // Nếu không tìm thấy gì, đặt là null để kích hoạt fallback cuối cùng.
            }
        }

        // CỨU CÁNH CUỐI CÙNG (Fallback): Tự động lấy địa chỉ mặc định của User từ Database nếu Payload trống
        if ((!finalShippingAddress || String(finalShippingAddress).trim() === '' || finalShippingAddress === '[object Object]') && userId) {
            try {
                // Đảm bảo bảng users có cột address trước khi truy vấn
                await sequelize.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT').catch(() => { });
                await sequelize.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS district VARCHAR(100)').catch(() => { });
                await sequelize.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(100)').catch(() => { });

                const [[userProfile]] = await sequelize.query('SELECT address, district, city FROM users WHERE id = ?', { replacements: [userId] });
                if (userProfile) {
                    const parts = [userProfile.address, userProfile.district, userProfile.city].filter(part => part && String(part).trim() !== '');
                    if (parts.length > 0) finalShippingAddress = parts.join(', ');
                }
            } catch (e) { }
        }

        // --- KIỂM TRA MÃ GIẢM GIÁ VÀ TÍNH TOÁN BẢO MẬT ---
        let validCouponId = null;
        let calculatedDiscount = 0;
        let activeCouponData = null; // Lưu trữ thông tin coupon để dùng ở phạm vi ngoài // Sử dụng parameterized query

        if (appliedCouponCode && String(appliedCouponCode).trim() !== '') {
            if (!userId) {
                return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập để áp dụng mã giảm giá.' });
            }
            try {
                const [[coupon]] = await sequelize.query(
                    'SELECT * FROM coupons WHERE UPPER(code) = UPPER(?)',
                    { replacements: [String(appliedCouponCode).trim()] }
                );

                if (!coupon) {
                    return res.status(400).json({ success: false, message: 'Mã giảm giá không tồn tại.' });
                }
                activeCouponData = coupon;

                if (!coupon.is_active || coupon.is_active === 0) {
                    return res.status(400).json({ success: false, message: 'Mã giảm giá đã bị khóa hoặc không hoạt động.' });
                }

                const now = new Date();
                if (coupon.end_date && new Date(coupon.end_date) < now) {
                    return res.status(400).json({ success: false, message: 'Mã giảm giá đã hết hạn.' });
                }
                if (coupon.start_date && new Date(coupon.start_date) > now) {
                    return res.status(400).json({ success: false, message: 'Mã giảm giá chưa đến thời gian sử dụng.' });
                }

                // KIỂM TRA HẠNG THÀNH VIÊN (Rank)
                if (coupon.min_rank_required && userId) {
                    const [[userRankInfo]] = await sequelize.query('SELECT rank FROM users WHERE id = ?', { replacements: [userId] }); // Sử dụng parameterized query
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

                if (coupon.min_order_value && secureSubtotal < coupon.min_order_value) {
                    return res.status(400).json({ success: false, message: `Đơn hàng chưa đạt mức tối thiểu ${Number(coupon.min_order_value).toLocaleString('vi-VN')}đ để sử dụng mã này.` });
                }

                if (coupon.usage_limit && coupon.current_usage >= coupon.usage_limit) {
                    return res.status(400).json({ success: false, message: 'Mã giảm giá đã hết lượt sử dụng hệ thống.' });
                }

                if (userId) {
                    const [[userCoupon]] = await sequelize.query(
                        'SELECT id, quantity FROM user_coupons WHERE user_id = ? AND coupon_id = ?', // Sử dụng parameterized query
                        { replacements: [userId, coupon.id] }
                    );

                    // Nếu đã từng dùng, kiểm tra lượt còn lại
                    if (userCoupon && userCoupon.quantity <= 0) {
                        return res.status(400).json({ success: false, message: 'Bạn đã hết lượt sử dụng cá nhân cho mã này.' });
                    }

                    // Nếu chưa từng dùng (đối với mã công khai), kiểm tra limit_per_user của mã đó
                    if (!userCoupon) {
                        // Kiểm tra xem user đã dùng mã này bao nhiêu lần trong bảng orders
                        const [[usageCount]] = await sequelize.query( // Sử dụng parameterized query
                            'SELECT COUNT(*) as count FROM orders WHERE user_id = ? AND coupon_code = ? AND status != ?',
                            { replacements: [userId, coupon.code, 'cancelled'] }
                        );

                        const limitPerUser = coupon.limit_per_user || 1;
                        if (parseInt(usageCount.count) >= limitPerUser) {
                            return res.status(400).json({ success: false, message: `Mã này chỉ được sử dụng tối đa ${limitPerUser} lần mỗi khách hàng.` });
                        }
                    }
                }

                validCouponId = coupon.id;
                // Chuẩn hóa loại giảm giá về chữ thường để so sánh chính xác
                const dType = (coupon.discount_type || (coupon.discount_percent ? 'percent' : 'fixed')).toLowerCase();
                const dValue = Number(coupon.discount_value || coupon.discount_percent || coupon.value || 0);

                if (dType === 'percent') {
                    calculatedDiscount = (secureSubtotal * dValue) / 100;
                    // Áp dụng trần giảm giá (Max Discount Amount)
                    if (coupon.max_discount_amount && calculatedDiscount > coupon.max_discount_amount) {
                        calculatedDiscount = Number(coupon.max_discount_amount);
                    }
                } else if (dType === 'freeship') {
                    calculatedDiscount = finalShippingFee;
                } else {
                    calculatedDiscount = dValue;
                }

                if (calculatedDiscount > secureSubtotal) {
                    calculatedDiscount = secureSubtotal;
                }

            } catch (err) {
                console.error('Lỗi kiểm tra voucher:', err);
                return res.status(500).json({ success: false, message: 'Lỗi server khi xác thực mã giảm giá.' });
            }
        }

        const secureDiscount = validCouponId ? calculatedDiscount : 0;
        const secureFinalTotal = Math.max(0, secureSubtotal + finalShippingFee - secureDiscount);

        // Giao dịch (Transaction) để đảm bảo an toàn dữ liệu
        t = await sequelize.transaction();

        // Thêm đơn hàng mới
        // Sử dụng timestamp + hậu tố ngẫu nhiên để tránh trùng `order_number` khi nhiều request đồng thời
        const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 900000 + 100000)}`;

        // Lấy email của khách hàng (ưu tiên từ user đã đăng nhập, nếu không có thì từ shippingInfo)
        let customerEmail = null;
        if (userId) {
            const [[userData]] = await sequelize.query('SELECT email FROM users WHERE id = ?', { replacements: [userId] });
            if (userData) customerEmail = userData.email;
        }
        if (!customerEmail && shippingInfo && shippingInfo.email) {
            customerEmail = shippingInfo.email;
        }

        // Đảm bảo bảng orders có cột email
        await sequelize.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS email VARCHAR(255)').catch(() => { });

        const [result] = await sequelize.query(
            `INSERT INTO orders (user_id, order_number, total_amount, final_amount, shipping_fee, discount_amount, status, payment_method, shipping_address, recipient_phone, recipient_name, note, coupon_code, email, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
            {
                replacements: [
                    userId || null,
                    orderNumber,
                    secureFinalTotal,
                    secureFinalTotal,
                    finalShippingFee,
                    secureDiscount,
                    finalPaymentMethod,
                    finalShippingAddress,
                    finalPhone,
                    finalRecipientName,
                    finalNote,
                    activeCouponData ? activeCouponData.code : (appliedCouponCode || null),
                    customerEmail,
                    new Date(),
                    new Date()
                ],
                transaction: t
            }
        );
        const orderId = result[0].id;

        // Thêm chi tiết các sản phẩm trong đơn hàng
        for (const item of validatedItems) {
            await sequelize.query(
                'INSERT INTO order_items (order_id, product_id, variant_id, quantity, price, product_name) VALUES (?, ?, ?, ?, ?, ?)',
                {
                    replacements: [
                        orderId,
                        item.id || item.product_id || item.productId,
                        item.variant_id || item.variantId || null,
                        item.quantity || 1,
                        item.securePrice,
                        item.secureName
                    ],
                    transaction: t
                }
            );

            // TỐI ƯU: Trừ kho tạm thời ngay khi đặt đơn (Reserve stock)
            if (item.variant_id || item.variantId) {
                const [updateResult] = await sequelize.query(
                    `UPDATE product_variants SET stock_quantity = stock_quantity - ? 
                     WHERE id = ? AND stock_quantity >= ?`,
                    {
                        replacements: [item.quantity || 1, item.variant_id || item.variantId, item.quantity || 1],
                        transaction: t,
                        raw: true
                    }
                );

                if (updateResult.rowCount === 0) {
                    throw new Error(`Sản phẩm ${item.secureName} đã hết hàng hoặc không đủ số lượng.`);
                }
            }
        }

        // BƯỚC CUỐI: Cập nhật số lượng sử dụng của Voucher nếu có
        if (validCouponId) {
            // Nếu user đã đăng nhập, cập nhật kho voucher cá nhân
            if (userId) {
                const [[userCoupon]] = await sequelize.query( // Sử dụng parameterized query
                    'SELECT id, quantity FROM user_coupons WHERE user_id = ? AND coupon_id = ?',
                    { replacements: [userId, validCouponId], transaction: t }
                );

                if (userCoupon) {
                    if (userCoupon.quantity > 0) {
                        const [ucRows2] = await sequelize.query(
                            'UPDATE user_coupons SET quantity = quantity - 1 WHERE id = ? AND quantity > 0 RETURNING id',
                            { replacements: [userCoupon.id], transaction: t }
                        );
                        if (!ucRows2 || ucRows2.length === 0) {
                            throw new Error('Không đủ lượt mã giảm giá cá nhân. Vui lòng kiểm tra lại.');
                        }
                    } else {
                        throw new Error('Bạn đã hết lượt sử dụng cá nhân cho mã này.');
                    }
                } else {
                    // Nếu khách dùng mã chung (public) lần đầu, tạo bản ghi với số lượt còn lại = limit_per_user - 1
                    const remainingQty = Math.max(0, (activeCouponData?.limit_per_user || 1) - 1);
                    await sequelize.query('INSERT INTO user_coupons (user_id, coupon_id, quantity) VALUES (?, ?, ?)', { replacements: [userId, validCouponId, remainingQty], transaction: t });
                }
            }

            // Luôn tăng lượt dùng chung của mã giảm giá
            const [updatedCouponRows] = await sequelize.query(
                'UPDATE coupons SET current_usage = current_usage + 1 WHERE id = ? AND (usage_limit IS NULL OR current_usage < usage_limit) RETURNING id',
                { replacements: [validCouponId], transaction: t }
            );

            if (!updatedCouponRows || updatedCouponRows.length === 0) {
                throw new Error('Mã giảm giá vừa mới hết lượt sử dụng. Vui lòng thử mã khác.');
            }
        }

        // Xóa các sản phẩm trong giỏ hàng nếu user đã đăng nhập
        if (userId) {
            await sequelize.query('DELETE FROM cart_items WHERE cart_id = (SELECT id FROM carts WHERE user_id = ? LIMIT 1)', { replacements: [userId], transaction: t });
        }

        // QUAN TRỌNG: Commit để chính thức lưu mọi thay đổi vào Database
        await t.commit();

        // Gửi email xác nhận đơn hàng (chạy không đồng bộ, không block response)
        if (customerEmail) {
            const emailData = {
                orderNumber: orderNumber,
                items: validatedItems.map(item => ({
                    productName: item.secureName,
                    size: item.size || 'N/A',
                    quantity: item.quantity || 1,
                    unitPrice: item.securePrice
                })),
                shippingInfo: {
                    name: finalRecipientName,
                    phone: finalPhone,
                    address: finalShippingAddress
                },
                paymentMethod: finalPaymentMethod,
                subtotal: secureSubtotal,
                shippingFee: finalShippingFee,
                discount: secureDiscount,
                totalAmount: secureFinalTotal,
                createdAt: new Date()
            };
            sendOrderConfirmationEmail(emailData, customerEmail).catch(err => {
                console.error('Lỗi gửi email xác nhận đơn hàng:', err);
            });
        }

        if (userId) {
            try {
                await sequelize.query(
                    `INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, ?, ?)`,
                    { replacements: [userId, 'Đặt hàng thành công', `Đơn hàng #ORD-00${orderId} của bạn đã được đặt thành công.`, 'order', '/orders'] }
                );
            } catch (e) { console.error('Lỗi tạo thông báo', e); }
        }

        // Phát sự kiện qua Socket.IO để Client tự động cập nhật
        const io = req.app.get('socketio');
        if (io) {
            if (userId) {
                io.to(`user_${userId}`).emit('order_updated', { orderId, status: 'pending' });
            }
            io.emit('new_order', { orderId });
        }

        res.status(201).json({ success: true, message: 'Đặt hàng thành công!', orderId });
    } catch (error) {
        // BẢN VÁ: Nếu có lỗi thì Rollback để không lưu dữ liệu rác
        if (t) await t.rollback();
        console.error('Lỗi createOrder:', error);
        // In local/test, persist stack trace for debugging (also respect request header)
        try {
            const fs = require('fs');
            const util = require('util');
            const nonProd = process.env.NODE_ENV !== 'production';
            const shouldLog = (nonProd && process.env.SKIP_ORDER_AUTH_FOR_TEST === '1') || process.env.SHOW_ERROR_STACK === '1' || (nonProd && req && req.headers && String(req.headers['x-skip-order-auth'] || '') === '1');
            if (shouldLog) {
                const logDir = path.resolve(__dirname, '../../logs');
                if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
                const orig = error.original ? util.inspect(error.original, { depth: 4 }) : 'N/A';
                const entry = `${new Date().toISOString()} - createOrder error:\nname: ${error.name || ''}\nmessage: ${error.message || ''}\noriginal: ${orig}\nstack:\n${error.stack || ''}\n\n`;
                fs.appendFileSync(path.join(logDir, 'error.log'), entry);
            }
        } catch (logErr) {
            console.error('Failed to write debug error log', logErr);
        }
        // In test/local mode, return the original error message to aid debugging
        if ((process.env.NODE_ENV !== 'production' && process.env.SKIP_ORDER_AUTH_FOR_TEST === '1') || process.env.SHOW_ERROR_STACK === '1') {
            return res.status(500).json({ success: false, message: error.message || 'Lỗi server khi tạo đơn hàng', stack: error.stack });
        }
        res.status(500).json({ success: false, message: 'Lỗi server khi tạo đơn hàng' });
    }
};

const getUserOrders = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Ensure column exists to avoid missing column error
        await sequelize.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_receipt TEXT').catch(() => { });

        const [orders] = await sequelize.query(`
            SELECT id, total_amount, shipping_fee, discount_amount, coupon_code, status, created_at, payment_method, payment_receipt, recipient_phone, recipient_name, shipping_address
            FROM orders WHERE user_id = ? ORDER BY created_at DESC
        `, { replacements: [userId] });

        if (orders.length === 0) {
            return res.status(200).json({ success: true, data: [] });
        }

        const orderIds = orders.map(o => o.id);
        const itemsByOrder = await getFormattedOrderItems(orderIds);

        const formattedOrders = orders.map(order => {
            const items = itemsByOrder[order.id] || [];
            return {
                ...order,
                order_code: `#ORD-00${order.id}`,
                payment_method: order.payment_method || 'cod',
                status_text: order.status === 'completed' ? 'Thành công' : order.status === 'delivered' ? 'Đã giao' : order.status === 'at_risk' ? 'Rủi ro' : (order.status === 'cancelled' ? 'Đã hủy' : (order.status === 'shipped' ? 'Đang giao' : (order.status === 'processing' ? 'Đang xử lý' : 'Chờ xác nhận'))),
                total_items: items.reduce((acc, item) => acc + (item.quantity || 0), 0),
                first_product_name: items.length > 0 ? items[0].product_name : 'No Product',
                first_product_image: items.length > 0 ? items[0].image_url : null,
                items: items
            };
        });
        res.status(200).json({ success: true, data: formattedOrders });
    } catch (error) {
        console.error('❌ Lỗi getUserOrders:', error.message, error.stack);
        res.status(500).json({ success: false, message: 'Lỗi server khi lấy danh sách đơn hàng' });
    }
};

const getOrderById = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ success: false, message: 'ID đơn hàng không hợp lệ' });
        }

        const [orders] = await sequelize.query(`
            SELECT o.*, u.name as user_name, u.phone as user_phone
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            WHERE o.id = ?
        `, { replacements: [id] });

        const order = orders[0];
        if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });

        // Map các trường dữ liệu để khớp với Frontend (OrderDetail.jsx)
        order.customer_name = order.recipient_name || order.user_name || 'Khách hàng';
        order.customer_phone = order.recipient_phone || order.user_phone || 'Chưa cung cấp số điện thoại';
        order.phone = order.recipient_phone || order.user_phone || 'Chưa cung cấp số điện thoại';
        order.shipping_address = order.shipping_address || 'Chưa có thông tin địa chỉ giao hàng';
        order.status_text = order.status === 'completed' ? 'Thành công' : order.status === 'delivered' ? 'Đã giao' : order.status === 'at_risk' ? 'Rủi ro' : (order.status === 'cancelled' ? 'Đã hủy' : (order.status === 'shipped' ? 'Đang giao' : (order.status === 'processing' ? 'Đang xử lý' : 'Chờ xác nhận')));
        order.order_code = `#ORD-00${order.id}`;
        order.payment_method = order.payment_method || 'cod';
        order.discount = order.discount_amount || 0;
        order.subtotal = Number(order.total_amount || 0) - Number(order.shipping_fee || 0) + Number(order.discount_amount || 0);

        // Sử dụng helper đã có để lấy sản phẩm, đảm bảo tính nhất quán với trang danh sách
        const itemsByOrder = await getFormattedOrderItems([id]);
        const items = itemsByOrder[id] || [];

        order.items = items.map(item => ({
            ...item,
            image: item.image_url, // Đã được helper getFormattedOrderItems xử lý COALESCE
        }));

        res.status(200).json({ success: true, data: order });
    } catch (error) {
        console.error('Lỗi lấy chi tiết đơn hàng:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi lấy chi tiết đơn hàng' });
    }
};

const getMyOrders = getUserOrders; // Tạo alias cho getMyOrders để khớp với Router

// Hàm xử lý hủy đơn hàng do khách hàng tự yêu cầu
const cancelOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        await sequelize.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50)').catch(() => { });
        const [[order]] = await sequelize.query('SELECT status, user_id, coupon_code FROM orders WHERE id = ?', { replacements: [id] }); // Sử dụng parameterized query

        if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
        if (String(order.user_id) !== String(userId)) return res.status(403).json({ success: false, message: 'Không có quyền hủy đơn hàng này' });

        // BẢN VÁ: Cho phép hủy khi chưa giao hàng (pending hoặc processing)
        if (order.status !== 'pending' && order.status !== 'processing') {
            return res.status(400).json({ success: false, message: 'Đơn hàng đang giao hoặc đã hoàn thành. Không thể tự hủy, vui lòng liên hệ CSKH.' });
        }

        // BẢN VÁ LOGIC: Hoàn lại kho hàng đã bị trừ tạm thời khi khách hàng tự hủy đơn
        const t = await sequelize.transaction();
        try {
            const [items] = await sequelize.query('SELECT variant_id, quantity FROM order_items WHERE order_id = ?', { replacements: [id], transaction: t });
            for (const item of items) {
                if (!item.variant_id) continue;
                await sequelize.query(
                    'UPDATE product_variants SET stock_quantity = stock_quantity + ? WHERE id = ?',
                    { replacements: [item.quantity, item.variant_id], transaction: t }
                );
            }

            await sequelize.query("UPDATE orders SET status = 'cancelled', updated_at = NOW() WHERE id = ?", { replacements: [id], transaction: t });

            // --- HOÀN LẠI MÃ GIẢM GIÁ NẾU KHÁCH TỰ HỦY ---
            if (order.coupon_code) {
                try {
                    const [[coupon]] = await sequelize.query('SELECT id FROM coupons WHERE UPPER(code) = UPPER(?)', { replacements: [order.coupon_code], transaction: t });
                    if (coupon) {
                        try {
                            const [ucRowsInc] = await sequelize.query('UPDATE user_coupons SET quantity = quantity + 1 WHERE user_id = ? AND coupon_id = ? RETURNING id', { replacements: [userId, coupon.id], transaction: t });
                            if (!ucRowsInc || ucRowsInc.length === 0) {
                                console.warn('Warning: user_coupons not incremented on cancelOrder', id, userId, coupon.id);
                            }
                        } catch (e) { console.warn('Warning updating user_coupons on cancel:', e.message); }

                        try {
                            const [couponRows2] = await sequelize.query('UPDATE coupons SET current_usage = GREATEST(current_usage - 1, 0) WHERE id = ? RETURNING id', { replacements: [coupon.id], transaction: t });
                            if (!couponRows2 || couponRows2.length === 0) {
                                console.warn('Warning: coupon current_usage not decremented on cancelOrder', id, coupon.id);
                            }
                        } catch (e) { console.warn('Warning updating coupons on cancel:', e.message); }
                    }
                } catch (e) { console.error('Lỗi hoàn mã giảm giá', e); }
            }

            await t.commit();
            res.status(200).json({ success: true, message: 'Hủy đơn hàng thành công' });
        } catch (error) {
            await t.rollback();
            console.error('Lỗi cancelOrder:', error);
            res.status(500).json({ success: false, message: 'Lỗi server khi hủy đơn hàng' });
        }
    } catch (error) { res.status(500).json({ success: false, message: 'Lỗi server khi hủy đơn hàng' }); }
};

// Hàm xử lý khách hàng tự xác nhận đã nhận hàng
const markOrderDelivered = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const [[order]] = await sequelize.query('SELECT status, user_id, total_amount FROM orders WHERE id = ? FOR UPDATE', { replacements: [id], transaction: t });

        if (!order) {
            await t.rollback();
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
        }

        if (String(order.user_id) !== String(userId)) {
            await t.rollback();
            return res.status(403).json({ success: false, message: 'Không có quyền thao tác đơn hàng này' });
        }

        if (order.status === 'completed') {
            await t.rollback();
            return res.status(200).json({ success: true, message: 'Đơn hàng đã được xác nhận thành công từ trước.' });
        }

        if (order.status !== 'delivered' && order.status !== 'at_risk') {
            await t.rollback();
            return res.status(400).json({ success: false, message: 'Bạn chỉ có thể xác nhận khi đơn hàng đã được cập nhật trạng thái "Đã giao" hoặc đang xử lý rủi ro.' });
        }

        // Đảm bảo không bị lỗi do constraint cũ của database chặn trạng thái 'completed'
        await sequelize.query('ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check', { transaction: t }).catch(() => { });

        await sequelize.query("UPDATE orders SET status = 'completed', updated_at = NOW() WHERE id = ?", { replacements: [id], transaction: t });

        if (userId) {
            try {
                await sequelize.query(
                    `INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, ?, ?)`,
                    { replacements: [userId, 'Hoàn thành đơn hàng', `Cảm ơn bạn đã xác nhận nhận hàng đơn #ORD-00${id}.`, 'order', '/orders'], transaction: t }
                );
            } catch (e) { 
                // Không log quá chi tiết để tránh rác console, giao dịch sẽ bị abort nếu xảy ra lỗi 
            }
        }

        // --- Tự động tính điểm và hạng trực tiếp, tránh thao tác gây lỗi ---
        try {
            const pointsToAdd = Math.floor(Number(order.total_amount || 0) / 100000);
            if (pointsToAdd > 0) {
                await sequelize.query('UPDATE users SET loyalty_points = COALESCE(loyalty_points, 0) + ? WHERE id = ?', { replacements: [pointsToAdd, userId], transaction: t });
            }
        } catch (pointError) {}

        await t.commit();

        // Phát sự kiện qua Socket.IO để Client Admin tự động cập nhật
        const io = req.app.get('socketio');
        if (io) {
            io.emit('admin_order_updated', { orderId: id, status: 'completed' });
        }

        res.status(200).json({ success: true, message: 'Xác nhận đã nhận hàng thành công' });
    } catch (error) {
        await t.rollback();
        console.error('Lỗi markOrderDelivered:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi cập nhật đơn hàng' });
    }
};

// Hàm xử lý báo cáo rủi ro (Chưa nhận được hàng)
const reportOrderRisk = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const [[order]] = await sequelize.query('SELECT status, user_id FROM orders WHERE id = ?', { replacements: [id] }); // Sử dụng parameterized query
        if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });

        // Chuẩn hóa kiểu để so sánh ID an toàn
        if (String(order.user_id) !== String(userId)) return res.status(403).json({ success: false, message: 'Không có quyền thao tác đơn hàng này' });

        // BẢN VÁ: Tránh lỗi 400 nếu khách hàng lỡ bấm báo cáo nhiều lần
        if (order.status === 'at_risk') {
            return res.status(200).json({ success: true, message: 'Đơn hàng đã được báo cáo rủi ro từ trước.' });
        }

        // BẢN VÁ: Xóa bỏ ràng buộc (constraint) cũ của Database để cho phép lưu các trạng thái mới (completed, at_risk)
        await sequelize.query('ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check').catch(() => { }); // Sử dụng parameterized query

        await sequelize.query("UPDATE orders SET status = 'at_risk', updated_at = NOW() WHERE id = ?", { replacements: [id] }); // Sử dụng parameterized query

        res.status(200).json({ success: true, message: 'Đã báo cáo rủi ro cho quản trị viên!' });
    } catch (error) {
        console.error('Lỗi reportOrderRisk:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi báo cáo đơn hàng' });
    }
};

const confirmPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Sử dụng transaction để cập nhật trạng thái an toàn, nhưng KHÔNG trừ kho ở đây
        // vì kho đã được trừ (reserved) khi tạo đơn hàng (createOrder).
        const t = await sequelize.transaction();
        try {
            const [[order]] = await sequelize.query('SELECT status, user_id FROM orders WHERE id = ?', { replacements: [id], transaction: t }); // Sử dụng parameterized query
            if (!order) {
                await t.rollback();
                return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
            }
            if (String(order.user_id) !== String(userId)) {
                await t.rollback();
                return res.status(403).json({ success: false, message: 'Không có quyền thao tác đơn hàng này' });
            }

            if (order.status !== 'pending') {
                await t.rollback();
                return res.status(400).json({ success: false, message: 'Đơn hàng đã được xử lý hoặc thanh toán trước đó.' });
            }

            await sequelize.query("UPDATE orders SET status = 'processing', updated_at = NOW() WHERE id = ?", { replacements: [id], transaction: t });

            // Tạo thông báo cho user
            try {
                await sequelize.query(
                    `INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, ?, ?)`,
                    { replacements: [userId, 'Xác nhận thanh toán', `Đơn hàng #ORD-00${id} đã được xác nhận thanh toán.`, 'order', '/orders'], transaction: t }
                );
            } catch (notifErr) {
                console.error('Lỗi tạo thông báo khi confirmPayment:', notifErr);
            }

            await t.commit();
            res.status(200).json({ success: true, message: 'Xác nhận thanh toán thành công' });
        } catch (err) {
            if (t) await t.rollback();
            console.error('Lỗi confirmPayment (transaction):', err);
            res.status(500).json({ success: false, message: 'Lỗi server khi xác nhận thanh toán' });
        }
    } catch (error) {
        console.error('Lỗi confirmPayment:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi xác nhận thanh toán' });
    }
};

const uploadReceipt = async (req, res) => {
    try {
        const sharp = require('sharp');
        const fs = require('fs');
        const { id } = req.params;
        const userId = req.user.id;

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Vui lòng cung cấp ảnh hóa đơn chuyển khoản.' });
        }

        const [[order]] = await sequelize.query('SELECT status, user_id FROM orders WHERE id = ?', { replacements: [id] });
        if (!order) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng.' });
        }

        if (String(order.user_id) !== String(userId)) {
            return res.status(403).json({ success: false, message: 'Không có quyền thao tác đơn hàng này.' });
        }

        // Tối ưu hóa ảnh biên lai
        const originalPath = req.file.path;
        const newFilename = `${path.parse(req.file.filename).name}.webp`;
        const newPath = path.join(path.dirname(originalPath), newFilename);

        await sharp(originalPath)
            .resize({ width: 800, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 75 }) // Chất lượng thấp hơn một chút cho biên lai
            .toFile(newPath);

        fs.unlinkSync(originalPath); // Xóa file gốc

        const receiptPath = `/uploads/receipts/${newFilename}`;

        // Ensure column exists to avoid missing column error
        await sequelize.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_receipt TEXT').catch(() => { });

        // Lưu đường dẫn ảnh vào CSDL
        await sequelize.query('UPDATE orders SET payment_receipt = ?, updated_at = NOW() WHERE id = ?', {
            replacements: [receiptPath, id]
        });

        res.status(200).json({
            success: true,
            message: 'Tải ảnh hóa đơn thành công! Vui lòng chờ quản trị viên xác nhận.',
            receiptUrl: receiptPath
        });
    } catch (error) {
        console.error('Lỗi uploadReceipt:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi tải ảnh hóa đơn.' });
    }
};

// Khởi tạo sẵn các hàm VNPay (tránh lỗi Node.js crash do undefined route)
const retryPayment = async (req, res) => { res.status(200).json({ success: true, message: 'Tính năng thanh toán lại đang được phát triển', paymentUrl: '#' }); };
const vnpayIpn = async (req, res) => { res.status(200).json({ RspCode: '00', Message: 'Success' }); };
const vnpayReturn = async (req, res) => { res.status(200).json({ success: true, message: 'Giao dịch VNPay hoàn tất' }); };

const requestRepayment = async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Chỉ Admin mới có quyền thực hiện hành động này.' });
        }
        const { id } = req.params;
        const [[order]] = await sequelize.query('SELECT status, payment_method FROM orders WHERE id = ?', { replacements: [id] });
        if (!order) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
        }

        // Đưa trạng thái về pending và reset ảnh biên lai để bắt buộc thanh toán lại
        await sequelize.query("UPDATE orders SET payment_receipt = NULL, status = 'pending', updated_at = NOW() WHERE id = ?", {
            replacements: [id]
        });

        res.status(200).json({
            success: true,
            message: 'Đã yêu cầu khách hàng thanh toán lại thành công.'
        });
    } catch (error) {
        console.error('Lỗi khi yêu cầu thanh toán lại:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi yêu cầu thanh toán lại.' });
    }
};

module.exports = {
    getAdminOrders, updateOrderStatus, createOrder, getUserOrders, getAllOrders: getUserOrders, getOrderById,
    getMyOrders, cancelOrder, markOrderDelivered, reportOrderRisk, retryPayment, vnpayIpn, vnpayReturn, confirmPayment, uploadReceipt,
    requestRepayment
};