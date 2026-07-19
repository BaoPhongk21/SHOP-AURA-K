const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

const getDashboardStats = async (req, res) => {
    const { timeRange = 'week', date, orderStatus = 'all', startDate: customStart, endDate: customEnd } = req.query;
    try {
        const now = date ? new Date(date) : new Date();
        const localDateString = now.toLocaleDateString('en-CA');

        // Define date bounds based on timeRange
        let startDateStr = '';
        let endDateStr = localDateString;

        const startD = new Date(now);
        if (timeRange === 'day') {
            startDateStr = localDateString;
        } else if (timeRange === 'month') {
            startD.setDate(startD.getDate() - 29); // 30 days
            startDateStr = startD.toLocaleDateString('en-CA');
        } else if (timeRange === 'year') {
            startD.setMonth(0, 1); // Jan 1st
            startDateStr = startD.toLocaleDateString('en-CA');
            const endD = new Date(now);
            endD.setMonth(11, 31); // Dec 31st
            endDateStr = endD.toLocaleDateString('en-CA');
        } else if (timeRange === 'custom' && customStart && customEnd) {
            startDateStr = customStart;
            endDateStr = customEnd;
        } else {
            // week (default - 7 days)
            startD.setDate(startD.getDate() - 6);
            startDateStr = startD.toLocaleDateString('en-CA');
        }

        let totalUsers = 0, totalProducts = 0, totalOrders = 0, totalRevenue = 0, newCustomers = 0;

        try {
            const result = await sequelize.query(`SELECT COUNT(id) as count FROM users WHERE role != 'admin' OR role IS NULL`, { type: QueryTypes.SELECT });
            totalUsers = result[0]?.count || 0;
        } catch (e) { console.error('Error counting users:', e.message); }

        try {
            const result = await sequelize.query(
                `SELECT COUNT(id) as count FROM users WHERE (role = 'customer' OR role IS NULL) AND DATE(created_at) >= :startDate AND DATE(created_at) <= :endDate`,
                { replacements: { startDate: startDateStr, endDate: endDateStr }, type: QueryTypes.SELECT }
            );
            newCustomers = result[0]?.count || 0;
        } catch (e) { console.error('Error counting new customers:', e.message); }

        try {
            const result = await sequelize.query(`SELECT COUNT(id) as count FROM products`, { type: QueryTypes.SELECT });
            totalProducts = result[0]?.count || 0;
        } catch (e) { console.error('Error counting products:', e.message); }

        try {
            const result = await sequelize.query(`
                SELECT COUNT(id) as count FROM orders 
                WHERE (status = 'completed' OR status = 'delivered')
                AND DATE(created_at) >= :startDate AND DATE(created_at) <= :endDate
            `, {
                replacements: { startDate: startDateStr, endDate: endDateStr },
                type: QueryTypes.SELECT
            });
            totalOrders = result[0]?.count || 0;
        } catch (e) { console.error('Error counting orders:', e.message); }

        try {
            const result = await sequelize.query(`
                SELECT COALESCE(SUM(total_amount), 0)::float as revenue FROM orders 
                WHERE (status = 'completed' OR status = 'delivered')
                AND DATE(created_at) >= :startDate AND DATE(created_at) <= :endDate
            `, {
                replacements: { startDate: startDateStr, endDate: endDateStr },
                type: QueryTypes.SELECT
            });
            totalRevenue = result[0]?.revenue || 0;
        } catch (e) { console.error('Error calculating revenue:', e.message); }

        // Fetch recent orders, applying orderStatus filter
        let recentOrders = [];
        try {
            let orderQuery = `
                SELECT o.id, o.total_amount, o.shipping_fee, o.status, o.created_at, o.recipient_name,
                       u.name as user_name, u.email
                FROM orders o
                LEFT JOIN users u ON o.user_id = u.id
                WHERE 1=1
            `;
            const orderReplacements = {};

            if (orderStatus && orderStatus !== 'all') {
                orderQuery += ` AND o.status = :orderStatus`;
                orderReplacements.orderStatus = orderStatus;
            }

            orderQuery += ` ORDER BY o.created_at DESC LIMIT 50`;

            recentOrders = await sequelize.query(orderQuery, {
                replacements: orderReplacements,
                type: QueryTypes.SELECT
            });
        } catch (e) { console.error('Error fetching recent orders:', e.message); }

        // Format recent orders
        const formattedOrders = recentOrders.map(order => {
            const d = new Date(order.created_at || new Date());
            return {
                id: order.id,
                order_code: `#ORD-${String(order.id).padStart(4, '0')}`,
                code: `#ORD-${String(order.id).padStart(4, '0')}`,
                customer_name: order.recipient_name || order.user_name || 'Khách hàng',
                customerName: order.recipient_name || order.user_name || 'Khách hàng',
                customer_email: order.email || 'Không có email',
                email: order.email || 'Không có email',
                total_amount: order.total_amount,
                total: `${Number(order.total_amount || 0).toLocaleString('vi-VN')}đ`,
                subtotal: order.subtotal || 0,
                shippingFee: order.shipping_fee || 0,
                discount: order.discount || 0,
                status: order.status,
                status_text: order.status === 'completed' || order.status === 'delivered' ? 'Thành công' : order.status === 'shipped' ? 'Đang giao' : order.status === 'cancelled' ? 'Đã hủy' : order.status === 'processing' ? 'Đang xử lý' : 'Chờ xác nhận',
                date: d.toLocaleDateString('vi-VN'),
                time: d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                items: []
            };
        });

        // Fetch top products (all time or by date range? let's do by date range for consistency, wait, top products usually is all time or date range? Let's use date range to make timeRange useful)
        let topProducts = [];
        try {
            topProducts = await sequelize.query(`
                SELECT p.id, p.name, p.price, SUM(oi.quantity)::int as total_sold,
                (SELECT image_url FROM product_images pi WHERE pi.product_id = p.id ORDER BY is_primary DESC LIMIT 1) as image_url
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.id 
                JOIN products p ON oi.product_id = p.id
                WHERE (o.status = 'completed' OR o.status = 'delivered')
                AND DATE(o.created_at) >= :startDate AND DATE(o.created_at) <= :endDate
                GROUP BY p.id, p.name, p.price
                ORDER BY total_sold DESC
                LIMIT 5
            `, {
                replacements: { startDate: startDateStr, endDate: endDateStr },
                type: QueryTypes.SELECT
            });
        } catch (e) { console.error('Error fetching top products:', e.message); }

        const formattedTopProducts = topProducts.map(p => {
            // image_url from DB may be like /uploads/products/xxx.jpg - just prepend API_BASE_URL
            let imageUrl = null;
            if (p.image_url) {
                const rawPath = p.image_url;
                if (rawPath.startsWith('http')) {
                    imageUrl = rawPath;
                } else {
                    // Ensure path starts with /
                    const cleanPath = rawPath.startsWith('/') ? rawPath : '/' + rawPath;
                    // /uploads/products/... needs to be served via /api/v1/admin/uploads/...
                    imageUrl = `/api/v1/admin${cleanPath}`;
                }
            }
            return { ...p, image_url: imageUrl, imageUrl };
        });

        // Fetch chart data dynamically based on timeRange
        let chartData = [];
        try {
            // Fetch ALL completed orders in this date range
            const rawOrders = await sequelize.query(`
                SELECT total_amount, created_at 
                FROM orders 
                WHERE DATE(created_at) >= :startDate AND DATE(created_at) <= :endDate 
                AND (status = 'completed' OR status = 'delivered')
            `, {
                replacements: { startDate: startDateStr, endDate: endDateStr },
                type: QueryTypes.SELECT
            });

            const formatDayMonth = (dateObj) => {
                return `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
            };

            if (timeRange === 'day') {
                const buckets = Array(12).fill(0);
                rawOrders.forEach(o => {
                    const h = new Date(o.created_at).getHours();
                    const bucketIdx = Math.floor(h / 2);
                    buckets[bucketIdx] += Number(o.total_amount) || 0;
                });
                chartData = buckets.map((val, idx) => ({
                    name: `${idx * 2}h`,
                    revenue: val
                }));
            } else if (timeRange === 'month') {
                const map = {};
                for (let i = 29; i >= 0; i--) {
                    const d = new Date(now);
                    d.setDate(d.getDate() - i);
                    map[formatDayMonth(d)] = 0;
                }
                rawOrders.forEach(o => {
                    const k = formatDayMonth(new Date(o.created_at));
                    if (map[k] !== undefined) map[k] += Number(o.total_amount) || 0;
                });
                chartData = Object.keys(map).map(k => ({ name: k, revenue: map[k] }));
            } else if (timeRange === 'year') {
                const buckets = Array(12).fill(0);
                rawOrders.forEach(o => {
                    const m = new Date(o.created_at).getMonth();
                    buckets[m] += Number(o.total_amount) || 0;
                });
                chartData = buckets.map((val, idx) => ({
                    name: `T${idx + 1}`,
                    revenue: val
                }));
            } else if (timeRange === 'custom' && customStart && customEnd) {
                // Custom range: group by day
                const map = {};
                const cStart = new Date(customStart);
                const cEnd = new Date(customEnd);
                for (let d = new Date(cStart); d <= cEnd; d.setDate(d.getDate() + 1)) {
                    map[formatDayMonth(new Date(d))] = 0;
                }
                rawOrders.forEach(o => {
                    const k = formatDayMonth(new Date(o.created_at));
                    if (map[k] !== undefined) map[k] += Number(o.total_amount) || 0;
                });
                chartData = Object.keys(map).map(k => ({ name: k, revenue: map[k] }));
            } else {
                // week (7 days)
                const map = {};
                for (let i = 6; i >= 0; i--) {
                    const d = new Date(now);
                    d.setDate(d.getDate() - i);
                    map[formatDayMonth(d)] = 0;
                }
                rawOrders.forEach(o => {
                    const k = formatDayMonth(new Date(o.created_at));
                    if (map[k] !== undefined) map[k] += Number(o.total_amount) || 0;
                });
                chartData = Object.keys(map).map(k => ({ name: k, revenue: map[k] }));
            }
        } catch (e) { console.error('Error fetching chart data:', e.message); }

        let pendingCount = 0;
        try {
            const result = await sequelize.query(`SELECT COUNT(id) as count FROM orders WHERE status = 'pending'`, { type: QueryTypes.SELECT });
            pendingCount = result[0]?.count || 0;
        } catch (e) { }

        const notifications = [];
        if (pendingCount > 0) {
            notifications.push({
                id: `order_${pendingCount}`,
                type: 'order',
                icon: 'local_shipping',
                text: `Có ${pendingCount} đơn hàng mới đang chờ xác nhận`,
                time: "Vừa xong",
                unread: true
            });
        }
        if (notifications.length === 0) {
            notifications.push({
                id: 'system_ok',
                type: 'system',
                icon: 'check_circle',
                text: "Hệ thống đang hoạt động ổn định, chưa có cập nhật mới.",
                time: "Vừa xong",
                unread: false
            });
        }

        res.status(200).json({
            success: true,
            data: {
                stats: {
                    totalRevenue: Number(totalRevenue) || 0,
                    totalOrders: Number(totalOrders) || 0,
                    newCustomers: Number(newCustomers) || 0,
                    totalProducts: Number(totalProducts) || 0
                },
                // Trả về cả 2 key để tương thích với các phiên bản frontend cũ và mới
                chart: chartData,
                chartData: chartData,
                recentOrders: formattedOrders,
                topProducts: formattedTopProducts,
                notifications: notifications
            }
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi lấy thống kê', error: error.message });
    }
};


module.exports = { getDashboardStats };