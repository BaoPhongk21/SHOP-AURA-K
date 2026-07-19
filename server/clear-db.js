const { sequelize } = require('./src/config/database');

async function clearData() {
    try {
        await sequelize.authenticate();
        console.log('✅ Đã kết nối DB');
        
        const transaction = await sequelize.transaction();

        try {
            console.log('🔄 Đang xoá dữ liệu đơn hàng và liên quan...');
            await sequelize.query('DELETE FROM order_items', { transaction });
            await sequelize.query('DELETE FROM orders', { transaction });
            
            console.log('🔄 Đang xoá dữ liệu khuyến mãi...');
            await sequelize.query('DELETE FROM coupon_attempts', { transaction }).catch(() => {});
            await sequelize.query('DELETE FROM user_coupons', { transaction }).catch(() => {});
            await sequelize.query('DELETE FROM coupons', { transaction });

            console.log('🔄 Đang xoá đánh giá...');
            await sequelize.query('DELETE FROM reviews', { transaction }).catch(() => {});

            console.log('🔄 Đang xoá giỏ hàng...');
            await sequelize.query('DELETE FROM cart_items', { transaction }).catch(() => {});
            await sequelize.query('DELETE FROM carts', { transaction }).catch(() => {});
            
            console.log('🔄 Đang xoá thông báo và liên hệ...');
            await sequelize.query('DELETE FROM notifications', { transaction }).catch(() => {});
            await sequelize.query('DELETE FROM contacts', { transaction }).catch(() => {});
            
            console.log('🔄 Đang xoá người dùng không phải Admin...');
            // Xóa người dùng không phải là admin
            await sequelize.query("DELETE FROM users WHERE role != 'admin' OR role IS NULL", { transaction });

            await transaction.commit();
            console.log('✅ Xoá dữ liệu thành công!');
        } catch (error) {
            await transaction.rollback();
            console.error('❌ Lỗi khi thực thi transaction:', error);
        }
    } catch (err) {
        console.error('❌ Lỗi kết nối DB:', err);
    } finally {
        process.exit();
    }
}

clearData();
