const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const { Sequelize } = require('sequelize');

async function seed() {
    const dbPassword = process.env.DB_PASSWORD != null ? String(process.env.DB_PASSWORD) : undefined;
    const sequelize = new Sequelize(
        process.env.DB_NAME, 
        process.env.DB_USER, 
        dbPassword, 
        {
            host: process.env.DB_HOST,
            port: process.env.DB_PORT || 5432,
            dialect: 'postgres',
            logging: false,
        }
    );

    try {
        await sequelize.query('DELETE FROM warehouse_locations;');
        await sequelize.query(`
            INSERT INTO warehouse_locations (zone, shelf, description) 
            VALUES 
            ('Khu Áo', 'Áo thun, Sơ mi, Hoodie', 'Kệ lưu trữ chuyên dụng cho các mặt hàng áo'), 
            ('Khu Quần', 'Quần Jean, Kaki, Short', 'Khu vực lưu trữ các mặt hàng quần thời trang'), 
            ('Khu Phụ kiện', 'Thắt lưng, Ví, Giày', 'Tủ kính và kệ nhỏ trưng bày phụ kiện'), 
            ('Khu Sale', 'Hàng tồn cần xả', 'Khu vực gom hàng giảm giá cuối năm')
        `);
        console.log('Cập nhật dữ liệu Khu Vực mẫu thành công!');
    } catch (e) {
        console.error('Lỗi seed:', e);
    } finally {
        process.exit();
    }
}

seed();
