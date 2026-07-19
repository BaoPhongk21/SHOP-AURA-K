const { sequelize } = require('../config/database');

const getSettings = async (req, res) => {
    try {
        const [settings] = await sequelize.query('SELECT * FROM settings LIMIT 1');

        let configData = {
            name: '',
            hotline: '',
            address: '',
            shippingFee: 0,
            mapUrl: '',
            paymentVcbActive: true,
            paymentMomoActive: true,
            paymentCodActive: false,
            shippingGhtkActive: true,
            shippingGhnActive: false,
            primaryColor: '#003178',
            themeMode: 'light',
            paymentVcbQr: '',
            paymentMomoQr: ''
        };

        if (settings && settings.length > 0) {
            const row = settings[0];
            configData = {
                name: row.name || '',
                hotline: row.hotline || '',
                address: row.address || '',
                shippingFee: row.shipping_fee || 0,
                mapUrl: row.map_url || '',
                paymentVcbActive: row.payment_vcb_active !== false && row.payment_vcb_active !== 0,
                paymentMomoActive: row.payment_momo_active !== false && row.payment_momo_active !== 0,
                paymentCodActive: row.payment_cod_active === true || row.payment_cod_active === 1,
                shippingGhtkActive: row.shipping_ghtk_active !== false && row.shipping_ghtk_active !== 0,
                shippingGhnActive: row.shipping_ghn_active === true || row.shipping_ghn_active === 1,
                primaryColor: row.primary_color || '#003178',
                themeMode: row.theme_mode || 'light',
                paymentVcbQr: row.payment_vcb_qr || '',
                paymentMomoQr: row.payment_momo_qr || ''
            };
        }

        res.status(200).json({ success: true, data: configData });
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(200).json({
            success: true, data: {
                name: '',
                hotline: '',
                address: '',
                shippingFee: 0,
                mapUrl: '',
                paymentVcbActive: true,
                paymentMomoActive: true,
                paymentCodActive: false,
                shippingGhtkActive: true,
                shippingGhnActive: false,
                primaryColor: '#003178',
                themeMode: 'light',
                paymentVcbQr: '',
                paymentMomoQr: ''
            }
        });
    }
};

