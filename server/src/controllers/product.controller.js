const { sequelize } = require('../config/database');
const XLSX = require('xlsx');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Helper: Xây dựng URL hình ảnh đúng cho cả /static-assets/ và /uploads/
const buildImageUrl = (imageUrl) => {
    if (!imageUrl) return 'https://via.placeholder.com/300x300?text=No+Image';
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) return imageUrl;
    // URL đã đúng dạng /static-assets/ hoặc /uploads/ - giữ nguyên
    return imageUrl;
};

// Schema initialization logic has been moved to src/scripts/syncDatabase.js

const getAdminProducts = async (req, res) => {
    try {

        // TỐI ƯU: Thay thế các subquery bằng LEFT JOIN và GROUP BY để giảm tải cho DB
        const [products] = await sequelize.query(`
            SELECT 
                p.id, p.name, p.price, p.category_id, p.sku, p.brand, p.description, p.created_at,
                c.name as category_name,
                img.image_url,
                COALESCE(SUM(pv.stock_quantity), 0) as total_stock,
                COALESCE(
                    json_agg(
                        json_build_object('id', pv.id, 'size_id', pv.size_id, 'color_id', pv.color_id, 'quantity', pv.stock_quantity, 'size_name', s.name, 'color_name', co.name, 'location', pv.location, 'min_stock_level', pv.min_stock_level)
                    ) FILTER (WHERE pv.id IS NOT NULL), 
                    '[]'::json
                ) as variants
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN (
                SELECT DISTINCT ON (product_id) product_id, image_url 
                FROM product_images ORDER BY product_id, is_primary DESC, id DESC
            ) img ON p.id = img.product_id
            LEFT JOIN product_variants pv ON p.id = pv.product_id
            LEFT JOIN sizes s ON pv.size_id = s.id
            LEFT JOIN colors co ON pv.color_id = co.id
            WHERE p.is_active = true OR p.is_active IS NULL
            GROUP BY p.id, c.name, img.image_url
            ORDER BY p.created_at DESC
        `);

        // Tính toán thống kê trực tiếp bằng SQL để đạt hiệu năng tối đa
        const [[inventoryStats]] = await sequelize.query(`
            SELECT 
                COUNT(*) as "totalProducts",
                SUM(CASE WHEN COALESCE(vs.total_stock, 0) <= 5 AND COALESCE(vs.total_stock, 0) > 0 THEN 1 ELSE 0 END) as "lowStockCount",
                SUM(p.price * COALESCE(vs.total_stock, 0)) as "inventoryValue"
            FROM products p
            LEFT JOIN (
                SELECT product_id, SUM(stock_quantity) as total_stock FROM product_variants GROUP BY product_id
            ) vs ON p.id = vs.product_id
            WHERE p.is_active = true OR p.is_active IS NULL
        `);

        const totalProducts = Number(inventoryStats?.totalProducts || 0);
        const lowStockCount = Number(inventoryStats?.lowStockCount || 0);
        const inventoryValue = Number(inventoryStats?.inventoryValue || 0);

        const [categories] = await sequelize.query('SELECT id, name FROM categories ORDER BY name ASC');
        const [brands] = await sequelize.query("SELECT DISTINCT brand FROM products WHERE brand IS NOT NULL AND brand != '' ORDER BY brand ASC");
        const [skus] = await sequelize.query("SELECT DISTINCT sku FROM products WHERE sku IS NOT NULL AND sku != '' ORDER BY sku ASC");
        const [sizes] = await sequelize.query('SELECT id, name FROM sizes ORDER BY id ASC');
        const [colors] = await sequelize.query('SELECT id, name, hex_code FROM colors ORDER BY id ASC');

        const [recentSales] = await sequelize.query(`
            SELECT o.id as order_id, p.name as product_name, oi.quantity, o.created_at as log_time
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            JOIN products p ON oi.product_id = p.id
            WHERE o.status != 'cancelled'
            ORDER BY o.created_at DESC LIMIT 5
        `);
        const salesLogs = recentSales.map(sale => ({ id: `LOG-S${sale.order_id}-${Math.floor(Math.random() * 1000)}`, type: 'sale', title: `Đơn hàng #ORD-${sale.order_id}: -${sale.quantity} ${sale.product_name}`, actor: 'Hệ thống tự động', time: sale.log_time }));

        const [recentProducts] = await sequelize.query('SELECT id, name, created_at as log_time FROM products ORDER BY created_at DESC LIMIT 5');
        const importLogs = recentProducts.map(prod => ({ id: `LOG-P${prod.id}`, type: 'import', title: `Thêm mới: ${prod.name}`, actor: 'Admin', time: prod.log_time }));

        const inventoryLogs = [...salesLogs, ...importLogs].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 5);

        const [contacts] = await sequelize.query('SELECT * FROM contacts ORDER BY created_at DESC LIMIT 15');
        const unreadContactCount = contacts.filter(c => !c.is_read).length;

        const formattedProducts = products.map(p => {
            const imageUrl = buildImageUrl(p.image_url);
            return { ...p, imageUrl, image: imageUrl, image_url: imageUrl };
        });

        res.status(200).json({
            success: true,
            data: {
                stats: { totalProducts, lowStockCount, inventoryValue },
                products: formattedProducts, logs: inventoryLogs,
                formOptions: { categories: categories, brands: brands.map(b => b.brand), skus: skus.map(s => s.sku), sizes: sizes, colors: colors },
                contacts: contacts, unreadContactCount: unreadContactCount
            }
        });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách sản phẩm admin:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi lấy dữ liệu sản phẩm' });
    }
};

