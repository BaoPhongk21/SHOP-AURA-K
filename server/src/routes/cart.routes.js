const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cart.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

// Các route
router.post('/merge', verifyToken, cartController.mergeLocalCart);
router.get('/', verifyToken, cartController.getUserCart); 
router.post('/', verifyToken, cartController.addToCart); 
router.put('/:itemId', verifyToken, cartController.updateCartItem); 
router.delete('/:itemId', verifyToken, cartController.removeCartItem); 
router.delete('/', verifyToken, cartController.clearCart);

module.exports = router;