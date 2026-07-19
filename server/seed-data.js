const { sequelize } = require('./src/config/database');
const bcrypt = require('bcryptjs');

async function seedData() {
    try {
        console.log('🌱 Bắt đầu seed dữ liệu...\n');

        // 1. Tạo Categories
        console.log('📁 Tạo danh mục sản phẩm...');
        await sequelize.query(`
            INSERT INTO categories (name, slug, description, image_url, created_at, updated_at)
            VALUES 
                ('Áo', 'ao', 'Áo thời trang nam nữ', '/static-assets/aovahoodi.jpg', NOW(), NOW()),
                ('Quần', 'quan', 'Quần thời trang nam nữ', '/static-assets/quandai.jpg', NOW(), NOW()),
                ('Váy & Đầm', 'vay-dam', 'Váy và đầm nữ', '/static-assets/vayvadam.jpg', NOW(), NOW()),
                ('Phụ Kiện', 'phu-kien', 'Phụ kiện thời trang', '/static-assets/thuonghieu.jpg', NOW(), NOW())
            ON CONFLICT DO NOTHING
        `);
        console.log('✅ Đã tạo categories\n');

        // 2. Tạo Admin User
        console.log('👤 Tạo tài khoản admin...');
        const seedPassword = process.env.SEED_DEFAULT_PASSWORD;
        if (!seedPassword) {
            throw new Error('SEED_DEFAULT_PASSWORD is required before seeding users');
        }
        const hashedPassword = await bcrypt.hash(seedPassword, 10);
        await sequelize.query(`
            INSERT INTO users (name, email, password, phone, role, rank, username, created_at, updated_at)
            VALUES 
                ('Admin', 'admin@shopquanao.com', '${hashedPassword}', '0123456789', 'admin', 'platinum', 'admin', NOW(), NOW()),
                ('Khách hàng mẫu', 'customer@example.com', '${hashedPassword}', '0987654321', 'customer', 'silver', 'customer', NOW(), NOW())
            ON CONFLICT (email) DO NOTHING
        `);
        console.log('✅ Đã tạo users');
        console.log('   Tài khoản mẫu đã dùng mật khẩu từ SEED_DEFAULT_PASSWORD');

        // 3. Tạo Products
        console.log('🛍️ Tạo sản phẩm...');
        
        // Nike Products
        await sequelize.query(`
            INSERT INTO products (name, slug, description, price, category_id, brand, stock, image_url, is_featured, created_at, updated_at)
            SELECT 
                'Nike Tech Fleece Hoodie',
                'nike-tech-fleece-hoodie',
                'Áo hoodie Nike Tech Fleece cao cấp, chất liệu cotton pha polyester, thiết kế hiện đại, phù hợp cho hoạt động thể thao và dạo phố',
                1500000,
                id,
                'Nike',
                50,
                '/static-assets/nike-tech-fleece-hoodie.jpg',
                true,
                NOW(),
                NOW()
            FROM categories WHERE slug = 'ao'
            ON CONFLICT DO NOTHING
        `);

        await sequelize.query(`
            INSERT INTO products (name, slug, description, price, category_id, brand, stock, image_url, is_featured, created_at, updated_at)
            SELECT 
                'Nike Sportswear Pants',
                'nike-sportswear-pants',
                'Quần thể thao Nike Sportswear, chất liệu thấm hút mồ hôi tốt, co giãn 4 chiều, thoải mái cho mọi hoạt động',
                980000,
                id,
                'Nike',
                60,
                '/static-assets/nike-sportswear-pants.jpg',
                true,
                NOW(),
                NOW()
            FROM categories WHERE slug = 'quan'
            ON CONFLICT DO NOTHING
        `);

        await sequelize.query(`
            INSERT INTO products (name, slug, description, price, category_id, brand, stock, image_url, created_at, updated_at)
            SELECT 
                'Nike Pro Leggings',
                'nike-pro-leggings',
                'Quần legging Nike Pro cho nữ, chất liệu Dri-FIT thấm hút mồ hôi, ôm body tôn dáng, phù hợp tập yoga và gym',
                750000,
                id,
                'Nike',
                40,
                '/static-assets/nike-pro-leggings.jpg',
                NOW(),
                NOW()
            FROM categories WHERE slug = 'quan'
            ON CONFLICT DO NOTHING
        `);

        // Adidas Products
        await sequelize.query(`
            INSERT INTO products (name, slug, description, price, category_id, brand, stock, image_url, is_featured, created_at, updated_at)
            SELECT 
                'Adidas Essentials Tee',
                'adidas-essentials-tee',
                'Áo thun Adidas Essentials basic, chất cotton 100%, thấm hút tốt, form regular fit thoải mái',
                450000,
                id,
                'Adidas',
                80,
                '/static-assets/adidas-essentials-tee.jpg',
                true,
                NOW(),
                NOW()
            FROM categories WHERE slug = 'ao'
            ON CONFLICT DO NOTHING
        `);

        await sequelize.query(`
            INSERT INTO products (name, slug, description, price, category_id, brand, stock, image_url, created_at, updated_at)
            SELECT 
                'Adidas Tiro 23 Pants',
                'adidas-tiro-23-pants',
                'Quần thể thao Adidas Tiro 23, thiết kế iconic với 3 sọc đặc trưng, chất liệu thoáng khí',
                890000,
                id,
                'Adidas',
                55,
                '/static-assets/adidas-tiro-23-pants.jpg',
                NOW(),
                NOW()
            FROM categories WHERE slug = 'quan'
            ON CONFLICT DO NOTHING
        `);

        await sequelize.query(`
            INSERT INTO products (name, slug, description, price, category_id, brand, stock, image_url, created_at, updated_at)
            SELECT 
                'Adidas Windbreaker',
                'adidas-windbreaker',
                'Áo khoác gió Adidas, chất liệu chống nước nhẹ, có mũ trùm, phù hợp cho thời tiết se lạnh',
                1200000,
                id,
                'Adidas',
                35,
                '/static-assets/adidas-windbreaker.jpg',
                NOW(),
                NOW()
            FROM categories WHERE slug = 'ao'
            ON CONFLICT DO NOTHING
        `);

        // Gucci Products
        await sequelize.query(`
            INSERT INTO products (name, slug, description, price, category_id, brand, stock, image_url, is_featured, created_at, updated_at)
            SELECT 
                'Gucci Logo Tee',
                'gucci-logo-tee',
                'Áo thun Gucci cao cấp với logo thương hiệu nổi bật, chất cotton premium, thiết kế sang trọng',
                8500000,
                id,
                'Gucci',
                15,
                '/static-assets/gucci-logo-tee.jpg',
                true,
                NOW(),
                NOW()
            FROM categories WHERE slug = 'ao'
            ON CONFLICT DO NOTHING
        `);

        await sequelize.query(`
            INSERT INTO products (name, slug, description, price, category_id, brand, stock, image_url, created_at, updated_at)
            SELECT 
                'Gucci Silk Skirt',
                'gucci-silk-skirt',
                'Váy lụa Gucci cao cấp, chất liệu silk 100%, thiết kế tinh tế, phù hợp dự tiệc và sự kiện',
                15000000,
                id,
                'Gucci',
                8,
                '/static-assets/gucci-silk-skirt.jpg',
                NOW(),
                NOW()
            FROM categories WHERE slug = 'vay-dam'
            ON CONFLICT DO NOTHING
        `);

        // Zara Products
        await sequelize.query(`
            INSERT INTO products (name, slug, description, price, category_id, brand, stock, image_url, is_featured, created_at, updated_at)
            SELECT 
                'Zara Leather Jacket',
                'zara-leather-jacket',
                'Áo khoác da Zara phong cách biker, thiết kế trẻ trung, chất liệu da tổng hợp cao cấp',
                2500000,
                id,
                'Zara',
                25,
                '/static-assets/zara-leather-jacket.jpg',
                true,
                NOW(),
                NOW()
            FROM categories WHERE slug = 'ao'
            ON CONFLICT DO NOTHING
        `);

        await sequelize.query(`
            INSERT INTO products (name, slug, description, price, category_id, brand, stock, image_url, created_at, updated_at)
            SELECT 
                'Zara Slim Chinos',
                'zara-slim-chinos',
                'Quần kaki Zara slim fit, chất liệu cotton cao cấp, phù hợp đi làm và dạo phố',
                780000,
                id,
                'Zara',
                45,
                '/static-assets/zara-slim-chinos.jpg',
                NOW(),
                NOW()
            FROM categories WHERE slug = 'quan'
            ON CONFLICT DO NOTHING
        `);

        await sequelize.query(`
            INSERT INTO products (name, slug, description, price, category_id, brand, stock, image_url, created_at, updated_at)
            SELECT 
                'Zara Floral Midi Dress',
                'zara-floral-midi',
                'Váy midi Zara họa tiết hoa, thiết kế nữ tính, chất liệu voan nhẹ nhàng',
                1200000,
                id,
                'Zara',
                30,
                '/static-assets/zara-floral-midi.jpg',
                NOW(),
                NOW()
            FROM categories WHERE slug = 'vay-dam'
            ON CONFLICT DO NOTHING
        `);

        // H&M Products
        await sequelize.query(`
            INSERT INTO products (name, slug, description, price, category_id, brand, stock, image_url, created_at, updated_at)
            SELECT 
                'H&M Premium Tee',
                'hm-premium-tee',
                'Áo thun H&M Premium cotton organic, mềm mại, thấm hút tốt, thân thiện môi trường',
                350000,
                id,
                'H&M',
                70,
                '/static-assets/hm-premium-tee.jpg',
                NOW(),
                NOW()
            FROM categories WHERE slug = 'ao'
            ON CONFLICT DO NOTHING
        `);

        await sequelize.query(`
            INSERT INTO products (name, slug, description, price, category_id, brand, stock, image_url, created_at, updated_at)
            SELECT 
                'H&M Cargo Pants',
                'hm-cargo-pants',
                'Quần cargo H&M phong cách streetwear, nhiều túi tiện dụng, chất liệu bền bỉ',
                690000,
                id,
                'H&M',
                50,
                '/static-assets/hm-cargo-pants.jpg',
                NOW(),
                NOW()
            FROM categories WHERE slug = 'quan'
            ON CONFLICT DO NOTHING
        `);

        // Uniqlo Products
        await sequelize.query(`
            INSERT INTO products (name, slug, description, price, category_id, brand, stock, image_url, created_at, updated_at)
            SELECT 
                'Uniqlo AIRism Tee',
                'uniqlo-airism-tee',
                'Áo thun Uniqlo AIRism mát lạnh, chống UV, kháng khuẩn, thấm hút mồ hôi tức thì',
                390000,
                id,
                'Uniqlo',
                90,
                '/static-assets/uniqlo-airism-tee.jpg',
                NOW(),
                NOW()
            FROM categories WHERE slug = 'ao'
            ON CONFLICT DO NOTHING
        `);

        await sequelize.query(`
            INSERT INTO products (name, slug, description, price, category_id, brand, stock, image_url, created_at, updated_at)
            SELECT 
                'Uniqlo Selvedge Jeans',
                'uniqlo-selvedge-jeans',
                'Quần jean Uniqlo selvedge denim Nhật Bản, chất lượng cao, độ bền tốt',
                1100000,
                id,
                'Uniqlo',
                40,
                '/static-assets/uniqlo-selvedge-jeans.jpg',
                NOW(),
                NOW()
            FROM categories WHERE slug = 'quan'
            ON CONFLICT DO NOTHING
        `);

        console.log('✅ Đã tạo products\n');

        // 4. Tạo Sizes
        console.log('📏 Tạo sizes...');
        await sequelize.query(`
            INSERT INTO sizes (name, created_at, updated_at)
            VALUES 
                ('S', NOW(), NOW()),
                ('M', NOW(), NOW()),
                ('L', NOW(), NOW()),
                ('XL', NOW(), NOW()),
                ('XXL', NOW(), NOW())
            ON CONFLICT (name) DO NOTHING
        `);
        console.log('✅ Đã tạo sizes\n');

        // 5. Tạo Colors
        console.log('🎨 Tạo colors...');
        await sequelize.query(`
            INSERT INTO colors (name, hex_code, created_at, updated_at)
            VALUES 
                ('Đen', '#000000', NOW(), NOW()),
                ('Trắng', '#FFFFFF', NOW(), NOW()),
                ('Xám', '#808080', NOW(), NOW()),
                ('Xanh Navy', '#000080', NOW(), NOW()),
                ('Đỏ', '#FF0000', NOW(), NOW()),
                ('Xanh Dương', '#0000FF', NOW(), NOW()),
                ('Be', '#F5F5DC', NOW(), NOW())
            ON CONFLICT (name) DO NOTHING
        `);
        console.log('✅ Đã tạo colors\n');

        // 6. Tạo Coupons
        console.log('🎫 Tạo mã giảm giá...');
        await sequelize.query(`
            INSERT INTO coupons (code, discount_type, discount_value, min_order_value, usage_limit, current_usage, is_active, start_date, end_date, created_at, updated_at)
            VALUES 
                ('WELCOME10', 'percent', 10, 0, 1000, 0, true, NOW(), NOW() + INTERVAL '30 days', NOW(), NOW()),
                ('SUMMER50K', 'fixed', 50000, 500000, 500, 0, true, NOW(), NOW() + INTERVAL '60 days', NOW(), NOW()),
                ('FREESHIP', 'freeship', 0, 300000, 2000, 0, true, NOW(), NOW() + INTERVAL '90 days', NOW(), NOW()),
                ('VIP20', 'percent', 20, 1000000, 100, 0, true, NOW(), NOW() + INTERVAL '60 days', NOW(), NOW())
            ON CONFLICT (code) DO NOTHING
        `);
        console.log('✅ Đã tạo coupons\n');

        // 7. Tạo Settings
        console.log('⚙️ Tạo settings...');
        await sequelize.query(`
            INSERT INTO settings (key, value, created_at, updated_at)
            VALUES 
                ('site_name', 'Aura K Shop', NOW(), NOW()),
                ('site_description', 'Shop thời trang cao cấp', NOW(), NOW()),
                ('contact_email', 'contact@shopquanao.com', NOW(), NOW()),
                ('contact_phone', '1900-xxxx', NOW(), NOW()),
                ('hero_title', 'Thời Trang Đỉnh Cao', NOW(), NOW()),
                ('hero_subtitle', 'Khám phá bộ sưu tập mới nhất', NOW(), NOW()),
                ('newsletter_enabled', 'true', NOW(), NOW())
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        `);
        console.log('✅ Đã tạo settings\n');

        console.log('═══════════════════════════════════════');
        console.log('✨ HOÀN TẤT SEED DỮ LIỆU!\n');
        console.log('📊 Dữ liệu đã tạo:');
        console.log('   ✅ 4 Categories');
        console.log('   ✅ 2 Users (1 admin, 1 customer)');
        console.log('   ✅ 15+ Products (Nike, Adidas, Gucci, Zara, H&M, Uniqlo)');
        console.log('   ✅ 5 Sizes (S, M, L, XL, XXL)');
        console.log('   ✅ 7 Colors');
        console.log('   ✅ 4 Coupons');
        console.log('   ✅ Settings\n');
        console.log('🔐 Thông tin đăng nhập:');
        console.log('   Tài khoản mẫu đã dùng mật khẩu từ SEED_DEFAULT_PASSWORD');
        console.log('═══════════════════════════════════════\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Lỗi seed data:', error);
        console.error(error.stack);
        process.exit(1);
    }
}

seedData();
