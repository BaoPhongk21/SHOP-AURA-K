const Cart = require('../models/Cart');
const CartItem = require('../models/CartItem');
const Product = require('../models/Product');
const ProductImage = require('../models/ProductImage');
const { sequelize } = require('../config/database');

// Chức năng: Lấy giỏ hàng của người dùng
const getUserCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const [items] = await sequelize.query(`
            SELECT 
                ci.id as "cartItemId",
                p.id,
                p.name,
                p.category_id,
                p.price as price_at_add,
                ci.quantity,
                s.name as size,
                c_color.name as color,
                (SELECT image_url FROM product_images pi WHERE pi.product_id = p.id ORDER BY is_primary DESC LIMIT 1) as image_url
            FROM cart_items ci
            JOIN carts c ON ci.cart_id = c.id
            JOIN products p ON ci.product_id = p.id
            LEFT JOIN product_variants v ON ci.variant_id = v.id
            LEFT JOIN sizes s ON v.size_id = s.id
            LEFT JOIN colors c_color ON v.color_id = c_color.id
            WHERE c.user_id = ?
        `, { replacements: [userId] });

        // TỰ ĐỘNG GỘP: Xử lý gộp các sản phẩm bị trùng lặp (cùng ID, cùng Size) 
        // Đề phòng trường hợp CSDL đã có sẵn dữ liệu lỗi từ trước.
        const itemMap = new Map();
        items.forEach(item => {
            const key = `${item.id}-${String(item.size || '').trim()}-${String(item.color || '').trim()}`;
            if (itemMap.has(key)) {
                itemMap.get(key).quantity += item.quantity;
            } else {
                itemMap.set(key, { ...item });
            }
        });

        const formattedItems = Array.from(itemMap.values()).map(item => ({
            cartItemId: item.cartItemId,
            id: item.id,
            name: item.name || 'Sản phẩm không còn tồn tại',
            price: parseFloat(item.price_at_add || 0),
            quantity: item.quantity,
            size: item.size,
            color: item.color,
            productId: item.id,
            category_id: item.category_id,
            image: item.image_url, // Frontend sẽ dùng getImageUrl để xử lý
            image_url: item.image_url, // Giữ nguyên để tương thích
            imageUrl: item.image_url // Giữ nguyên để tương thích
        }));

        res.status(200).json({ success: true, data: { items: formattedItems } });

    } catch (error) {
        console.error('Lỗi khi lấy giỏ hàng:', error);
        res.status(500).json({ success: false, message: 'Lỗi server nội bộ.' });
    }
};

// Chức năng: Thêm sản phẩm vào giỏ hàng
const addToCart = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Người dùng chưa đăng nhập.' });
        }

        const { productId, quantity, size, color } = req.body;

        // Validate input data
        if (!productId || typeof productId !== 'number' && typeof productId !== 'string') {
            return res.status(400).json({ success: false, message: 'productId không hợp lệ.' });
        }

        const parsedQuantity = parseInt(quantity);
        if (isNaN(parsedQuantity) || parsedQuantity < 1) {
            return res.status(400).json({ success: false, message: 'Số lượng phải là số nguyên dương.' });
        }

        let [cartRows] = await sequelize.query('SELECT id FROM carts WHERE user_id = ?', { replacements: [userId] });
        let cartId;
        if (!cartRows || cartRows.length === 0) {
            const [newCartRows] = await sequelize.query('INSERT INTO carts (user_id) VALUES (?) RETURNING id', { replacements: [userId] });
            cartId = newCartRows[0].id;
        } else {
            cartId = cartRows[0].id;
        }

        const [[product]] = await sequelize.query('SELECT id, price FROM products WHERE id = ?', { replacements: [productId] });
        if (!product) return res.status(404).json({ success: false, message: 'Sản phẩm không tồn tại.' });

        const normalizedSize = size ? String(size).trim() : null;
        const normalizedColor = color ? String(color).trim() : null;
        let variantId = null;

        if (normalizedSize || normalizedColor) {
            let query = `
                SELECT v.id FROM product_variants v
                LEFT JOIN sizes s ON v.size_id = s.id
                LEFT JOIN colors c ON v.color_id = c.id
                WHERE v.product_id = ?
            `;
            let replacements = [productId];

            if (normalizedSize) {
                query += ` AND s.name = ?`;
                replacements.push(normalizedSize);
            }
            if (normalizedColor) {
                query += ` AND c.name = ?`;
                replacements.push(normalizedColor);
            }
            query += ` LIMIT 1`;

            const [[variant]] = await sequelize.query(query, { replacements });
            if (variant) variantId = variant.id;
        }

        const [[cartItem]] = await sequelize.query(`
            SELECT id, quantity FROM cart_items 
            WHERE cart_id = ? AND product_id = ? AND (variant_id = ? OR (variant_id IS NULL AND ? IS NULL))
        `, { replacements: [cartId, productId, variantId, variantId] });

        let currentCartQuantity = cartItem ? Number(cartItem.quantity) : 0;
        let newCartQuantity = currentCartQuantity + parsedQuantity;

        // Kiểm tra tồn kho trước khi thêm/cập nhật giỏ hàng
        if (variantId) {
            const [[variantStock]] = await sequelize.query('SELECT stock_quantity FROM product_variants WHERE id = ?', { replacements: [variantId] });
            if (variantStock && typeof variantStock.stock_quantity !== 'undefined') {
                const available = Number(variantStock.stock_quantity || 0);
                if (available < 0 || newCartQuantity > available) {
                    return res.status(400).json({ success: false, message: 'Số lượng đặt vượt quá tồn kho hiện có.' });
                }
            }
        }

        if (cartItem) {
            await sequelize.query('UPDATE cart_items SET quantity = quantity + ? WHERE id = ?', { replacements: [parsedQuantity, cartItem.id] });
        } else {
            await sequelize.query(`
                INSERT INTO cart_items (cart_id, product_id, variant_id, quantity) 
                VALUES (?, ?, ?, ?)
            `, { replacements: [cartId, productId, variantId, parsedQuantity] });
        }

        res.status(200).json({ success: true, message: 'Đã thêm vào giỏ hàng.', data: cartItem });
    } catch (error) {
        console.error('Lỗi addToCart:', error);
        res.status(500).json({ success: false, message: 'Lỗi server.' });
    }
};

