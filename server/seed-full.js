/**
 * FULL SEED SCRIPT - Shop Quan Ao
 * Reset + Tạo lại toàn bộ database với đầy đủ dữ liệu
 * Chạy: node server/seed-full.js
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { sequelize } = require('./src/config/database');
const bcrypt = require('bcryptjs');

async function seedFull() {
    try {
        console.log('🔄 Bắt đầu seed đầy đủ dữ liệu...\n');

        // =============================================
        // BƯỚC 1: XÓA & TẠO LẠI CÁC BẢNG
        // =============================================
        console.log('🗑️  Xóa dữ liệu cũ...');

        const tablesToClean = [
            'user_notification_reads', 'notifications', 'role_permissions',
            'order_items', 'orders', 'cart_items', 'carts',
            'reviews', 'product_reviews', 'product_variants', 'product_images',
            'products', 'categories', 'sizes', 'colors', 'addresses',
            'user_coupons', 'coupons', 'users', 'settings', 'contacts'
        ];

        for (const table of tablesToClean) {
            await sequelize.query(`DROP TABLE IF EXISTS ${table} CASCADE`).catch(() => {});
        }
        console.log('✅ Đã xóa dữ liệu cũ\n');

        // =============================================
        // BƯỚC 2: TẠO LẠI CÁC BẢNG
        // =============================================
        console.log('🏗️  Tạo lại các bảng...');

        await sequelize.query(`
            CREATE TABLE users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                username VARCHAR(100) UNIQUE,
                password VARCHAR(255),
                phone VARCHAR(20),
                role VARCHAR(50) DEFAULT 'customer',
                rank VARCHAR(50) DEFAULT 'bronze',
                avatar VARCHAR(500),
                is_active BOOLEAN DEFAULT true,
                phone_verified BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('  ✅ Bảng users');

        await sequelize.query(`
            CREATE TABLE categories (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                slug VARCHAR(255) UNIQUE NOT NULL,
                description TEXT,
                image_url VARCHAR(500),
                is_active BOOLEAN DEFAULT true,
                sort_order INTEGER DEFAULT 0,
                parent_id INTEGER REFERENCES categories(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('  ✅ Bảng categories');

        await sequelize.query(`
            CREATE TABLE products (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                slug VARCHAR(255) UNIQUE NOT NULL,
                sku VARCHAR(255) UNIQUE,
                description TEXT,
                price DECIMAL(12, 2) NOT NULL,
                sale_price DECIMAL(12, 2),
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
        console.log('  ✅ Bảng products');

        await sequelize.query(`
            CREATE TABLE sizes (
                id SERIAL PRIMARY KEY,
                name VARCHAR(50) UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('  ✅ Bảng sizes');

        await sequelize.query(`
            CREATE TABLE colors (
                id SERIAL PRIMARY KEY,
                name VARCHAR(50) UNIQUE NOT NULL,
                hex_code VARCHAR(7),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('  ✅ Bảng colors');

        await sequelize.query(`
            CREATE TABLE product_variants (
                id SERIAL PRIMARY KEY,
                product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
                size_id INTEGER REFERENCES sizes(id),
                color_id INTEGER REFERENCES colors(id),
                sku VARCHAR(100) UNIQUE,
                stock_quantity INTEGER DEFAULT 0,
                price DECIMAL(12, 2) DEFAULT 0,
                location VARCHAR(255) DEFAULT 'Khu A',
                min_stock_level INTEGER DEFAULT 5,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('  ✅ Bảng product_variants');

        await sequelize.query(`
            CREATE TABLE product_images (
                id SERIAL PRIMARY KEY,
                product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
                image_url VARCHAR(500) NOT NULL,
                alt_text VARCHAR(255),
                is_primary BOOLEAN DEFAULT false,
                sort_order INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('  ✅ Bảng product_images');

        await sequelize.query(`
            CREATE TABLE coupons (
                id SERIAL PRIMARY KEY,
                code VARCHAR(50) UNIQUE NOT NULL,
                discount_type VARCHAR(20) NOT NULL,
                discount_value DECIMAL(12, 2),
                min_order_value DECIMAL(12, 2) DEFAULT 0,
                max_discount_amount DECIMAL(12, 2),
                usage_limit INTEGER,
                current_usage INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT true,
                start_date TIMESTAMP,
                end_date TIMESTAMP,
                limit_per_user INTEGER DEFAULT 1,
                min_rank_required VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('  ✅ Bảng coupons');

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
        console.log('  ✅ Bảng user_coupons');

        await sequelize.query(`
            CREATE TABLE carts (
                id SERIAL PRIMARY KEY,
                user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('  ✅ Bảng carts');

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
        console.log('  ✅ Bảng cart_items');

        await sequelize.query(`
            CREATE TABLE addresses (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                recipient_name VARCHAR(255) NOT NULL,
                phone VARCHAR(20) NOT NULL,
                province VARCHAR(255),
                district VARCHAR(255),
                ward VARCHAR(255),
                address_detail TEXT,
                is_default BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('  ✅ Bảng addresses');

        await sequelize.query(`
            CREATE TABLE orders (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                order_number VARCHAR(50) UNIQUE NOT NULL,
                total_amount DECIMAL(12, 2) NOT NULL,
                discount_amount DECIMAL(12, 2) DEFAULT 0,
                shipping_fee DECIMAL(12, 2) DEFAULT 0,
                final_amount DECIMAL(12, 2) NOT NULL,
                payment_method VARCHAR(50),
                payment_status VARCHAR(50) DEFAULT 'pending',
                status VARCHAR(50) DEFAULT 'pending',
                shipping_address TEXT,
                recipient_name VARCHAR(255),
                recipient_phone VARCHAR(20),
                note TEXT,
                coupon_code VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('  ✅ Bảng orders');

        await sequelize.query(`
            CREATE TABLE order_items (
                id SERIAL PRIMARY KEY,
                order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
                product_id INTEGER REFERENCES products(id),
                variant_id INTEGER REFERENCES product_variants(id),
                product_name VARCHAR(255) NOT NULL,
                quantity INTEGER NOT NULL,
                price DECIMAL(12, 2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('  ✅ Bảng order_items');

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
        console.log('  ✅ Bảng reviews');

        await sequelize.query(`
            CREATE TABLE product_reviews (
                id SERIAL PRIMARY KEY,
                product_id INTEGER,
                user_id INTEGER,
                rating INTEGER,
                comment TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('  ✅ Bảng product_reviews');

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
        console.log('  ✅ Bảng settings');

        await sequelize.query(`
            CREATE TABLE contacts (
                id SERIAL PRIMARY KEY, 
                name VARCHAR(255), 
                email VARCHAR(255), 
                phone VARCHAR(50), 
                subject VARCHAR(255),
                message TEXT, 
                attachments TEXT, 
                is_read BOOLEAN DEFAULT FALSE, 
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('  ✅ Bảng contacts');

        await sequelize.query(`
            CREATE TABLE notifications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                type VARCHAR(50) DEFAULT 'system',
                link VARCHAR(500),
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('  ✅ Bảng notifications');

        await sequelize.query(`
            CREATE TABLE user_notification_reads (
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                notification_id INTEGER REFERENCES notifications(id) ON DELETE CASCADE,
                read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, notification_id)
            )
        `);
        console.log('  ✅ Bảng user_notification_reads');

        await sequelize.query(`
            CREATE TABLE role_permissions (
                role_name VARCHAR(50) PRIMARY KEY,
                products BOOLEAN DEFAULT FALSE,
                orders BOOLEAN DEFAULT FALSE,
                customers BOOLEAN DEFAULT FALSE,
                reports BOOLEAN DEFAULT FALSE,
                settings BOOLEAN DEFAULT FALSE,
                vouchers BOOLEAN DEFAULT FALSE,
                inventory BOOLEAN DEFAULT FALSE
            )
        `);
        await sequelize.query(`
            INSERT INTO role_permissions (role_name, products, orders, customers, reports, settings, vouchers, inventory)
            VALUES
                ('Admin', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
                ('Staff', FALSE, TRUE, TRUE, FALSE, FALSE, FALSE, FALSE)
        `);
        console.log('  ✅ Bảng role_permissions\n');

        // =============================================
        // BƯỚC 3: SEED USERS
        // =============================================
        console.log('👤 Tạo tài khoản...');
        const seedPassword = process.env.SEED_DEFAULT_PASSWORD;
        const seedAdminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@shopquanao.com';
        if (!seedPassword) {
            throw new Error('SEED_DEFAULT_PASSWORD is required before seeding users');
        }
        const hashedPassword = await bcrypt.hash(seedPassword, 10);
        await sequelize.query(`
            INSERT INTO users (name, email, username, password, phone, role, rank, is_active, created_at, updated_at)
            VALUES 
                ('Admin', :seedAdminEmail, 'admin', '${hashedPassword}', '0123456789', 'admin', 'platinum', true, NOW(), NOW()),
                ('Khách hàng mẫu', 'customer@example.com', 'customer', '${hashedPassword}', '0987654321', 'customer', 'silver', true, NOW(), NOW()),
                ('Nguyễn Văn An', 'nguyenvanan@gmail.com', 'vanan', '${hashedPassword}', '0912345678', 'customer', 'bronze', true, NOW(), NOW())
            ON CONFLICT (email) DO NOTHING
        `, { replacements: { seedAdminEmail } });
        console.log('✅ Đã tạo 3 users\n');
        console.log('  Tài khoản mẫu đã dùng mật khẩu từ SEED_DEFAULT_PASSWORD');

        // =============================================
        // BƯỚC 4: SEED CATEGORIES
        // =============================================
        console.log('📁 Tạo danh mục sản phẩm...');
        await sequelize.query(`
            INSERT INTO categories (name, slug, description, image_url, is_active, sort_order, created_at, updated_at)
            VALUES 
                ('Áo', 'ao', 'Áo thời trang nam nữ đa dạng kiểu dáng', '/static-assets/aovahoodi.jpg', true, 1, NOW(), NOW()),
                ('Quần', 'quan', 'Quần thời trang nam nữ nhiều phong cách', '/static-assets/quandai.jpg', true, 2, NOW(), NOW()),
                ('Váy & Đầm', 'vay-dam', 'Váy và đầm nữ thời thượng', '/static-assets/vayvadam.jpg', true, 3, NOW(), NOW()),
                ('Phụ Kiện', 'phu-kien', 'Phụ kiện thời trang cao cấp', '/static-assets/thuonghieu.jpg', true, 4, NOW(), NOW())
            ON CONFLICT (slug) DO NOTHING
        `);
        console.log('✅ Đã tạo 4 categories\n');

        // =============================================
        // BƯỚC 5: SEED SIZES & COLORS
        // =============================================
        await sequelize.query(`
            INSERT INTO sizes (name, created_at, updated_at) VALUES 
                ('S', NOW(), NOW()), ('M', NOW(), NOW()), ('L', NOW(), NOW()),
                ('XL', NOW(), NOW()), ('XXL', NOW(), NOW())
            ON CONFLICT (name) DO NOTHING
        `);

        await sequelize.query(`
            INSERT INTO colors (name, hex_code, created_at, updated_at) VALUES 
                ('Đen', '#000000', NOW(), NOW()),
                ('Trắng', '#FFFFFF', NOW(), NOW()),
                ('Xanh Biển', '#007FFF', NOW(), NOW()),
                ('Đỏ', '#FF0000', NOW(), NOW()),
                ('Xanh Lục', '#00FF00', NOW(), NOW()),
                ('Xám', '#808080', NOW(), NOW()),
                ('Be', '#F5F5DC', NOW(), NOW()),
                ('Nâu', '#8B4513', NOW(), NOW()),
                ('Hồng', '#FFC0CB', NOW(), NOW()),
                ('Vàng', '#FFD700', NOW(), NOW())
            ON CONFLICT (name) DO NOTHING
        `);
        console.log('✅ Đã tạo 5 sizes và 10 colors\n');

        // =============================================
        // BƯỚC 6: SEED PRODUCTS
        // =============================================
        console.log('🛍️  Tạo sản phẩm...');

        // NIKE PRODUCTS
        const nikeProducts = [
            ['Nike Tech Fleece Hoodie', 'nike-tech-fleece-hoodie', 'ao', 1500000, 1350000, 'Áo hoodie Nike Tech Fleece cao cấp, chất liệu cotton pha polyester, thiết kế hiện đại, giữ ấm tốt', '/static-assets/nike-tech-fleece-hoodie.jpg', true, 50],
            ['Nike Sportswear Pants', 'nike-sportswear-pants', 'quan', 980000, null, 'Quần thể thao Nike Sportswear, chất liệu thấm hút mồ hôi tốt, co giãn 4 chiều', '/static-assets/nike-sportswear-pants.jpg', true, 60],
            ['Nike Pro Leggings', 'nike-pro-leggings', 'quan', 750000, null, 'Quần legging Nike Pro cho nữ, chất liệu Dri-FIT thấm hút mồ hôi, ôm body tôn dáng', '/static-assets/nike-pro-leggings.jpg', false, 70],
            ['Nike Dri-FIT Academy', 'nike-dri-fit-academy', 'ao', 650000, null, 'Áo thun thể thao Nike Dri-FIT Academy, công nghệ thấm hút vượt trội, phù hợp tập luyện', '/static-assets/nike-dri-fit-academy.jpg', false, 80],
            ['Nike Heritage Backpack', 'nike-heritage-backpack', 'phu-kien', 890000, null, 'Ba lô Nike Heritage, thiết kế đơn giản, nhiều ngăn tiện dụng, phù hợp đi học và dạo phố', '/static-assets/nike-heritage-backpack.jpg', false, 45],
        ];

        const adidasProducts = [
            ['Adidas Essentials Tee', 'adidas-essentials-tee', 'ao', 450000, null, 'Áo thun Adidas Essentials basic, chất cotton 100%, thấm hút tốt, form regular fit', '/static-assets/adidas-essentials-tee.jpg', true, 100],
            ['Adidas Tiro 23 Pants', 'adidas-tiro-23-pants', 'quan', 890000, null, 'Quần thể thao Adidas Tiro 23, thiết kế iconic với 3 sọc đặc trưng, chất liệu thoáng khí', '/static-assets/adidas-tiro-23-pants.jpg', false, 75],
            ['Adidas Windbreaker', 'adidas-windbreaker', 'ao', 1200000, 1080000, 'Áo khoác gió Adidas, chất liệu chống nước nhẹ, có mũ trùm, phù hợp thời tiết se lạnh', '/static-assets/adidas-windbreaker.jpg', true, 40],
            ['Adidas Techfit Top', 'adidas-techfit-top', 'ao', 780000, null, 'Áo thể thao Adidas Techfit, ôm body, hỗ trợ cơ bắp, phù hợp tập gym và chạy bộ', '/static-assets/adidas-techfit-top.jpg', false, 60],
            ['Adidas Baseball Cap', 'adidas-baseball-cap', 'phu-kien', 350000, null, 'Mũ lưỡi trai Adidas, chất liệu cotton thoáng mát, điều chỉnh size linh hoạt', '/static-assets/adidas-baseball-cap.jpg', false, 120],
        ];

        const gucciProducts = [
            ['Gucci Logo Tee', 'gucci-logo-tee', 'ao', 8500000, null, 'Áo thun Gucci cao cấp với logo thương hiệu nổi bật, chất cotton premium, thiết kế sang trọng', '/static-assets/gucci-logo-tee.jpg', true, 15],
            ['Gucci Silk Skirt', 'gucci-silk-skirt', 'vay-dam', 15000000, null, 'Váy lụa Gucci cao cấp, chất liệu silk 100%, thiết kế tinh tế, phù hợp dự tiệc và sự kiện', '/static-assets/gucci-silk-skirt.jpg', true, 8],
            ['Gucci Oxford Shirt', 'gucci-oxford-shirt', 'ao', 12000000, null, 'Áo sơ mi Gucci Oxford, chất liệu cotton cao cấp, form fitted thanh lịch, phù hợp công sở', '/static-assets/gucci-oxford-shirt.jpg', false, 12],
            ['Gucci Silk Scarf', 'gucci-silk-scarf', 'phu-kien', 7500000, null, 'Khăn lụa Gucci họa tiết đặc trưng, chất liệu silk mềm mại, điểm nhấn sang trọng', '/static-assets/gucci-silk-scarf.jpg', false, 20],
            ['Gucci Marmont Belt', 'gucci-marmont-belt', 'phu-kien', 18000000, null, 'Thắt lưng Gucci Marmont da thật, khóa GG logo iconic, phụ kiện hoàn hảo', '/static-assets/gucci-marmont-belt.jpg', true, 10],
        ];

        const zaraProducts = [
            ['Zara Leather Jacket', 'zara-leather-jacket', 'ao', 2500000, 2200000, 'Áo khoác da Zara phong cách biker, thiết kế trẻ trung, chất liệu da tổng hợp cao cấp', '/static-assets/zara-leather-jacket.jpg', true, 30],
            ['Zara Slim Chinos', 'zara-slim-chinos', 'quan', 780000, null, 'Quần kaki Zara slim fit, chất liệu cotton cao cấp, phù hợp đi làm và dạo phố', '/static-assets/zara-slim-chinos.jpg', false, 65],
            ['Zara Floral Midi Dress', 'zara-floral-midi', 'vay-dam', 1200000, null, 'Váy midi Zara họa tiết hoa, thiết kế nữ tính, chất liệu voan nhẹ nhàng', '/static-assets/zara-floral-midi.jpg', false, 40],
            ['Zara Poplin Mini Dress', 'zara-poplin-mini', 'vay-dam', 950000, null, 'Váy ngắn Zara chất poplin, thiết kế trẻ trung, phù hợp dạo phố và đi chơi', '/static-assets/zara-poplin-mini.jpg', false, 45],
            ['Zara Crossbody Bag', 'zara-crossbody-bag', 'phu-kien', 890000, null, 'Túi đeo chéo Zara mini, thiết kế tinh tế, nhiều màu sắc, phù hợp mọi outfit', '/static-assets/zara-crossbody-bag.jpg', false, 55],
        ];

        const hmProducts = [
            ['H&M Premium Tee', 'hm-premium-tee', 'ao', 350000, null, 'Áo thun H&M Premium cotton organic, mềm mại, thấm hút tốt, thân thiện môi trường', '/static-assets/hm-premium-tee.jpg', false, 90],
            ['H&M Cargo Pants', 'hm-cargo-pants', 'quan', 690000, null, 'Quần cargo H&M phong cách streetwear, nhiều túi tiện dụng, chất liệu bền bỉ', '/static-assets/hm-cargo-pants.jpg', false, 70],
            ['H&M Denim Jacket', 'hm-denim-jacket', 'ao', 1100000, 950000, 'Áo khoác jean H&M classic, chất denim bền đẹp, phù hợp mix đồ đa dạng', '/static-assets/hm-denim-jacket.jpg', false, 50],
            ['H&M Linen Shirt', 'hm-linen-shirt', 'ao', 580000, null, 'Áo sơ mi H&M linen, chất liệu thoáng mát, phong cách casual thoải mái', '/static-assets/hm-linen-shirt.jpg', false, 60],
            ['H&M Rib Knit Dress', 'hm-rib-knit-dress', 'vay-dam', 850000, null, 'Váy H&M chất liệu rib knit, ôm dáng, thiết kế tối giản thanh lịch', '/static-assets/hm-rib-knit-dress.jpg', false, 45],
        ];

        const uniqloProducts = [
            ['Uniqlo AIRism Tee', 'uniqlo-airism-tee', 'ao', 390000, null, 'Áo thun Uniqlo AIRism mát lạnh, chống UV, kháng khuẩn, thấm hút mồ hôi tức thì', '/static-assets/uniqlo-airism-tee.jpg', true, 100],
            ['Uniqlo Selvedge Jeans', 'uniqlo-selvedge-jeans', 'quan', 1100000, null, 'Quần jean Uniqlo selvedge denim Nhật Bản, chất lượng cao, độ bền tốt', '/static-assets/uniqlo-selvedge-jeans.jpg', false, 55],
            ['Uniqlo Light Down Jacket', 'uniqlo-light-down', 'ao', 1800000, 1620000, 'Áo phao lông vũ Uniqlo siêu nhẹ, giữ ấm tốt, có thể gấp gọn, tiện lợi mang theo', '/static-assets/uniqlo-light-down.jpg', true, 35],
            ['Uniqlo Dry-EX Polo', 'uniqlo-dry-ex-polo', 'ao', 590000, null, 'Áo polo Uniqlo Dry-EX, công nghệ khô nhanh, thấm hút tốt, phù hợp chơi golf', '/static-assets/uniqlo-dry-ex-polo.jpg', false, 70],
            ['Uniqlo Rayon Dress', 'uniqlo-rayon-dress', 'vay-dam', 790000, null, 'Váy Uniqlo chất rayon mềm mại, thiết kế đơn giản, dễ phối đồ', '/static-assets/uniqlo-rayon-dress.jpg', false, 50],
        ];

        const allProducts = [
            ...nikeProducts.map(p => [...p, 'Nike']),
            ...adidasProducts.map(p => [...p, 'Adidas']),
            ...gucciProducts.map(p => [...p, 'Gucci']),
            ...zaraProducts.map(p => [...p, 'Zara']),
            ...hmProducts.map(p => [...p, 'H&M']),
            ...uniqloProducts.map(p => [...p, 'Uniqlo']),
        ];

        // Insert products one by one
        for (const [name, slug, catSlug, price, salePrice, description, imageUrl, isFeatured, stock, brand] of allProducts) {
            const salePriceStr = salePrice ? `${salePrice}` : 'NULL';
            await sequelize.query(`
                INSERT INTO products (name, slug, description, price, sale_price, category_id, brand, stock, image_url, is_featured, is_active, created_at, updated_at)
                SELECT '${name.replace(/'/g, "''")}', '${slug}', '${description.replace(/'/g, "''")}', ${price}, ${salePriceStr}, 
                       id, '${brand}', ${stock}, '${imageUrl}', ${isFeatured ? 'true' : 'false'}, true, NOW(), NOW()
                FROM categories WHERE slug = '${catSlug}'
                ON CONFLICT (slug) DO NOTHING
            `);
        }
        console.log('✅ Đã tạo 30 sản phẩm\n');

        // =============================================
        // BƯỚC 7: SEED PRODUCT IMAGES
        // =============================================
        console.log('🖼️  Tạo ảnh sản phẩm...');
        await sequelize.query(`
            INSERT INTO product_images (product_id, image_url, is_primary, sort_order)
            SELECT id, image_url, true, 1
            FROM products
            WHERE image_url IS NOT NULL
            ON CONFLICT DO NOTHING
        `);
        console.log('✅ Đã tạo product images\n');

        // =============================================
        // BƯỚC 8: SEED PRODUCT VARIANTS
        // =============================================
        console.log('📦 Tạo biến thể sản phẩm...');
        await sequelize.query(`
            INSERT INTO product_variants (product_id, sku, price, stock_quantity, size_id, color_id, location, min_stock_level)
            SELECT 
                p.id, 
                p.slug || '-' || s.name || '-C' || c.id, 
                p.price,
                FLOOR(RANDOM() * 30 + 5)::INTEGER,
                s.id,
                c.id,
                'Khu A',
                5
            FROM products p
            CROSS JOIN (SELECT id, name FROM sizes WHERE name IN ('S', 'M', 'L', 'XL')) s
            CROSS JOIN LATERAL (SELECT id FROM colors WHERE name IN ('Đen', 'Trắng', 'Xanh Biển', 'Đỏ', 'Xanh Lục') ORDER BY RANDOM() LIMIT 3) c
            ON CONFLICT DO NOTHING
        `);
        console.log('✅ Đã tạo product variants\n');

        // =============================================
        // BƯỚC 9: SEED COUPONS
        // =============================================
        console.log('🎫 Tạo mã giảm giá...');
        await sequelize.query(`
            INSERT INTO coupons (code, discount_type, discount_value, min_order_value, usage_limit, current_usage, is_active, start_date, end_date, created_at, updated_at)
            VALUES 
                ('WELCOME10', 'percent', 10, 0, 1000, 0, true, NOW(), NOW() + INTERVAL '90 days', NOW(), NOW()),
                ('SUMMER50K', 'fixed', 50000, 500000, 500, 0, true, NOW(), NOW() + INTERVAL '60 days', NOW(), NOW()),
                ('FREESHIP', 'freeship', 0, 300000, 2000, 0, true, NOW(), NOW() + INTERVAL '90 days', NOW(), NOW()),
                ('FREESHIP_NEW', 'freeship', 0, 0, 1000, 0, true, NOW(), NOW() + INTERVAL '90 days', NOW(), NOW()),
                ('VIP20', 'percent', 20, 1000000, 100, 0, true, NOW(), NOW() + INTERVAL '60 days', NOW(), NOW()),
                ('GIAM10_2TR', 'percent', 10, 2000000, 200, 0, true, NOW(), NOW() + INTERVAL '60 days', NOW(), NOW()),
                ('NEWYEAR15', 'percent', 15, 500000, 300, 0, true, NOW(), NOW() + INTERVAL '45 days', NOW(), NOW())
            ON CONFLICT (code) DO NOTHING
        `);
        console.log('✅ Đã tạo 7 coupons\n');

        // =============================================
        // BƯỚC 10: SEED SETTINGS
        // =============================================
        console.log('⚙️  Tạo settings...');
        await sequelize.query(`
            INSERT INTO settings (
                id, name, hotline, address, shipping_fee, map_url,
                payment_vcb_active, payment_momo_active, payment_cod_active,
                shipping_ghtk_active, shipping_ghn_active, primary_color, theme_mode,
                created_at, updated_at
            )
            VALUES (
                1, 'Aura K Shop', '1900-xxxx', '', 30000, '',
                TRUE, TRUE, TRUE, TRUE, FALSE, '#003178', 'light', NOW(), NOW()
            )
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                hotline = EXCLUDED.hotline,
                shipping_fee = EXCLUDED.shipping_fee,
                updated_at = NOW()
        `);
        console.log('✅ Đã tạo settings\n');

        console.log('═══════════════════════════════════════════════');
        console.log('✨ HOÀN TẤT SEED DỮ LIỆU ĐẦY ĐỦ!\n');
        console.log('📊 Tóm tắt:');
        console.log('   ✅ 4 Categories (có hình ảnh)');
        console.log('   ✅ 3 Users (admin + 2 customers)');
        console.log('   ✅ 30 Products với hình ảnh (Nike, Adidas, Gucci, Zara, H&M, Uniqlo)');
        console.log('   ✅ 5 Sizes | 10 Colors | Product Variants');
        console.log('   ✅ 7 Coupons | Settings\n');
        console.log('🔐 Đăng nhập:');
        console.log('   Tài khoản mẫu đã dùng mật khẩu từ SEED_DEFAULT_PASSWORD');
        console.log('═══════════════════════════════════════════════\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Lỗi seed data:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

seedFull();
