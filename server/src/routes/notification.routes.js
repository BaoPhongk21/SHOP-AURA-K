const express = require('express');
const router = express.Router();
const { getMyNotifications, markAsRead, markAllAsRead } = require('../controllers/notification.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

router.get('/', verifyToken, getMyNotifications);
router.put('/mark-all-read', verifyToken, markAllAsRead);
router.put('/:id/read', verifyToken, markAsRead);

module.exports = router;