const createProduct = async (req, res) => {
    try {
        const { name, price, category_id, sku, brand, description } = req.body;
        const variants = req.body.variants ? JSON.parse(req.body.variants) : [];

        let imageUrl = null;
        if (req.file) {
            const originalPath = req.file.path;
            const newFilename = `${path.parse(req.file.filename).name}.webp`;
            const newPath = path.join(path.dirname(originalPath), newFilename);

            await sharp(originalPath)
                .resize({ width: 1200, fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 80 })
                .toFile(newPath);

            fs.unlinkSync(originalPath); // Xóa file gốc
            imageUrl = `/uploads/products/${newFilename}`; // Lưu đường dẫn file đã tối ưu
        }

        const [result] = await sequelize.query(
            'INSERT INTO products (name, price, category_id, sku, brand, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW()) RETURNING id',
            { replacements: [name, price || 0, category_id || null, sku || null, brand || null, description || null] }
        );
        const newProductId = result[0].id;

        if (imageUrl) {
            await sequelize.query('INSERT INTO product_images (product_id, image_url, is_primary) VALUES (?, ?, true)', { replacements: [newProductId, imageUrl] });
        }

        for (const variant of variants) {
            if (!variant.size_id && !variant.color_id) continue;
            await sequelize.query('INSERT INTO product_variants (product_id, size_id, color_id, stock_quantity) VALUES (?, ?, ?, ?)', { replacements: [newProductId, variant.size_id || null, variant.color_id || null, variant.quantity || 0] });
        }

        try {
            await sequelize.query(
                `INSERT INTO notifications (user_id, title, message, type, link) VALUES (NULL, ?, ?, ?, ?)`,
                { replacements: ['Sản phẩm mới', `Chúng tôi vừa ra mắt sản phẩm mới: ${name}. Khám phá ngay!`, 'system', `/product/${newProductId}`] }
            );
        } catch (e) { console.error('Lỗi tạo thông báo sp mới', e); }

        res.status(201).json({ success: true, message: 'Thêm sản phẩm thành công!' });
    } catch (error) { res.status(500).json({ success: false, message: 'Lỗi server khi thêm sản phẩm.' }); }
};

