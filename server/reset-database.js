const { sequelize } = require('./src/config/database');

async function resetDatabase() {
    try {
        console.log('🔄 Bắt đầu reset database...\n');
        console.log('⚠️  WARNING: Tất cả dữ liệu sẽ bị XÓA!\n');

        // Xóa tất cả bảng (theo thứ tự để tránh lỗi foreign key)
        console.log('🗑️  Đang xóa các bảng...');
        
        const tables = [
            'order_items',
            'orders',
            'cart_items',
            'carts',
            'reviews',
            'product_variants',
            'product_images',
            'products',
            'categories',
            'sizes',
            'colors',
            'addresses',
            'user_coupons',
            'coupons',
            'users',
            'settings'
        ];

        for (const table of tables) {
            try {
                await sequelize.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
                console.log(`   ✅ Đã xóa bảng: ${table}`);
            } catch (error) {
                console.log(`   ⚠️  Bảng ${table} không tồn tại hoặc đã xóa`);
            }
        }

        console.log('\n✅ Đã xóa tất cả bảng\n');
        
        // Tạo lại bảng
        console.log('🏗️  Đang tạo lại các bảng...\n');
        
        // Users table
        await sequelize.query(`
            CREATE TABLE users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                phone VARCHAR(20),
                role VARCHAR(50) DEFAULT 'customer',
                rank VARCHAR(50) DEFAULT 'bronze',
                avatar VARCHAR(500),
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Tạo bảng users');

        // Categories table
        await sequelize.query(`
            CREATE TABLE categories (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                slug VARCHAR(255) UNIQUE NOT NULL,
                description TEXT,
                image_url VARCHAR(500),
                parent_id INTEGER REFERENCES categories(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Tạo bảng categories');

        // Products table
        await sequelize.query(`
            CREATE TABLE products (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                slug VARCHAR(255) UNIQUE NOT NULL,
                description TEXT,
                price DECIMAL(10, 2) NOT NULL,
                sale_price DECIMAL(10, 2),
                category_id INTEGER REFERENCES categories(id),
                brand VARCHAR(255),
                stock INTEGER DEFAULT 0,
                image_url VARCHAR(500),
                is_featured BOOLEAN DEFAULT false,
                is_active BOOLEAN DEFAULT true,
                views INTEGER DEFAULT 0,
                sold INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Tạo bảng products');

        // Sizes table
        await sequelize.query(`
            CREATE TABLE sizes (
                id SERIAL PRIMARY KEY,
                name VARCHAR(50) UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Tạo bảng sizes');

        // Colors table
        await sequelize.query(`
            CREATE TABLE colors (
                id SERIAL PRIMARY KEY,
                name VARCHAR(50) UNIQUE NOT NULL,
                hex_code VARCHAR(7),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Tạo bảng colors');

        // Product Variants table
        await sequelize.query(`
            CREATE TABLE product_variants (
                id SERIAL PRIMARY KEY,
                product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
                size_id INTEGER REFERENCES sizes(id),
                color_id INTEGER REFERENCES colors(id),
                sku VARCHAR(100) UNIQUE,
                stock_quantity INTEGER DEFAULT 0,
                price DECIMAL(10, 2) NOT NULL DEFAULT 0,
                location VARCHAR(255) DEFAULT 'Khu A',
                min_stock_level INTEGER DEFAULT 5,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Tạo bảng product_variants');

        // Product Images table
        await sequelize.query(`
            CREATE TABLE product_images (
                id SERIAL PRIMARY KEY,
                product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
                image_url VARCHAR(500) NOT NULL,
                is_primary BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Tạo bảng product_images');

        // Coupons table
        await sequelize.query(`
            CREATE TABLE coupons (
                id SERIAL PRIMARY KEY,
                code VARCHAR(50) UNIQUE NOT NULL,
                discount_type VARCHAR(20) NOT NULL,
                discount_value DECIMAL(10, 2),
                discount_percent INTEGER,
                min_order_value DECIMAL(10, 2) DEFAULT 0,
                max_discount DECIMAL(10, 2),
                usage_limit INTEGER,
                current_usage INTEGER DEFAULT 0,
                min_rank_required VARCHAR(50),
                is_active BOOLEAN DEFAULT true,
                start_date TIMESTAMP,
                end_date TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Tạo bảng coupons');

        // User Coupons table
        await sequelize.query(`
            CREATE TABLE user_coupons (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                coupon_id INTEGER REFERENCES coupons(id) ON DELETE CASCADE,
                quantity INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, coupon_id)
            )
        `);
        console.log('✅ Tạo bảng user_coupons');

        // Carts table
        await sequelize.query(`
            CREATE TABLE carts (
                id SERIAL PRIMARY KEY,
                user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Tạo bảng carts');

        // Cart Items table
        await sequelize.query(`
            CREATE TABLE cart_items (
                id SERIAL PRIMARY KEY,
                cart_id INTEGER REFERENCES carts(id) ON DELETE CASCADE,
                product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
                variant_id INTEGER REFERENCES product_variants(id),
                quantity INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Tạo bảng cart_items');

        // Addresses table
        await sequelize.query(`
            CREATE TABLE addresses (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                recipient_name VARCHAR(255) NOT NULL,
                phone VARCHAR(20) NOT NULL,
                province VARCHAR(255) NOT NULL,
                district VARCHAR(255) NOT NULL,
                ward VARCHAR(255) NOT NULL,
                address_detail TEXT NOT NULL,
                is_default BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Tạo bảng addresses');

        // Orders table
        await sequelize.query(`
            CREATE TABLE orders (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                order_number VARCHAR(50) UNIQUE NOT NULL,
                total_amount DECIMAL(10, 2) NOT NULL,
                discount_amount DECIMAL(10, 2) DEFAULT 0,
                shipping_fee DECIMAL(10, 2) DEFAULT 0,
                final_amount DECIMAL(10, 2) NOT NULL,
                payment_method VARCHAR(50),
                payment_status VARCHAR(50) DEFAULT 'pending',
                order_status VARCHAR(50) DEFAULT 'pending',
                shipping_address TEXT,
                recipient_name VARCHAR(255),
                recipient_phone VARCHAR(20),
                note TEXT,
                coupon_code VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Tạo bảng orders');

        // Order Items table
        await sequelize.query(`
            CREATE TABLE order_items (
                id SERIAL PRIMARY KEY,
                order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
                product_id INTEGER REFERENCES products(id),
                variant_id INTEGER REFERENCES product_variants(id),
                product_name VARCHAR(255) NOT NULL,
                quantity INTEGER NOT NULL,
                price DECIMAL(10, 2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Tạo bảng order_items');

        // Reviews table
        await sequelize.query(`
            CREATE TABLE reviews (
                id SERIAL PRIMARY KEY,
                product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                order_id INTEGER REFERENCES orders(id),
                rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
                comment TEXT,
                is_verified BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Tạo bảng reviews');

        // Settings table
        await sequelize.query(`
            CREATE TABLE settings (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255),
                hotline VARCHAR(255),
                address TEXT,
                shipping_fee INTEGER DEFAULT 0,
                map_url TEXT,
                payment_vcb_active BOOLEAN DEFAULT true,
                payment_momo_active BOOLEAN DEFAULT true,
                payment_cod_active BOOLEAN DEFAULT false,
                shipping_ghtk_active BOOLEAN DEFAULT true,
                shipping_ghn_active BOOLEAN DEFAULT false,
                primary_color VARCHAR(50) DEFAULT '#003178',
                theme_mode VARCHAR(50) DEFAULT 'light',
                payment_vcb_qr TEXT,
                payment_momo_qr TEXT,
                flash_sale_end_time TIMESTAMP,
                flash_sale_product_ids TEXT,
                flash_sale_discount INTEGER DEFAULT 20,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Tạo bảng settings');

        console.log('\n✅ Đã tạo tất cả bảng thành công!\n');
        console.log('═══════════════════════════════════════');
        console.log('🎉 RESET DATABASE HOÀN TẤT!\n');
        console.log('📝 Bước tiếp theo: Chạy seed data');
        console.log('   npm run seed-data\n');
        console.log('═══════════════════════════════════════\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Lỗi reset database:', error);
        console.error(error.stack);
        process.exit(1);
    }
}

resetDatabase();
