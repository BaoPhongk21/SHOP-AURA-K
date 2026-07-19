const express = require('express');
const router = express.Router();
const { getAllProducts, getProductById, getProductReviews, addProductReview } = require('../controllers/product.controller');
const { verifyToken } = require('../middlewares/auth.middleware'); // Điều chỉnh lại đường dẫn nếu thư mục middleware của bạn tên khác

router.get('/', getAllProducts);
router.get('/:id', getProductById);
router.get('/:id/reviews', getProductReviews);
router.post('/:id/reviews', verifyToken, addProductReview);

module.exports = router;