const updateSettings = async (req, res) => {
    try {
        let configData = { ...req.body };

        // Xử lý file upload nếu có
        if (req.files) {
            if (req.files.vcbQr && req.files.vcbQr[0]) {
                configData.paymentVcbQr = `/uploads/settings/${req.files.vcbQr[0].filename}`;
            }
            if (req.files.momoQr && req.files.momoQr[0]) {
                configData.paymentMomoQr = `/uploads/settings/${req.files.momoQr[0].filename}`;
            }
        }

        const parseBool = (val) => {
            if (typeof val === 'boolean') return val;
            if (typeof val === 'string') return val.toLowerCase() === 'true' || val === '1';
            return val === 1 || val === true;
        };

        // Check if record exists
        const [existing] = await sequelize.query('SELECT id FROM settings LIMIT 1');

        if (existing && existing.length > 0) {
            // UPDATE if exists
            await sequelize.query(`
                UPDATE settings SET 
                    name = ?, 
                    hotline = ?, 
                    address = ?, 
                    shipping_fee = ?, 
                    map_url = ?, 
                    payment_vcb_active = ?, 
                    payment_momo_active = ?, 
                    payment_cod_active = ?, 
                    shipping_ghtk_active = ?, 
                    shipping_ghn_active = ?, 
                    primary_color = ?, 
                    theme_mode = ?,
                    payment_vcb_qr = COALESCE(?, payment_vcb_qr),
                    payment_momo_qr = COALESCE(?, payment_momo_qr),
                    updated_at = NOW()
                WHERE id = (SELECT id FROM settings LIMIT 1)
            `, {
                replacements: [
                    configData.name || '',
                    configData.hotline || '',
                    configData.address || '',
                    configData.shipping_fee !== undefined ? Number(configData.shipping_fee) : 0,
                    configData.map_url || configData.mapUrl || '',
                    parseBool(configData.payment_vcb_active ?? configData.paymentVcbActive),
                    parseBool(configData.payment_momo_active ?? configData.paymentMomoActive),
                    parseBool(configData.payment_cod_active ?? configData.paymentCodActive),
                    parseBool(configData.shipping_ghtk_active ?? configData.shippingGhtkActive),
                    parseBool(configData.shipping_ghn_active ?? configData.shippingGhnActive),
                    configData.primaryColor || null,
                    'light',
                    configData.payment_vcb_qr || configData.paymentVcbQr || null,
                    configData.payment_momo_qr || configData.paymentMomoQr || null
                ]
            });
        } else {
            // INSERT if not exists
            await sequelize.query(`
                INSERT INTO settings (id, name, hotline, address, shipping_fee, map_url, payment_vcb_active, payment_momo_active, payment_cod_active, shipping_ghtk_active, shipping_ghn_active, primary_color, theme_mode, payment_vcb_qr, payment_momo_qr) 
                VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, {
                replacements: [
                    configData.name || '',
                    configData.hotline || '',
                    configData.address || '',
                    configData.shipping_fee !== undefined ? Number(configData.shipping_fee) : 0,
                    configData.map_url || configData.mapUrl || '',
                    parseBool(configData.payment_vcb_active ?? configData.paymentVcbActive),
                    parseBool(configData.payment_momo_active ?? configData.paymentMomoActive),
                    parseBool(configData.payment_cod_active ?? configData.paymentCodActive),
                    parseBool(configData.shipping_ghtk_active ?? configData.shippingGhtkActive),
                    parseBool(configData.shipping_ghn_active ?? configData.shippingGhnActive),
                    configData.primaryColor || '#003178',
                    'light',
                    configData.payment_vcb_qr || configData.paymentVcbQr || null,
                    configData.payment_momo_qr || configData.paymentMomoQr || null
                ]
            });
        }

        // Fetch updated data to return — QUAN TRỌNG: Luôn query từ DB để đảm bảo trả về dữ liệu chính xác
        const [updatedSettings] = await sequelize.query('SELECT * FROM settings LIMIT 1');

        let responseData = configData;

        if (updatedSettings && updatedSettings.length > 0) {
            const row = updatedSettings[0];
            responseData = {
                name: row.name || '',
                hotline: row.hotline || '',
                address: row.address || '',
                shippingFee: row.shipping_fee || 0,
                mapUrl: row.map_url || '',
                paymentVcbActive: row.payment_vcb_active === true || row.payment_vcb_active === 1,
                paymentMomoActive: row.payment_momo_active === true || row.payment_momo_active === 1,
                paymentCodActive: row.payment_cod_active === true || row.payment_cod_active === 1,
                shippingGhtkActive: row.shipping_ghtk_active === true || row.shipping_ghtk_active === 1,
                shippingGhnActive: row.shipping_ghn_active === true || row.shipping_ghn_active === 1,
                primaryColor: row.primary_color || '#003178',
                themeMode: row.theme_mode || 'light',
                paymentVcbQr: row.payment_vcb_qr || '',
                paymentMomoQr: row.payment_momo_qr || ''
            };
        } else {
            // Nếu không có row từ DB, trả về configData nhưng normalize boolean
            responseData = {
                ...configData,
                paymentVcbActive: parseBool(configData.paymentVcbActive),
                paymentMomoActive: parseBool(configData.paymentMomoActive),
                paymentCodActive: parseBool(configData.paymentCodActive),
                shippingGhtkActive: parseBool(configData.shippingGhtkActive),
                shippingGhnActive: parseBool(configData.shippingGhnActive)
            };
        }

        res.status(200).json({ success: true, message: 'Cập nhật cấu hình thành công!', data: responseData });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi lưu cấu hình: ' + error.message });
    }
};

const getPublicFlashSale = async (req, res) => {
    try {
        const [settings] = await sequelize.query('SELECT flash_sale_end_time, flash_sale_product_ids, flash_sale_discount FROM settings LIMIT 1');
        if (settings && settings.length > 0 && settings[0].flash_sale_end_time && new Date(settings[0].flash_sale_end_time).getTime() > Date.now()) {
            const ids = settings[0].flash_sale_product_ids ? JSON.parse(settings[0].flash_sale_product_ids) : [];
            const discount = settings[0].flash_sale_discount || 20;
            
            let rawProducts = [];
            if (ids.length > 0) {
                // Specific products
                const placeholders = ids.map(() => '?').join(',');
                [rawProducts] = await sequelize.query(
                    `SELECT p.id, p.name, p.price, (SELECT image_url FROM product_images pi WHERE pi.product_id = p.id ORDER BY is_primary DESC LIMIT 1) as image_url, COALESCE((SELECT SUM(stock_quantity) FROM product_variants pv WHERE pv.product_id = p.id), 0) as stock_quantity FROM products p WHERE p.id IN (${placeholders})`,
                    { replacements: ids }
                );
            } else {
                // Global flash sale - all active products
                [rawProducts] = await sequelize.query(
                    `SELECT p.id, p.name, p.price, (SELECT image_url FROM product_images pi WHERE pi.product_id = p.id ORDER BY is_primary DESC LIMIT 1) as image_url, COALESCE((SELECT SUM(stock_quantity) FROM product_variants pv WHERE pv.product_id = p.id), 0) as stock_quantity FROM products p WHERE p.is_active IS NOT FALSE ORDER BY p.created_at DESC LIMIT 20`
                );
            }
            const products = rawProducts.map(p => {
                // Return the raw stored image path (e.g. /uploads/...) so frontend can resolve via getImageUrl
                const imageUrl = p.image_url ? p.image_url : null;
                return { ...p, imageUrl, image: imageUrl };
            });
            return res.status(200).json({ success: true, isActive: true, endTime: new Date(settings[0].flash_sale_end_time).getTime(), products, ids, discount });
        }
        res.status(200).json({ success: true, isActive: false });
    } catch (error) { 
        console.error('getPublicFlashSale error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' }); 
    }
};

const startFlashSale = async (req, res) => {
    try {
        const { productIds, durationHours, discountPercent } = req.body;

        // Nếu admin gửi danh sách sản phẩm cụ thể
        let ids = [];
        if (productIds && Array.isArray(productIds) && productIds.length > 0) {
            ids = productIds.map(Number);
        } else {
            // Fallback: lấy 4 sản phẩm mới nhất
            const [products] = await sequelize.query(`SELECT id FROM products WHERE price > 0 ORDER BY created_at DESC LIMIT 4`);
            if (products.length === 0) return res.status(400).json({ success: false, message: 'Không có sản phẩm nào.' });
            ids = products.map(p => p.id);
        }

        const duration = Number(durationHours) || 3; // Mặc định 3 tiếng
        const discount = Number(discountPercent) || 20; // Mặc định giảm 20%
        const endTime = new Date(Date.now() + duration * 60 * 60 * 1000);

        await sequelize.query(
            `UPDATE settings SET flash_sale_end_time = ?, flash_sale_product_ids = ?, flash_sale_discount = ? WHERE id = (SELECT id FROM settings LIMIT 1)`,
            { replacements: [endTime, JSON.stringify(ids), discount] }
        );

        res.status(200).json({ success: true, message: `Đã kích hoạt Flash Sale (${duration} tiếng, giảm ${discount}%) cho ${ids.length} sản phẩm!` });
    } catch (error) {
        console.error('Start flash sale error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi kích hoạt Flash Sale: ' + error.message });
    }
};

const stopFlashSale = async (req, res) => {
    try {
        await sequelize.query(
            `UPDATE settings SET flash_sale_end_time = NULL, flash_sale_product_ids = NULL, flash_sale_discount = NULL WHERE id = (SELECT id FROM settings LIMIT 1)`
        );
        res.status(200).json({ success: true, message: 'Đã dừng chương trình Flash Sale.' });
    } catch (error) {
        console.error('Stop flash sale error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi dừng Flash Sale' });
    }
};

const getFlashSaleAdmin = async (req, res) => {
    try {
        const [settings] = await sequelize.query('SELECT flash_sale_end_time, flash_sale_product_ids, flash_sale_discount FROM settings LIMIT 1');
        if (settings && settings.length > 0 && settings[0].flash_sale_end_time) {
            const ids = settings[0].flash_sale_product_ids ? JSON.parse(settings[0].flash_sale_product_ids) : [];
            const isActive = new Date(settings[0].flash_sale_end_time).getTime() > Date.now();

            let products = [];
            if (ids.length > 0) {
                const placeholders = ids.map(() => '?').join(',');
                const [rawProducts] = await sequelize.query(
                    `SELECT p.id, p.name, p.price, (SELECT image_url FROM product_images pi WHERE pi.product_id = p.id ORDER BY is_primary DESC LIMIT 1) as image_url FROM products p WHERE p.id IN (${placeholders})`,
                    { replacements: ids }
                );
                products = rawProducts.map(p => {
                    const imageUrl = p.image_url ? p.image_url : null;
                    return { ...p, imageUrl, image: imageUrl };
                });
            }

            return res.status(200).json({
                success: true,
                isActive,
                endTime: new Date(settings[0].flash_sale_end_time).getTime(),
                discount: settings[0].flash_sale_discount || 20,
                productIds: ids,
                products,
                isGlobal: ids.length === 0
            });
        }
        res.status(200).json({ success: true, isActive: false, productIds: [], products: [] });
    } catch (error) {
        console.error('Get flash sale admin error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

module.exports = { getSettings, updateSettings, getPublicFlashSale, startFlashSale, stopFlashSale, getFlashSaleAdmin };