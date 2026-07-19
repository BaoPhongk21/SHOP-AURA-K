const { sequelize } = require('../config/database');
const logger = require('../utils/logger');
const { sendOrderConfirmationEmail } = require('../config/resend');

class OrderService {
    async createOrder(orderData, userId) {
        const t = await sequelize.transaction();
        try {
            const { items, shippingInfo, paymentMethod, appliedCouponCode, shippingFee } = orderData;

            // 1. Tính toán và xác thực giá từ DB (Bản vá bảo mật)
            let secureSubtotal = 0;
            const validatedItems = [];

            // Kiểm tra Flash Sale
            const [[flashSale]] = await sequelize.query(
                "SELECT end_time, is_active FROM flash_sales_config WHERE is_active = true AND end_time > NOW() LIMIT 1"
            );
            const isFlashSaleActive = !!flashSale;

            for (const item of items) {
                const pId = item.id || item.product_id;
                const [[product]] = await sequelize.query('SELECT name, price FROM products WHERE id = ?', { replacements: [pId] });
                if (!product) throw new Error(`Sản phẩm ID ${pId} không tồn tại.`);

                let unitPrice = parseFloat(product.price);
                if (isFlashSaleActive) unitPrice *= 0.8;

                secureSubtotal += unitPrice * (item.quantity || 1);
                validatedItems.push({ ...item, securePrice: unitPrice, secureName: product.name });
            }

            // 2. Xử lý Voucher
            let secureDiscount = 0;
            let validCouponId = null;
            if (appliedCouponCode) {
                const [[coupon]] = await sequelize.query(
                    'SELECT * FROM coupons WHERE UPPER(code) = UPPER(?) AND is_active = true',
                    { replacements: [appliedCouponCode] }
                );
                if (coupon) {
                    validCouponId = coupon.id;
                    secureDiscount = coupon.discount_type === 'percent'
                        ? (secureSubtotal * (coupon.discount_value / 100))
                        : (coupon.discount_type === 'freeship' ? shippingFee : coupon.discount_value);

                    if (coupon.max_discount_amount) secureDiscount = Math.min(secureDiscount, coupon.max_discount_amount);
                }
            }

            const secureFinalTotal = Math.max(0, secureSubtotal + shippingFee - secureDiscount);

            // 3. Tạo bản ghi Order
            const orderNumber = `ORD-${Date.now()}`;
            const [result] = await sequelize.query(
                `INSERT INTO orders (user_id, order_number, total_amount, final_amount, shipping_fee, discount_amount, status, payment_method, shipping_address, recipient_phone, recipient_name, created_at, updated_at) 
                 VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, NOW(), NOW()) RETURNING id`,
                {
                    replacements: [
                        userId, orderNumber, secureFinalTotal, secureFinalTotal, shippingFee, secureDiscount,
                        paymentMethod, shippingInfo.address, shippingInfo.phone, shippingInfo.name
                    ],
                    transaction: t
                }
            );
            const orderId = result[0].id;

            // 4. Lưu items và trừ kho (Atomic Update)
            for (const item of validatedItems) {
                await sequelize.query(
                    'INSERT INTO order_items (order_id, product_id, quantity, unit_price, size, product_name) VALUES (?, ?, ?, ?, ?, ?)',
                    {
                        replacements: [orderId, item.id || item.product_id, item.quantity, item.securePrice, item.size, item.secureName],
                        transaction: t
                    }
                );

                const [updateResult] = await sequelize.query(
                    `UPDATE product_variants SET stock_quantity = stock_quantity - ? 
                     WHERE product_id = ? AND size_id = (SELECT id FROM sizes WHERE name = ? LIMIT 1) AND stock_quantity >= ?`,
                    { replacements: [item.quantity, item.id || item.product_id, item.size, item.quantity], transaction: t }
                );

                if (updateResult.rowCount === 0) {
                    const e = new Error(`Sản phẩm ${item.secureName} (Size ${item.size}) không đủ hàng.`);
                    e.status = 400;
                    throw e;
                }
            }

            // 5. Cập nhật coupon usage (atomic: tăng chỉ khi chưa vượt usage_limit)
            if (validCouponId) {
                const [updateMeta] = await sequelize.query(
                    'UPDATE coupons SET current_usage = current_usage + 1 WHERE id = ? AND (usage_limit IS NULL OR current_usage < usage_limit)',
                    { replacements: [validCouponId], transaction: t, raw: true }
                );

                // PostgreSQL returns metadata.rowCount — nếu không tăng được nghĩa là đã hết lượt
                if (updateMeta && (updateMeta.rowCount === 0 || updateMeta.affectedRows === 0)) {
                    throw new Error('Mã giảm giá vừa mới hết lượt sử dụng. Vui lòng thử mã khác.');
                }
            }

            await t.commit();
            return orderId;
        } catch (error) {
            await t.rollback();
            throw error;
        }
    }
}

module.exports = new OrderService();