const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price, category_id, sku, brand, description } = req.body;
        const variants = req.body.variants ? JSON.parse(req.body.variants) : [];

        let imageUrl = null;
        if (req.file) {
            const originalPath = req.file.path;
            const newFilename = `${path.parse(req.file.filename).name}.webp`;
            const newPath = path.join(path.dirname(originalPath), newFilename);

            await sharp(originalPath)
                .resize({ width: 1200, fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 80 })
                .toFile(newPath);

            fs.unlinkSync(originalPath); // Xóa file gốc
            imageUrl = `/uploads/products/${newFilename}`; // Lưu đường dẫn file đã tối ưu
        }

        await sequelize.query(
            'UPDATE products SET name = ?, price = ?, category_id = ?, sku = ?, brand = ?, description = ?, updated_at = NOW() WHERE id = ?',
            { replacements: [name, price || 0, category_id || null, sku || null, brand || null, description || null, id] }
        );

        if (imageUrl) {
            await sequelize.query('INSERT INTO product_images (product_id, image_url, is_primary) VALUES (?, ?, true)', { replacements: [id, imageUrl] });
        }

        // Lấy danh sách biến thể hiện tại của sản phẩm để quản lý xóa mềm/cập nhật
        const [existingVariants] = await sequelize.query('SELECT id, size_id, color_id FROM product_variants WHERE product_id = ?', { replacements: [id] });

        // Tạo map để so sánh nhanh
        const newVariantKeys = variants.map(v => `${v.size_id || 'null'}-${v.color_id || 'null'}`);
        
        // Xóa những biến thể không còn trong form (xóa cứng nếu có thể, hoặc bỏ qua vì ON DELETE CASCADE từ giỏ hàng nếu cần, nhưng tạm thời DELETE)
        for (const ex of existingVariants) {
            const key = `${ex.size_id || 'null'}-${ex.color_id || 'null'}`;
            if (!newVariantKeys.includes(key)) {
                await sequelize.query('DELETE FROM product_variants WHERE id = ?', { replacements: [ex.id] });
            }
        }

        // Cập nhật hoặc thêm mới các biến thể
        for (const variant of variants) {
            if (!variant.size_id && !variant.color_id) continue;
            const sizeId = variant.size_id || null;
            const colorId = variant.color_id || null;
            const qty = variant.quantity || 0;

            const existing = existingVariants.find(ex => (ex.size_id == sizeId || (!ex.size_id && !sizeId)) && (ex.color_id == colorId || (!ex.color_id && !colorId)));
            
            if (existing) {
                await sequelize.query('UPDATE product_variants SET stock_quantity = ?, updated_at = NOW() WHERE id = ?', { replacements: [qty, existing.id] });
            } else {
                await sequelize.query('INSERT INTO product_variants (product_id, size_id, color_id, stock_quantity) VALUES (?, ?, ?, ?)', { replacements: [id, sizeId, colorId, qty] });
            }
        }

        res.status(200).json({ success: true, message: 'Cập nhật sản phẩm thành công!' });
    } catch (error) { res.status(500).json({ success: false, message: 'Lỗi server khi cập nhật sản phẩm.' }); }
};

const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        // Soft delete
        await sequelize.query('UPDATE products SET is_active = false, updated_at = NOW() WHERE id = ?', { replacements: [id] });

        res.status(200).json({ success: true, message: 'Xóa sản phẩm thành công!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Không thể xóa sản phẩm này. Có thể nó đang tồn tại trong các Đơn hàng hoặc Giỏ hàng.' });
    }
};

