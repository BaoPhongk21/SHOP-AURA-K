/**
 * Utility logger đơn giản cho ứng dụng
 */
const logger = {
    info: (message, ...args) => {
        console.log(`[INFO] ${new Date().toLocaleString()} - ${message}`, ...args);
    },
    error: (message, ...args) => {
        console.error(`[ERROR] ${new Date().toLocaleString()} - ${message}`, ...args);
    },
    warn: (message, ...args) => {
        console.warn(`[WARN] ${new Date().toLocaleString()} - ${message}`, ...args);
    },
    debug: (message, ...args) => {
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[DEBUG] ${new Date().toLocaleString()} - ${message}`, ...args);
        }
    }
};

module.exports = logger;