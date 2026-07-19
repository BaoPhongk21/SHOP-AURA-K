const { sequelize } = require('./src/config/database');
const bcrypt = require('bcryptjs');

async function seedData() {
    try {
        console.log('🌱 Bắt đầu seed dữ liệu với 30 sản phẩm...\n');

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
        console.log('✅ Đã tạo 4 categories\n');

        // 2. Tạo Admin User
        console.log('👤 Tạo tài khoản admin...');
        const seedPassword = process.env.SEED_DEFAULT_PASSWORD;
        if (!seedPassword) {
            throw new Error('SEED_DEFAULT_PASSWORD is required before seeding users');
        }
        const hashedPassword = await bcrypt.hash(seedPassword, 10);
        await sequelize.query(`
            INSERT INTO users (name, email, password, phone, role, rank, created_at, updated_at)
            VALUES 
                ('Admin', 'admin@shopquanao.com', '${hashedPassword}', '0123456789', 'admin', 'platinum', NOW(), NOW()),
                ('Khách hàng mẫu', 'customer@example.com', '${hashedPassword}', '0987654321', 'customer', 'silver', NOW(), NOW())
            ON CONFLICT (email) DO NOTHING
        `);
        console.log('✅ Đã tạo 2 users\n');

        // 3. Tạo 30 Products
        console.log('🛍️ Tạo 30 sản phẩm...');
        
        // === NIKE PRODUCTS (5 sản phẩm) ===
        await sequelize.query(`
            INSERT INTO products (name, slug, description, price, sale_price, category_id, brand, stock, image_url, is_featured, created_at, updated_at)
            SELECT 
                'Nike Tech Fleece Hoodie', 'nike-tech-fleece-hoodie',
                'Áo hoodie Nike Tech Fleece cao cấp, chất liệu cotton pha polyester, thiết kế hiện đại, giữ ấm tốt',
                1500000, 1350000, id, 'Nike', 50, '/static-assets/nike-tech-fleece-hoodie.jpg', true, NOW(), NOW()
            FROM categories WHERE slug = 'ao'
        `);

        await sequelize.query(`
            INSERT INTO products (name, slug, description, price, category_id, brand, stock, image_url, is_featured, created_at, updated_at)
            SELECT 
                'Nike Sportswear Pants', 'nike-sportswear-pants',
                'Quần thể thao Nike Sportswear, chất liệu thấm hút mồ hôi tốt, co giãn 4 chiều',
                980000, id, 'Nike', 60, '/static-assets/nike-sportswear-pants.jpg', true, NOW(), NOW()
            FROM categories WHERE slug = 'quan'
        `);

        await sequelize.query(`
            INSERT INTO products (name, slug, description, price, category_id, brand, stock, image_url, created_at, updated_at)
            SELECT 
                'Nike Pro Leggings', 'nike-pro-leggings',
                'Quần legging Nike Pro cho nữ, chất liệu Dri-FIT thấm hút mồ hôi, ôm body tôn dáng',
                750000, id, 'Nike', 70, '/static-assets/nike-pro-leggings.jpg', NOW(), NOW()
            FROM categories WHERE slug = 'quan'
        `);

        await sequelize.query(`
            INSERT INTO products (name, slug, description, price, category_id, brand, stock, image_url, created_at, updated_at)
            SELECT 
                'Nike Dri-FIT Academy', 'nike-dri-fit-academy',
                'Áo thun thể thao Nike Dri-FIT Academy, công nghệ thấm hút vượt trội, phù hợp tập luyện',
                650000, id, 'Nike', 80, '/static-assets/nike-dri-fit-academy.jpg', NOW(), NOW()
            FROM categories WHERE slug = 'ao'
        `);

        await sequelize.query(`
            INSERT INTO products (name, slug, description, price, category_id, brand, stock, image_url, created_at, updated_at)
            SELECT 
                'Nike Heritage Backpack', 'nike-heritage-backpack',
                'Ba lô Nike Heritage, thiết kế đơn giản, nhiều ngăn tiện dụng, phù hợp đi học và dạo phố',
                890000, id, 'Nike', 45, '/static-assets/nike-heritage-backpack.jpg', NOW(), NOW()
            FROM categories WHERE slug = 'phu-kien'
        `);

        // === ADIDAS PRODUCTS (5 sản phẩm) ===
        await sequelize.query(`
            INSERT INTO products (name, slug, description, price, category_id, brand, stock, image_url, is_featured, created_at, updated_at)
            SELECT 
                'Adidas Essentials Tee', 'adidas-essentials-tee',
                'Áo thun Adidas Essentials basic, chất cotton 100%, thấm hút tốt, form regular fit',
                450000, id, 'Adidas', 100, '/static-assets/adidas-essentials-tee.jpg', true, NOW(), NOW()
            FROM categories WHERE slug = 'ao'
        `);

        await sequelize.query(`
            INSERT INTO products (name, slug, description, price, category_id, brand, stock, image_url, created_at, updated_at)
            SELECT 
                'Adidas Tiro 23 Pants', 'adidas-tiro-23-pants',
                'Quần thể thao Adidas Tiro 23, thiết kế iconic với 3 sọc đặc trưng, chất liệu thoáng khí',
                890000, id, 'Adidas', 75, '/static-assets/adidas-tiro-23-pants.jpg', NOW(), NOW()
            FROM categories WHERE slug = 'quan'
        `);

        await sequelize.query(`
            INSERT INTO products (name, slug, description, price, sale_price, category_id, brand, stock, image_url, is_featured, created_at, updated_at)
            SELECT 
                'Adidas Windbreaker', 'adidas-windbreaker',
                'Áo khoác gió Adidas, chất liệu chống nước nhẹ, có mũ trùm, phù hợp thời tiết se lạnh',
                1200000, 1080000, id, 'Adidas', 40, '/static-assets/adidas-windbreaker.jpg', true, NOW(), NOW()
            FROM categories WHERE slug = 'ao'
        `);

        await sequelize.query(`
            INSERT INTO products (name, slug, description, price, category_id, brand, stock, image_url, created_at, updated_at)
            SELECT 
                'Adidas Techfit Top', 'adidas-techfit-top',
                'Áo thể thao Adidas Techfit, ôm body, hỗ trợ cơ bắp, phù hợp tập gym và chạy bộ',
                780000, id, 'Adidas', 60, '/static-assets/adidas-techfit-top.jpg', NOW(), NOW()
            FROM categories WHERE slug = 'ao'
        `);

        await sequelize.query(`
            INSERT INTO products (name, slug, description, price, category_id, brand, stock, image_url, created_at, updated_at)
            SELECT 
                'Adidas Baseball Cap', 'adidas-baseball-cap',
                'Mũ lưỡi trai Adidas, chất liệu cotton thoáng mát, điều chỉnh size linh hoạt',
                350000, id, 'Adidas', 120, '/static-assets/adidas-baseball-cap.jpg', NOW(), NOW()
            FROM categories WHERE slug = 'phu-kien'
        `);

        // === GUCCI PRODUCTS (5 sản phẩm) ===
        await sequelize.query(`
            INSERT INTO products (name, slug, description, price, category_id, brand, stock, image_url, is_featured, created_at, updated_at)
            SELECT 
                'Gucci Logo Tee', 'gucci-logo-tee',
                'Áo thun Gucci cao cấp với logo thương hiệu nổi bật, chất cotton premium, thiết kế sang trọng',
                8500000, id, 'Gucci', 15, '/static-assets/gucci-logo-tee.jpg', true, NOW(), NOW()
            FROM categories WHERE slug = 'ao'
        `);

        await sequelize.query(`
            INSERT INTO products (name, slug, description, price, category_id, brand, stock, image_url, is_featured, created_at, updated_at)
            SELECT 
                'Gucci Silk Skirt', 'gucci-silk-skirt',
                'Váy lụa Gucci cao cấp, chất liệu silk 100%, thiết kế tinh tế, phù hợp dự tiệc',
                15000000, id, 'Gucci', 8, '/static-assets/gucci-silk-skirt.jpg', true, NOW(), NOW()
            FROM categories WHERE slug = 'vay-dam'
        `);

        await sequelize.query(`
            INSERT INTO products (name, slug, description, price, category_id, brand, stock, image_url, created_at, updated_at)
            SELECT 
                'Gucci Oxford Shirt', 'gucci-oxford-shirt',
                'Áo sơ mi Gucci Oxford, chất liệu cotton cao cấp, form fitted thanh lịch, phù hợp công sở',
                12000000, id, 'Gucci', 12, '/static-assets/gucci-oxford-shirt.jpg', NOW(), NOW()
            FROM categories WHERE slug = 'ao'
        `);

        await sequelize.query(`
            INSERT INTO products (name, slug, description, price, category_id, brand, stock, image_url, created_at, updated_at)
            SELECT 
                'Gucci Silk Scarf', 'gucci-silk-scarf',
                'Khăn lụa Gucci họa tiết đặc trưng, chất liệu silk mềm mại, điểm nhấn sang trọng',
                7500000, id, 'Gucci', 20, '/static-assets/gucci-silk-scarf.jpg', NOW(), NOW()
            FROM categories WHERE slug = 'phu-kien'
        `);

        await sequelize.query(`
            INSERT INTO products (name, slug, description, price, category_id, brand, stock, image_url, is_featured, created_at, updated_at)
            SELECT 
                'Gucci Marmont Belt', 'gucci-marmont-belt',
                'Thắt lưng Gucci Marmont da thật, khóa GG logo iconic, phụ kiện hoàn hảo cho outfit',
                18000000, id, 'Gucci', 10, '/static-assets/gucci-marmont-belt.jpg', true, NOW(), NOW()
            FROM categories WHERE slug = 'phu-kien'
        `);

        // === ZARA PRODUCTS (5 sản phẩm) ===
        await sequelize.query(`
            INSERT INTO products (name, slug, description, price, sale_price, category_id, brand, stock, image_url, is_featured, created_at, updated_at)
            SELECT 
                'Zara Leather Jacket', 'zara-leather-jacket',
                'Áo khoác da Zara phong cách biker, thiết kế trẻ trung, chất liệu da tổng hợp cao cấp',
                2500000, 2200000, id, 'Zara', 30, '/static-assets/zara-leather-jacket.jpg', true, NOW(), NOW()
            FROM categories WHERE slug = 'ao'
        `);

        await sequelize.query(`
            INSERT INTO products (name, slug, description, price, category_id, brand, stock, image_url, created_at, updated_at)
            SELECT 
                'Zara Slim Chinos', 'zara-slim-chinos',
                'Quần kaki Zara slim fit, chất liệu cotton cao cấp, phù hợp đi làm và dạo phố',
                780000, id, 'Zara', 65, '/static-assets/zara-slim-chinos.jpg', NOW(), NOW()
            FROM categories WHERE slug = 'quan'
        `);

        await sequelize.query(`
            INSERT INTO products (name, slug, description, price, category_id, brand, stock, image_url, created_at, updated_at)
            SELECT 
                'Zara Floral Midi Dress', 'zara-floral-midi',
                'Váy midi Zara họa tiết hoa, thiết kế nữ tính, chất liệu voan nhẹ nhàng',
                1200000, id, 'Zara', 40, '/static-assets/zara-floral-midi.jpg', NOW(), NOW()
            FROM categories WHERE slug = 'vay-dam'
        `);

        await sequelize.query(`
            INSERT INTO products (name, slug, description, price, category_id, brand, stock, image_url, created_at, updated_at)
            SELECT 
                'Zara Poplin Mini Dress', 'zara-poplin-mini',
                'Váy ngắn Zara chất poplin, thiết kế trẻ trung, phù hợp dạo phố và đi chơi',
                950000, id, 'Zara', 45, '/static-assets/zara-poplin-mini.jpg', NOW(), NOW()
            FROM categories WHERE slug = 'vay-dam'
        `);

        await sequelize.query(`
            INSERT INTO products (name, slug, description, price, category_id, brand, stock, image_url, created_at, updated_at)
            SELECT 
                'Zara Crossbody Bag', 'zara-crossbody-bag',
                'Túi đeo chéo Zara mini, thiết kế tinh tế, nhiều màu sắc, phù hợp mọi outfit',
                890000, id, 'Zara', 55, '/static-assets/zara-crossbody-bag.jpg', NOW(), NOW()
            FROM categories WHERE slug = 'phu-kien'
        `);

        // === H&M PRODUCTS (5 sản phẩm) ===
        await sequelize.query(`
            INSERT INTO products (name, slug, description, price, category_id, brand, stock, image_url, created_at, updated_at)
            SELECT 
                'H&M Premium Tee', 'hm-premium-tee',
                'Áo thun H&M Premium cotton organic, mềm mại, thấm hút tốt, thân thiện môi trường',
                350000, id, 'H&M', 90, '/static-assets/hm-premium-tee.jpg', NOW(), NOW()
            FROM categories WHERE slug = 'ao'
        `);

        await sequelize.query(`
            INSERT INTO products (name, slug, description, price, category_id, brand, stock, image_url, created_at, updated_at)
            SELECT 
                'H&M Cargo Pants', 'hm-cargo-pants',
                'Quần cargo H&M phong cách streetwear, nhiều túi tiện dụng, chất liệu bền bỉ',
                690000, id, 'H&M', 70, '/static-assets/hm-cargo-pants.jpg', NOW(), NOW()
            FROM categories WHERE slug = 'quan'
        `);

        await sequelize.query(`
            INSERT INTO products (name, slug, description, price, sale_price, category_id, brand, stock, image_url, created_at, updated_at)
            SELECT 
                'H&M Denim Jacket', 'hm-denim-jacket',
                'Áo khoác jean H&M classic, chất denim bền đẹp, phù hợp mix đồ đa dạng',
                1100000, 950000, id, 'H&M', 50, '/static-assets/hm-denim-jacket.jpg', NOW(), NOW()
            FROM categories WHERE slug = 'ao'
        `);

        await sequelize.query(`
            INSERT INTO products (name, slug, description, price, category_id, brand, stock, image_url, created_at, updated_at)
            SELECT 
                'H&M Linen Shirt', 'hm-linen-shirt',
                'Áo sơ mi H&M linen, chất liệu thoáng mát, phong cách casual thoải mái',
                580000, id, 'H&M', 60, '/static-assets/hm-linen-shirt.jpg', NOW(), NOW()
            FROM categories WHERE slug = 'ao'
        `);

        await sequelize.query(`
            INSERT INTO products (name, slug, description, price, category_id, brand, stock, image_url, created_at, updated_at)
            SELECT 
                'H&M Rib Knit Dress', 'hm-rib-knit-dress',
                'Váy H&M chất liệu rib knit, ôm dáng, thiết kế tối giản thanh lịch',
                850000, id, 'H&M', 45, '/static-assets/hm-rib-knit-dress.jpg', NOW(), NOW()
            FROM categories WHERE slug = 'vay-dam'
        `);

        // === UNIQLO PRODUCTS (5 sản phẩm) ===
        await sequelize.query(`
            INSERT INTO products (name, slug, description, price, category_id, brand, stock, image_url, is_featured, created_at, updated_at)
            SELECT 
                'Uniqlo AIRism Tee', 'uniqlo-airism-tee',
                'Áo thun Uniqlo AIRism mát lạnh, chống UV, kháng khuẩn, thấm hút mồ hôi tức thì',
                390000, id, 'Uniqlo', 100, '/static-assets/uniqlo-airism-tee.jpg', true, NOW(), NOW()
            FROM categories WHERE slug = 'ao'
        `);

        await sequelize.query(`
            INSERT INTO products (name, slug, description, price, category_id, brand, stock, image_url, created_at, updated_at)
            SELECT 
                'Uniqlo Selvedge Jeans', 'uniqlo-selvedge-jeans',
                'Quần jean Uniqlo selvedge denim Nhật Bản, chất lượng cao, độ bền tốt',
                1100000, id, 'Uniqlo', 55, '/static-assets/uniqlo-selvedge-jeans.jpg', NOW(), NOW()
            FROM categories WHERE slug = 'quan'
        `);

        await sequelize.query(`
            INSERT INTO products (name, slug, description, price, sale_price, category_id, brand, stock, image_url, is_featured, created_at, updated_at)
            SELECT 
                'Uniqlo Light Down Jacket', 'uniqlo-light-down',
                'Áo phao lông vũ Uniqlo siêu nhẹ, giữ ấm tốt, có thể gấp gọn, tiện lợi mang theo',
                1800000, 1620000, id, 'Uniqlo', 35, '/static-assets/uniqlo-light-down.jpg', true, NOW(), NOW()
            FROM categories WHERE slug = 'ao'
        `);

        await sequelize.query(`
            INSERT INTO products (name, slug, description, price, category_id, brand, stock, image_url, created_at, updated_at)
            SELECT 
                'Uniqlo Dry-EX Polo', 'uniqlo-dry-ex-polo',
                'Áo polo Uniqlo Dry-EX, công nghệ khô nhanh, thấm hút tốt, phù hợp chơi golf',
                590000, id, 'Uniqlo', 70, '/static-assets/uniqlo-dry-ex-polo.jpg', NOW(), NOW()
            FROM categories WHERE slug = 'ao'
        `);

        await sequelize.query(`
            INSERT INTO products (name, slug, description, price, category_id, brand, stock, image_url, created_at, updated_at)
            SELECT 
                'Uniqlo Rayon Dress', 'uniqlo-rayon-dress',
                'Váy Uniqlo chất rayon mềm mại, thiết kế đơn giản, dễ phối đồ',
                790000, id, 'Uniqlo', 50, '/static-assets/uniqlo-rayon-dress.jpg', NOW(), NOW()
            FROM categories WHERE slug = 'vay-dam'
        `);

        console.log('✅ Đã tạo 30 products\n');

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
        console.log('✅ Đã tạo 5 sizes\n');

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
                ('Be', '#F5F5DC', NOW(), NOW()),
                ('Nâu', '#8B4513', NOW(), NOW()),
                ('Hồng', '#FFC0CB', NOW(), NOW()),
                ('Vàng', '#FFD700', NOW(), NOW())
            ON CONFLICT (name) DO NOTHING
        `);
        console.log('✅ Đã tạo 10 colors\n');

        // 6. Tạo Coupons
        console.log('🎫 Tạo mã giảm giá...');
        await sequelize.query(`
            INSERT INTO coupons (code, discount_type, discount_value, min_order_value, usage_limit, current_usage, is_active, start_date, end_date, created_at, updated_at)
            VALUES 
                ('WELCOME10', 'percent', 10, 0, 1000, 0, true, NOW(), NOW() + INTERVAL '30 days', NOW(), NOW()),
                ('SUMMER50K', 'fixed', 50000, 500000, 500, 0, true, NOW(), NOW() + INTERVAL '60 days', NOW(), NOW()),
                ('FREESHIP', 'freeship', 0, 300000, 2000, 0, true, NOW(), NOW() + INTERVAL '90 days', NOW(), NOW()),
                ('VIP20', 'percent', 20, 1000000, 100, 0, true, NOW(), NOW() + INTERVAL '60 days', NOW(), NOW()),
                ('NEWYEAR15', 'percent', 15, 500000, 300, 0, true, NOW(), NOW() + INTERVAL '45 days', NOW(), NOW())
            ON CONFLICT (code) DO NOTHING
        `);
        console.log('✅ Đã tạo 5 coupons\n');

        // 7. Tạo Settings
        console.log('⚙️ Tạo settings...');
        await sequelize.query(`
            INSERT INTO settings (key, value, created_at, updated_at)
            VALUES 
                ('site_name', 'Aura K Shop', NOW(), NOW()),
                ('site_description', 'Shop thời trang cao cấp - Phong cách là tất cả', NOW(), NOW()),
                ('contact_email', 'contact@shopquanao.com', NOW(), NOW()),
                ('contact_phone', '1900-xxxx', NOW(), NOW()),
                ('hero_title', 'Thời Trang Đỉnh Cao', NOW(), NOW()),
                ('hero_subtitle', 'Khám phá bộ sưu tập mới nhất từ các thương hiệu nổi tiếng', NOW(), NOW()),
                ('newsletter_enabled', 'true', NOW(), NOW())
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        `);
        console.log('✅ Đã tạo settings\n');

        // 8. Tạo Product Variants
        console.log('📦 Tạo Product Variants...');
        await sequelize.query(`
            INSERT INTO product_variants (product_id, sku, price, stock_quantity, size_id, color_id, location, min_stock_level)
            SELECT 
                p.id, 
                p.slug || '-' || s.name || '-' || c.id, 
                p.price,
                ROUND(RANDOM() * 50 + 10),
                s.id,
                c.id,
                'Khu A',
                5
            FROM products p
            CROSS JOIN (SELECT id, name FROM sizes WHERE name IN ('S', 'M', 'L', 'XL')) s
            CROSS JOIN LATERAL (SELECT id FROM colors ORDER BY RANDOM() LIMIT 2) c
            ON CONFLICT DO NOTHING;
        `);
        console.log('✅ Đã tạo Product Variants\n');

        console.log('═══════════════════════════════════════');
        console.log('✨ HOÀN TẤT SEED DỮ LIỆU!\n');
        console.log('📊 Dữ liệu đã tạo:');
        console.log('   ✅ 4 Categories');
        console.log('   ✅ 2 Users (1 admin, 1 customer)');
        console.log('   ✅ 30 Products (Nike, Adidas, Gucci, Zara, H&M, Uniqlo)');
        console.log('   ✅ 5 Sizes (S, M, L, XL, XXL)');
        console.log('   ✅ 10 Colors');
        console.log('   ✅ Product Variants (Mỗi sản phẩm 4 sizes, 2 colors)');
        console.log('   ✅ 5 Coupons');
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
