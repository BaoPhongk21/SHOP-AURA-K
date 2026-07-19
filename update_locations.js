const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const { Sequelize } = require('sequelize');

async function update() {
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
        await sequelize.query("UPDATE warehouse_locations SET code = 'A1' WHERE zone = 'Khu Áo';");
        await sequelize.query("UPDATE warehouse_locations SET code = 'B1' WHERE zone = 'Khu Quần';");
        await sequelize.query("UPDATE warehouse_locations SET code = 'C1' WHERE zone = 'Khu Phụ kiện';");
        await sequelize.query("UPDATE warehouse_locations SET code = 'D1' WHERE zone = 'Khu Sale';");
        console.log('Cập nhật dữ liệu mẫu thành công!');
    } catch (e) {
        console.error('Lỗi update:', e);
    } finally {
        process.exit();
    }
}

update();
