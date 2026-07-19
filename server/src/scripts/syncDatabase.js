const { sequelize } = require('../config/database');
const logger = require('../utils/logger');

const syncDatabaseSchema = async () => {
    try {
        logger.info('Bắt đầu đồng bộ Schema Cơ sở dữ liệu...');

        // Product Schema
        await sequelize.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS sku VARCHAR(255) UNIQUE').catch(() => { });
        await sequelize.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS brand VARCHAR(255)').catch(() => { });
        await sequelize.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT').catch(() => { });
        await sequelize.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE').catch(() => { });
        
        // Category Schema
        await sequelize.query('ALTER TABLE categories ADD COLUMN IF NOT EXISTS slug VARCHAR(255) UNIQUE').catch(() => { });
        await sequelize.query('ALTER TABLE categories ADD COLUMN IF NOT EXISTS description TEXT').catch(() => { });
        await sequelize.query('ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE').catch(() => { });
        await sequelize.query('ALTER TABLE categories ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0').catch(() => { });
        await sequelize.query('ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url VARCHAR(255)').catch(() => { });

        // Order Schema
        await sequelize.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_receipt TEXT').catch(() => { });
        await sequelize.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50)').catch(() => { });
        await sequelize.query('ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check').catch(() => { });
        
        // User Schema
        await sequelize.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE').catch(() => { });
        await sequelize.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT').catch(() => { });
        await sequelize.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS ward VARCHAR(100)').catch(() => { });
        await sequelize.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS district VARCHAR(100)').catch(() => { });
        await sequelize.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(100)').catch(() => { });
        await sequelize.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0').catch(() => { });

        // Role Permissions
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS role_permissions (
                id SERIAL PRIMARY KEY,
                role_name VARCHAR(50) UNIQUE NOT NULL,
                products BOOLEAN DEFAULT false,
                orders BOOLEAN DEFAULT false,
                customers BOOLEAN DEFAULT false,
                reports BOOLEAN DEFAULT false,
                settings BOOLEAN DEFAULT false,
                vouchers BOOLEAN DEFAULT false,
                inventory BOOLEAN DEFAULT false
            )
        `).catch(() => { });
        await sequelize.query('ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS vouchers BOOLEAN DEFAULT false').catch(() => { });
        await sequelize.query('ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS inventory BOOLEAN DEFAULT false').catch(() => { });

        const [[{ rolePermCount }]] = await sequelize.query('SELECT COUNT(*)::int AS "rolePermCount" FROM role_permissions').catch(() => [[{ rolePermCount: 0 }]]);
        if (!rolePermCount) {
            await sequelize.query(`
                INSERT INTO role_permissions (role_name, products, orders, customers, reports, settings, vouchers, inventory) VALUES
                ('Admin', true, true, true, true, true, true, true),
                ('Staff', false, true, true, false, false, false, false)
            `).catch(() => { });
        }

        // User Coupons
        await sequelize.query(`CREATE TABLE IF NOT EXISTS user_coupons (id SERIAL PRIMARY KEY, user_id INTEGER, coupon_id INTEGER, quantity INTEGER DEFAULT 1, UNIQUE(user_id, coupon_id))`).catch(() => {});
        
        // Coupon Attempts
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS coupon_attempts (
                ip_address VARCHAR(45) PRIMARY KEY,
                attempts INTEGER DEFAULT 1,
                last_attempt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `).catch(() => {});

        // Product Reviews
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS product_reviews (
                id SERIAL PRIMARY KEY,
                product_id INTEGER,
                user_id INTEGER,
                rating INTEGER CHECK(rating >= 1 AND rating <= 5),
                comment TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(product_id, user_id)
            )
        `).catch(() => {});

        // Contacts
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS contacts (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                phone VARCHAR(20),
                subject VARCHAR(255),
                message TEXT NOT NULL,
                attachments TEXT,
                status VARCHAR(50) DEFAULT 'new',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `).catch(() => {});

        // Newsletters
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS newsletters (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `).catch(() => {});

        // Brands
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS brands (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                description TEXT,
                logo_url VARCHAR(500),
                tier VARCHAR(50) NOT NULL DEFAULT 'street',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `).catch(() => {});

        // Addresses
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS addresses (
                id SERIAL PRIMARY KEY,
                user_id INTEGER,
                recipient_name VARCHAR(255),
                phone VARCHAR(20),
                address TEXT,
                ward VARCHAR(100),
                district VARCHAR(100),
                city VARCHAR(100),
                is_default BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `).catch(() => {});

        // Banners (Quản lý banner cho từng trang)
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS banners (
                id SERIAL PRIMARY KEY,
                page_key VARCHAR(50) NOT NULL,
                title VARCHAR(255),
                image_url VARCHAR(500) NOT NULL,
                link_url VARCHAR(500),
                sort_order INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `).catch(() => {});

        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_banners_page_key ON banners(page_key)`).catch(() => {});

        // Notifications
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                type VARCHAR(50) DEFAULT 'system',
                link VARCHAR(500),
                is_read BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `).catch(() => {});
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS user_notification_reads (
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                notification_id INTEGER REFERENCES notifications(id) ON DELETE CASCADE,
                read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, notification_id)
            )
        `).catch(() => {});

        logger.info('Đồng bộ Schema Cơ sở dữ liệu hoàn tất.');
    } catch (error) {
        logger.error('Lỗi khi đồng bộ Schema:', error);
    }
};

module.exports = syncDatabaseSchema;
