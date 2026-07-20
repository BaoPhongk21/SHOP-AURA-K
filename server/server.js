// --- Global Error Handlers ---
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const path = require('path');
const rateLimit = require('express-rate-limit');
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: path.resolve(__dirname, '../.env'), override: true });
}
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const logger = require('./src/utils/logger');
const errorHandler = require('./src/middlewares/error.handler');
const { sequelize, ensureDbConnected, connectDB } = require('./src/config/database');
const syncDatabaseSchema = require('./src/scripts/syncDatabase');

// Import các routes
const authRoutes = require('./src/routes/auth.routes');
const productRoutes = require('./src/routes/product.routes');
const orderRoutes = require('./src/routes/order.routes');
const categoryRoutes = require('./src/routes/category.routes');
const cartRoutes = require('./src/routes/cart.routes');
const userRoutes = require('./src/routes/user.routes');
const adminRoutes = require('./src/routes/admin.routes');
const settingsRoutes = require('./src/routes/settings.routes');
const addressRoutes = require('./src/routes/address.routes');
const notificationRoutes = require('./src/routes/notification.routes');
const brandRoutes = require('./src/routes/brand.routes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet({
  crossOriginOpenerPolicy: { policy: "unsafe-none" },
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// --- Middlewares ---
const normalizeOrigin = (value) => {
  if (!value) return null;
  try {
    const url = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    return new URL(url).origin;
  } catch {
    return null;
  }
};

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'https://shop-aura-k.vercel.app',
  process.env.FRONTEND_URL,
  process.env.VERCEL_URL,
  process.env.VERCEL_PROJECT_PRODUCTION_URL
].map(normalizeOrigin).filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    if (isLocalhost) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn(`CORS: request from unknown origin: ${origin}`);

    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_UNKNOWN_ORIGINS !== '1') {
      const error = new Error('Not allowed by CORS');
      error.status = 403;
      return callback(error, false);
    }

    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma'
  ]
}));

// --- Security: Rate Limiting ---
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV !== 'production' ? 1000 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Quá nhiều yêu cầu từ IP này, vui lòng thử lại sau 15 phút.' }
});
app.use('/api/', apiLimiter);

// Body Parser
app.use(express.json());

// Phục vụ file tĩnh (chỉ khả dụng khi chạy local/server truyền thống)
app.use('/uploads', express.static(path.resolve(__dirname, 'src/uploads'), { maxAge: '1d' }));
app.use('/images', express.static(path.resolve(__dirname, '../client/public/images'), { maxAge: '1d' }));
app.use('/static-assets', express.static(path.resolve(__dirname, '../client/public/images'), { maxAge: '1d' }));
app.use('/client-images', express.static(path.resolve(__dirname, '../client/public/images'), { maxAge: '1d' }));
app.use('/img', express.static(path.resolve(__dirname, '../client/public/images'), { maxAge: '1d' }));

// --- Root Route (Health check cơ bản, không chạm DB để tránh cold-start chậm) ---
app.get('/', (req, res) => {
  res.status(200).json({ success: true, message: 'Aura K API is live' });
});

// Redirect các route cũ
app.get('/api/products', (req, res) => { res.redirect('/api/v1/products'); });
app.get('/api/categories', (req, res) => { res.redirect('/api/v1/categories'); });
app.get('/api/flash-sale', (req, res) => { res.json([]); });
app.get('/api/coupons', (req, res) => { res.json([]); });

// --- API Routes (đặt sau ensureDbConnected để chỉ mở DB khi có request) ---
app.use('/api/v1', ensureDbConnected);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/addresses', addressRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/brands', brandRoutes);

// --- Health Check (DB) ---
app.get('/health', async (req, res) => {
  try {
    await connectDB();
    res.status(200).json({ status: 'ok', database: true, timestamp: new Date() });
  } catch (err) {
    logger.error('Health check failed:', err);
    res.status(503).json({ status: 'error', database: false, timestamp: new Date() });
  }
});

app.use(errorHandler);

// --- Khởi động Server (chỉ chạy khi không phải Vercel serverless) ---
const startServer = async () => {
  try {
    await connectDB();
    await syncDatabaseSchema();

    if (!process.env.VERCEL || process.env.NODE_ENV === 'development') {
      const http = require('http');
      const server = http.createServer(app);
      server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      });
    }
  } catch (error) {
    console.error('Cannot connect to database or start server:', error);
  }
};

startServer();

module.exports = app;