const updateCartItem = async (req, res) => {
    try {
        const { quantity } = req.body;
        const itemId = req.params?.itemId;

        // Validate input data
        if (!itemId || (typeof itemId !== 'string' && typeof itemId !== 'number')) {
            return res.status(400).json({ success: false, message: 'itemId không hợp lệ.' });
        }

        const parsedQuantity = parseInt(quantity);
        if (isNaN(parsedQuantity) || parsedQuantity < 0) {
            return res.status(400).json({ success: false, message: 'Số lượng phải là số nguyên không âm.' });
        }

        const [[cartItem]] = await sequelize.query('SELECT id FROM cart_items WHERE id = ?', { replacements: [itemId] });
        if (!cartItem) return res.status(404).json({ success: false, message: 'Mục không tồn tại.' });

        if (parsedQuantity === 0) {
            // Nếu quantity = 0, xóa sản phẩm khỏi giỏ hàng
            await sequelize.query('DELETE FROM cart_items WHERE id = ?', { replacements: [itemId] });
            res.status(200).json({ success: true, message: 'Đã xóa sản phẩm khỏi giỏ hàng.' });
        } else {
            await sequelize.query('UPDATE cart_items SET quantity = ? WHERE id = ?', { replacements: [parsedQuantity, itemId] });
            res.status(200).json({ success: true, message: 'Đã cập nhật số lượng.' });
        }
    } catch (error) {
        console.error('Lỗi updateCartItem:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi cập nhật giỏ hàng.' });
    }
};

const removeCartItem = async (req, res) => {
    try {
        const itemId = req.params?.itemId;

        // Validate input data
        if (!itemId || (typeof itemId !== 'string' && typeof itemId !== 'number')) {
            return res.status(400).json({ success: false, message: 'itemId không hợp lệ.' });
        }

        const result = await sequelize.query('DELETE FROM cart_items WHERE id = ? RETURNING id', { replacements: [itemId] });
        if (result[0].length === 0) {
            return res.status(404).json({ success: false, message: 'Sản phẩm không tồn tại trong giỏ hàng.' });
        }

        res.status(200).json({ success: true, message: 'Đã xóa sản phẩm.' });
    } catch (error) {
        console.error('Lỗi removeCartItem:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi xóa sản phẩm.' });
    }
};

