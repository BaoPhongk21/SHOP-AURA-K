const logger = require('../utils/logger');

/**
 * Middleware xử lý lỗi tập trung cho toàn bộ ứng dụng
 */
const errorHandler = (err, req, res, next) => {
    // Special-case common multipart/file errors (Multer) to return 400 instead of 500
    if (err && err.name && err.name === 'MulterError') {
        logger.warn(`MulterError: ${err.message}`, { path: req.path, method: req.method });
        return res.status(400).json({ success: false, message: err.message || 'Lỗi upload file.' });
    }

    logger.error(`${err.name || 'Error'}: ${err.message}`, {
        stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
        path: req.path,
        method: req.method,
    });

    const isProduction = process.env.NODE_ENV === 'production';
    const statusCode = err.status || 500;
    
    res.status(statusCode).json({
        success: false,
        message: (isProduction && statusCode >= 500) 
            ? 'Lỗi server nội bộ. Vui lòng thử lại sau.' 
            : (err.message || 'Lỗi server nội bộ. Vui lòng thử lại sau.')
    });
};

module.exports = errorHandler;