const getAllProducts = async (req, res) => {
    try {
        // BẢN VÁ: Đảm bảo các bảng có đủ cột trước khi truy vấn để tránh lỗi 500

        let { page, limit, search, category, sort, minPrice, maxPrice, size, color } = req.query;
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 12; // Mặc định 12 sản phẩm mỗi trang
        const offset = (page - 1) * limit;

        let conditions = [];
        let replacements = {};

        if (search) {
            conditions.push("(p.name ILIKE :search OR p.description ILIKE :search)");
            replacements.search = `%${search}%`;
        }

        if (category) {
            conditions.push("p.category_id = :category");
            replacements.category = category;
        }

        if (minPrice) {
            conditions.push("p.price >= :minPrice");
            replacements.minPrice = minPrice;
        }

        if (maxPrice) {
            conditions.push("p.price <= :maxPrice");
            replacements.maxPrice = maxPrice;
        }

        if (size) {
            conditions.push("EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id AND pv.size_id = :size)");
            replacements.size = size;
        }

        if (color) {
            conditions.push("EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id AND pv.color_id = :color)");
            replacements.color = color;
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        let orderClause = "ORDER BY p.created_at DESC"; // default
        if (sort === 'price_asc') orderClause = "ORDER BY p.price ASC";
        if (sort === 'price_desc') orderClause = "ORDER BY p.price DESC";
        if (sort === 'newest') orderClause = "ORDER BY p.created_at DESC";

        const countQuery = `SELECT COUNT(*) as total FROM products p ${whereClause}`;
        const [countResult] = await sequelize.query(countQuery, { replacements });
        const totalItems = parseInt(countResult[0].total);
        const totalPages = Math.ceil(totalItems / limit);

        replacements.limit = limit;
        replacements.offset = offset;

        const dataQuery = `
            SELECT 
                p.id, p.name, p.price, p.category_id, p.sku, p.brand, p.description, p.created_at,
                c.name as category_name,
                img.image_url,
                COALESCE(vs.total_stock, 0) as total_stock
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN (
                SELECT DISTINCT ON (product_id) product_id, image_url FROM product_images ORDER BY product_id, is_primary DESC, id DESC
            ) img ON p.id = img.product_id
            LEFT JOIN (
                SELECT product_id, SUM(stock_quantity) as total_stock FROM product_variants GROUP BY product_id
            ) vs ON p.id = vs.product_id
            ${whereClause}
            ${orderClause}
            LIMIT :limit OFFSET :offset
        `;
        const [products] = await sequelize.query(dataQuery, { replacements });

        const formattedProducts = products.map(p => {
            const finalImageUrl = buildImageUrl(p.image_url);
            return {
                ...p,
                image: finalImageUrl,
                imageUrl: finalImageUrl,
                images: p.image_url ? [{ image_url: finalImageUrl, is_primary: true }] : []
            };
        });

        res.status(200).json({
            success: true,
            data: formattedProducts,
            pagination: {
                totalItems,
                totalPages,
                currentPage: page,
                limit
            }
        });
    } catch (error) {
        console.error('Lỗi getAllProducts:', error.message || error);
        console.error('Stack:', error.stack);
        res.status(500).json({ success: false, message: 'Lỗi server khi lấy dữ liệu sản phẩm', error: error.message });
    }
};

const getProductById = async (req, res) => {
    try {
        // BẢN VÁ: Đảm bảo các bảng có đủ cột trước khi truy vấn để tránh lỗi 500

        const { id } = req.params;
        const [[product]] = await sequelize.query(`
            SELECT
                p.id, p.name, p.price, p.category_id, p.sku, p.brand, p.description, p.created_at,
                c.name as category_name,
                img.image_url,
                COALESCE(var.total_stock, 0) as total_stock,
                COALESCE(var.variants, '[]'::json) as variants
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN (
                SELECT DISTINCT ON (product_id) product_id, image_url FROM product_images ORDER BY product_id, is_primary DESC, id DESC
            ) img ON p.id = img.product_id
            LEFT JOIN (
                SELECT pv.product_id, SUM(pv.stock_quantity) as total_stock, 
                       json_agg(json_build_object(
                           'size_id', pv.size_id, 
                           'quantity', pv.stock_quantity, 
                           'size_name', s.name,
                           'color_id', pv.color_id,
                           'color_name', cl.name,
                           'color_hex', cl.hex_code
                       )) as variants
                FROM product_variants pv 
                LEFT JOIN sizes s ON pv.size_id = s.id
                LEFT JOIN colors cl ON pv.color_id = cl.id
                GROUP BY pv.product_id
            ) var ON p.id = var.product_id
            WHERE p.id = ?
        `, { replacements: [id] });

        if (!product) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });

        // Lấy tất cả hình ảnh của sản phẩm để Frontend làm slider/gallery
        const [images] = await sequelize.query('SELECT image_url, is_primary FROM product_images WHERE product_id = ? ORDER BY is_primary DESC', { replacements: [id] });

        const finalImageUrl = buildImageUrl(product.image_url);
        product.image = finalImageUrl;
        product.imageUrl = finalImageUrl;
        const finalImages = images.map(img => ({ ...img, image_url: buildImageUrl(img.image_url) }));
        product.images = finalImages.length > 0 ? finalImages : [{ image_url: finalImageUrl, is_primary: true }];

        res.status(200).json({ success: true, data: product });
    } catch (error) {
        console.error('Lỗi khi lấy chi tiết sản phẩm:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi lấy chi tiết sản phẩm' });
    }
};

const getBestSellingProducts = async (req, res) => {
    try {
        const [products] = await sequelize.query(`
            SELECT 
                p.id, p.name, p.price, p.brand,
                SUM(oi.quantity) as total_sold,
                (SELECT image_url FROM product_images pi WHERE pi.product_id = p.id ORDER BY is_primary DESC LIMIT 1) as image_url
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            JOIN products p ON oi.product_id = p.id
            WHERE o.status != 'cancelled'
            GROUP BY p.id, p.name, p.price, p.brand
            ORDER BY total_sold DESC
            LIMIT 8
        `);

        const formattedProducts = products.map(p => {
            const finalImageUrl = buildImageUrl(p.image_url);
            return {
                ...p,
                image: finalImageUrl,
                imageUrl: finalImageUrl,
                images: p.image_url ? [{ image_url: finalImageUrl, is_primary: true }] : []
            };
        });
        res.status(200).json({ success: true, data: formattedProducts });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server khi lấy sản phẩm bán chạy' });
    }
};