const mergeLocalCart = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Người dùng chưa đăng nhập.' });
        }

        const { cartItems: localCartItems } = req.body; // SỬA LỖI: Đổi tên từ localCart -> cartItems để khớp với Frontend

        if (!localCartItems || !Array.isArray(localCartItems) || localCartItems.length === 0) {
            return res.status(200).json({ success: true, message: 'Không có dữ liệu để đồng bộ.' });
        }

        let [cartRows] = await sequelize.query('SELECT id FROM carts WHERE user_id = ?', { replacements: [userId] });
        let cartId;
        if (!cartRows || cartRows.length === 0) {
            const [newCartRows] = await sequelize.query('INSERT INTO carts (user_id) VALUES (?) RETURNING id', { replacements: [userId] });
            cartId = newCartRows[0].id;
        } else {
            cartId = cartRows[0].id;
        }

        // Lặp qua từng sản phẩm trong giỏ hàng local để thêm vào giỏ hàng DB
        for (const item of localCartItems) {
            try {
                // Tùy thuộc vào cấu trúc item Frontend gửi lên (item.id hoặc item.productId)
                const productId = item.productId || item.id;
                if (!productId) continue;

                // Validate quantity
                const parsedQuantity = parseInt(item.quantity || 1);
                if (isNaN(parsedQuantity) || parsedQuantity < 1) continue;

                const [[product]] = await sequelize.query('SELECT id FROM products WHERE id = ?', { replacements: [productId] });
                if (!product) continue;

                const normalizedSize = item.size ? String(item.size).trim() : null;
                const normalizedColor = item.color ? String(item.color).trim() : null;
                let variantId = null;

                if (normalizedSize || normalizedColor) {
                    let query = `
                        SELECT v.id FROM product_variants v
                        LEFT JOIN sizes s ON v.size_id = s.id
                        LEFT JOIN colors c ON v.color_id = c.id
                        WHERE v.product_id = ?
                    `;
                    let replacements = [productId];

                    if (normalizedSize) {
                        query += ` AND s.name = ?`;
                        replacements.push(normalizedSize);
                    }
                    if (normalizedColor) {
                        query += ` AND c.name = ?`;
                        replacements.push(normalizedColor);
                    }
                    query += ` LIMIT 1`;

                    const [[variant]] = await sequelize.query(query, { replacements });
                    if (variant) variantId = variant.id;
                }

                const [[cartItem]] = await sequelize.query(`
                    SELECT id, quantity FROM cart_items 
                    WHERE cart_id = ? AND product_id = ? AND (variant_id = ? OR (variant_id IS NULL AND ? IS NULL))
                `, { replacements: [cartId, productId, variantId, variantId] });

                if (cartItem) {
                    await sequelize.query('UPDATE cart_items SET quantity = quantity + ? WHERE id = ?', { replacements: [parsedQuantity, cartItem.id] });
                } else {
                    // Kiểm tra tồn kho trước khi chèn
                    if (variantId) {
                        const [[variantStock]] = await sequelize.query('SELECT stock_quantity FROM product_variants WHERE id = ?', { replacements: [variantId] });
                        const available = variantStock ? Number(variantStock.stock_quantity || 0) : 0;
                        if (available <= 0) continue; // skip out-of-stock
                        const toInsertQty = Math.min(parsedQuantity, available);
                        await sequelize.query(`
                            INSERT INTO cart_items (cart_id, product_id, variant_id, quantity) 
                            VALUES (?, ?, ?, ?)
                        `, { replacements: [cartId, productId, variantId, toInsertQty] });
                    } else {
                        await sequelize.query(`
                            INSERT INTO cart_items (cart_id, product_id, variant_id, quantity) 
                            VALUES (?, ?, ?, ?)
                        `, { replacements: [cartId, productId, variantId, parsedQuantity] });
                    }
                }
            } catch (itemError) {
                console.error(`Lỗi khi xử lý item ${item.productId || item.id}:`, itemError);
                // Continue với item tiếp theo thay vì fail toàn bộ
            }
        }

        res.status(200).json({ success: true, message: 'Đã đồng bộ giỏ hàng thành công.' });
    } catch (error) {
        console.error('Lỗi mergeLocalCart:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi đồng bộ giỏ hàng.' });
    }
};

const clearCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const [[cart]] = await sequelize.query('SELECT id FROM carts WHERE user_id = ?', { replacements: [userId] });
        if (cart) {
            await sequelize.query('DELETE FROM cart_items WHERE cart_id = ?', { replacements: [cart.id] });
        }
        res.status(200).json({ success: true, message: 'Đã xóa toàn bộ giỏ hàng.' });
    } catch (error) {
        console.error('Lỗi clearCart:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi xóa giỏ hàng.' });
    }
};

module.exports = { mergeLocalCart, getUserCart, addToCart, updateCartItem, removeCartItem, clearCart };