const getProductReviews = async (req, res) => {
    try {
        const { id } = req.params;

        // Tự động tạo bảng nếu chưa có
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS product_reviews (
                id SERIAL PRIMARY KEY,
                product_id INTEGER,
                user_id INTEGER,
                rating INTEGER,
                comment TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `).catch(() => { });

        // Lấy danh sách đánh giá kèm thông tin User
        const [reviews] = await sequelize.query(`
            SELECT pr.*, u.name, u.avatar
            FROM product_reviews pr
            JOIN users u ON pr.user_id = u.id
            WHERE pr.product_id = ?
            ORDER BY pr.created_at DESC
        `, { replacements: [id] });

        const formattedReviews = reviews.map(r => ({
            id: r.id,
            rating: r.rating,
            comment: r.comment,
            created_at: r.created_at,
            user: {
                full_name: r.name || 'Khách hàng',
                avatar_url: r.avatar || 'https://via.placeholder.com/150'
            }
        }));

        res.status(200).json({ success: true, data: formattedReviews });
    } catch (error) {
        console.error('Lỗi khi lấy đánh giá:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi lấy đánh giá.' });
    }
};

const addProductReview = async (req, res) => {
    try {
        const { id } = req.params; // ID của sản phẩm
        const { rating, comment } = req.body;
        const userId = req.user.id; // Lấy ID của user từ token

        if (!rating || !comment) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ số sao và bình luận.' });
        }

        // KIỂM TRA: Khách hàng phải từng mua sản phẩm và đơn hàng đã được giao (delivered)
        const [validOrders] = await sequelize.query(`
            SELECT o.id 
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            WHERE o.user_id = ? AND oi.product_id = ? AND o.status IN ('delivered', 'completed')
            LIMIT 1
        `, { replacements: [userId, id] });

        if (validOrders.length === 0) {
            return res.status(403).json({ success: false, message: 'Bạn chỉ có thể đánh giá sau khi đã mua sản phẩm này và đơn hàng đã được giao thành công.' });
        }

        const [result] = await sequelize.query(`
            INSERT INTO product_reviews (product_id, user_id, rating, comment, created_at)
            VALUES (?, ?, ?, ?, NOW()) RETURNING id, rating, comment, created_at
        `, { replacements: [id, userId, rating, comment] });

        res.status(201).json({ success: true, message: 'Thêm đánh giá thành công', data: result[0] });
    } catch (error) {
        console.error('Lỗi thêm đánh giá:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi gửi đánh giá.' });
    }
};

const updateInventoryStock = async (req, res) => {
    try {
        const { variant_id, quantity, type, reason } = req.body; // type: 'set', 'add', 'subtract'

        let updateQuery = '';
        let replacements = [variant_id];
        let transType = '';

        if (type === 'add') {
            updateQuery = 'UPDATE product_variants SET stock_quantity = stock_quantity + ? WHERE id = ?';
            replacements = [quantity, variant_id];
            transType = 'IN';
        } else if (type === 'subtract') {
            updateQuery = 'UPDATE product_variants SET stock_quantity = GREATEST(0, stock_quantity - ?) WHERE id = ?';
            replacements = [quantity, variant_id];
            transType = 'OUT';
        } else {
            updateQuery = 'UPDATE product_variants SET stock_quantity = ? WHERE id = ?';
            replacements = [quantity, variant_id];
            transType = 'ADJUST';
        }

        await sequelize.query(updateQuery, { replacements });

        // Log transaction
        const performedBy = req.user ? (req.user.name || req.user.email) : 'System';

        await sequelize.query(
            `INSERT INTO inventory_transactions (variant_id, type, quantity, reason, performed_by, created_at) 
             VALUES (?, ?, ?, ?, ?, NOW())`,
            { replacements: [variant_id, transType, quantity, reason || 'Điều chỉnh thủ công', performedBy] }
        );

        res.status(200).json({ success: true, message: 'Cập nhật kho hàng thành công!' });
    } catch (error) {
        console.error('Update Stock Error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi cập nhật kho hàng.' });
    }
};

const getInventoryHistory = async (req, res) => {
    try {
        const [history] = await sequelize.query(`
            SELECT it.*, pv.sku, p.name as product_name, s.name as size_name, c.name as color_name
            FROM inventory_transactions it
            JOIN product_variants pv ON it.variant_id = pv.id
            JOIN products p ON pv.product_id = p.id
            LEFT JOIN sizes s ON pv.size_id = s.id
            LEFT JOIN colors c ON pv.color_id = c.id
            ORDER BY it.created_at DESC
            LIMIT 100
        `);
        res.status(200).json({ success: true, data: history });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server khi lấy lịch sử kho.' });
    }
};

const updateVariantSettings = async (req, res) => {
    try {
        const { id } = req.params;
        const { location, min_stock_level } = req.body;

        await sequelize.query(
            'UPDATE product_variants SET location = ?, min_stock_level = ?, updated_at = NOW() WHERE id = ?',
            { replacements: [location, min_stock_level, id] }
        );

        res.status(200).json({ success: true, message: 'Cập nhật cấu hình kho thành công!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server khi cập nhật cấu hình.' });
    }
};

const processInboundBatch = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { items } = req.body;
        const performedBy = req.user.name || req.user.email || 'Admin';

        for (const item of items) {
            // Update stock
            await sequelize.query(
                'UPDATE product_variants SET stock_quantity = stock_quantity + ?, updated_at = NOW() WHERE id = ?',
                { replacements: [item.quantity, item.variant_id], transaction: t }
            );

            // Log transaction
            await sequelize.query(
                'INSERT INTO inventory_transactions (variant_id, type, quantity, reason, performed_by, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
                { replacements: [item.variant_id, 'IN', item.quantity, 'Nhập kho hàng loạt (Inbound)', performedBy], transaction: t }
            );
        }

        await t.commit();
        res.status(200).json({ success: true, message: 'Đã xử lý nhập kho hàng loạt thành công!' });
    } catch (error) {
        await t.rollback();
        console.error('Inbound Error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi xử lý nhập kho.' });
    }
};

const importProductsBulk = async (req, res) => {
    const filePath = req.file?.path;
    if (!filePath) return res.status(400).json({ success: false, message: 'Không tìm thấy file tải lên.' });

    const t = await sequelize.transaction();
    try {
        const workbook = XLSX.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet);

        let successCount = 0;
        const performedBy = req.user.name || req.user.email || 'Admin';

        for (const row of data) {
            // Chuẩn hóa tên trường (hỗ trợ cả tiếng Việt và tiếng Anh trong header file)
            const name = row['Tên'] || row['Name'] || row['name'];
            const price = parseFloat(row['Giá'] || row['Price'] || row['price'] || 0);
            const categoryName = row['Danh mục'] || row['Category'] || row['category'];
            const sku = row['SKU'] || row['sku'];
            const brand = row['Thương hiệu'] || row['Brand'] || row['brand'];
            const description = row['Mô tả'] || row['Description'] || row['description'];
            const sizeName = String(row['Size'] || row['size'] || '').trim();
            const quantity = parseInt(row['Số lượng'] || row['Quantity'] || row['quantity'] || 0);

            if (!name || !sku) continue;

            // 1. Xử lý Danh mục
            let categoryId = null;
            if (categoryName) {
                const [catRows] = await sequelize.query('SELECT id FROM categories WHERE name ILIKE ? LIMIT 1', { replacements: [categoryName], transaction: t });
                if (catRows && catRows.length > 0) {
                    categoryId = catRows[0].id;
                } else {
                    const [newCat] = await sequelize.query('INSERT INTO categories (name, created_at, updated_at) VALUES (?, NOW(), NOW()) RETURNING id', { replacements: [categoryName], transaction: t });
                    categoryId = newCat[0].id;
                }
            }

            // 2. Xử lý Sản phẩm (Dựa vào SKU)
            let productId;
            const [prodRows] = await sequelize.query('SELECT id FROM products WHERE sku = ? LIMIT 1', { replacements: [sku], transaction: t });
            if (prodRows && prodRows.length > 0) {
                productId = prodRows[0].id;
                await sequelize.query(
                    'UPDATE products SET name = ?, price = ?, category_id = ?, brand = ?, description = ?, updated_at = NOW() WHERE id = ?',
                    { replacements: [name, price, categoryId, brand, description, productId], transaction: t }
                );
            } else {
                const [newProd] = await sequelize.query(
                    'INSERT INTO products (name, price, category_id, sku, brand, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW()) RETURNING id',
                    { replacements: [name, price, categoryId, sku, brand, description], transaction: t }
                );
                productId = newProd[0].id;
            }

            // 3. Xử lý Biến thể & Kích cỡ
            if (sizeName) {
                let sizeId = null;
                const [sizeRows] = await sequelize.query('SELECT id FROM sizes WHERE name ILIKE ? LIMIT 1', { replacements: [sizeName], transaction: t });
                if (sizeRows && sizeRows.length > 0) {
                    sizeId = sizeRows[0].id;
                } else {
                    const [newSz] = await sequelize.query('INSERT INTO sizes (name) VALUES (?) RETURNING id', { replacements: [sizeName], transaction: t });
                    sizeId = newSz[0].id;
                }

                const [variantRows] = await sequelize.query('SELECT id FROM product_variants WHERE product_id = ? AND size_id = ? LIMIT 1', { replacements: [productId, sizeId], transaction: t });
                let variantId;
                if (variantRows && variantRows.length > 0) {
                    variantId = variantRows[0].id;
                    await sequelize.query('UPDATE product_variants SET stock_quantity = stock_quantity + ?, updated_at = NOW() WHERE id = ?', { replacements: [quantity, variantId], transaction: t });
                } else {
                    const [newVar] = await sequelize.query('INSERT INTO product_variants (product_id, size_id, stock_quantity, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW()) RETURNING id', { replacements: [productId, sizeId, quantity], transaction: t });
                    variantId = newVar[0].id;
                }

                // 4. Ghi nhật ký kho hàng
                await sequelize.query(
                    'INSERT INTO inventory_transactions (variant_id, type, quantity, reason, performed_by, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
                    { replacements: [variantId, 'IN', quantity, 'Nhập kho hàng loạt (Bulk Import)', performedBy], transaction: t }
                );
            }
            successCount++;
        }

        await t.commit();
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath); // Xóa file tạm sau khi xong
        res.status(200).json({ success: true, message: `Đã xử lý file thành công. Nhập/Cập nhật ${successCount} sản phẩm.` });
    } catch (error) {
        if (t) await t.rollback();
        if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
        console.error('Bulk Import Error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi xử lý file nhập kho: ' + error.message });
    }
};

const getWarehouseLocations = async (req, res) => {
    try {
        const [locations] = await sequelize.query('SELECT * FROM warehouse_locations ORDER BY zone ASC, shelf ASC');
        res.status(200).json({ success: true, data: locations });
    } catch (error) {
        console.error('Error getting warehouse locations:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi lấy danh sách vị trí lưu trữ.' });
    }
};

const createLocation = async (req, res) => {
    try {
        const { zone, shelf, description, code } = req.body;
        await sequelize.query(
            'INSERT INTO warehouse_locations (zone, shelf, description, code) VALUES (?, ?, ?, ?)',
            { replacements: [zone, shelf, description, code] }
        );
        res.status(201).json({ success: true, message: 'Thêm vị trí mới thành công' });
    } catch (error) {
        console.error('Error creating location:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi thêm vị trí' });
    }
};

const updateLocation = async (req, res) => {
    try {
        const { id } = req.params;
        const { zone, shelf, description, code } = req.body;
        await sequelize.query(
            'UPDATE warehouse_locations SET zone = ?, shelf = ?, description = ?, code = ? WHERE id = ?',
            { replacements: [zone, shelf, description, code, id] }
        );
        res.status(200).json({ success: true, message: 'Cập nhật vị trí thành công' });
    } catch (error) {
        console.error('Error updating location:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi cập nhật vị trí' });
    }
};

const deleteLocation = async (req, res) => {
    try {
        const { id } = req.params;
        await sequelize.query('DELETE FROM warehouse_locations WHERE id = ?', { replacements: [id] });
        res.status(200).json({ success: true, message: 'Xóa vị trí thành công' });
    } catch (error) {
        console.error('Error deleting location:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi xóa vị trí' });
    }
};

module.exports = {
    getAdminProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    getAllProducts,
    importProductsBulk,
    getProductById,
    getBestSellingProducts,
    getProductReviews,
    addProductReview,
    updateInventoryStock,
    getInventoryHistory,
    updateVariantSettings,
    processInboundBatch,
    getWarehouseLocations,
    createLocation,
    updateLocation,
    deleteLocation
};