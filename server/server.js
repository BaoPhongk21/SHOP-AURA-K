// --- Global Error Handlers ---
// Phải đặt ở đầu file để bắt mọi lỗi xảy ra trong quá trình khởi tạo
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

const path = require('path');
const rateLimit = require('express-rate-limit');
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: path.resolve(__dirname, '../.env'), override: true }); // Sử dụng file .env cục bộ khi phát triển ở local
}
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const logger = require('./src/utils/logger');
const errorHandler = require('./src/middlewares/error.handler');
const { sequelize } = require('./src/config/database'); // Đảm bảo đường dẫn này chính xác
const syncDatabaseSchema = require('./src/scripts/syncDatabase');

// Import các routes
const authRoutes = require('./src/routes/auth.routes');
const productRoutes = require('./src/routes/product.routes'); // Ví dụ import các route khác
const orderRoutes = require('./src/routes/order.routes');
const categoryRoutes = require('./src/routes/category.routes');
const cartRoutes = require('./src/routes/cart.routes'); // THÊM DÒNG NÀY
const userRoutes = require('./src/routes/user.routes'); // DÒNG MỚI THÊM
const adminRoutes = require('./src/routes/admin.routes'); // THÊM DÒNG NÀY
const settingsRoutes = require('./src/routes/settings.routes'); // ĐĂNG KÝ ROUTE SETTINGS
const addressRoutes = require('./src/routes/address.routes'); // ĐĂNG KÝ ROUTE ĐỊA CHỈ
const notificationRoutes = require('./src/routes/notification.routes'); // THÔNG BÁO
const brandRoutes = require('./src/routes/brand.routes'); // ROUTE THƯƠNG HIỆU

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

app.use(helmet({
  crossOriginOpenerPolicy: { policy: "unsafe-none" },
  crossOriginResourcePolicy: { policy: "cross-origin" }
})); // Bảo mật các HTTP headers và cho phép popup đăng nhập Google/Facebook hoạt động tốt

// --- Middlewares ---
// 1. CORS: Cực kỳ quan trọng để cho phép React (trên port khác) gọi API
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
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Cho phép tất cả các request phát triển từ localhost và 127.0.0.1 với bất kỳ port nào
    const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    if (isLocalhost) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Log unknown origin for debugging
    console.warn(`CORS: request from unknown origin: ${origin}`);

    // In production, reject unknown origins explicitly unless explicitly allowed via env
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_UNKNOWN_ORIGINS !== '1') {
      const error = new Error('Not allowed by CORS');
      error.status = 403;
      return callback(error, false);
    }

    // Allow unknown origins in non-production or when ALLOW_UNKNOWN_ORIGINS=1 (dev/testing helper)
    return callback(null, true);
  },
  credentials: true, // Cho phép gửi cookie và authorization headers
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
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV !== 'production' ? 1000 : 100, // Mở rộng giới hạn khi chạy local để tránh nhớt do polling dev
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Quá nhiều yêu cầu từ IP này, vui lòng thử lại sau 15 phút.' }
});
app.use('/api/', apiLimiter);

// --- Socket.IO Setup ---
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
      if (isLocalhost) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      if (process.env.NODE_ENV === 'production' && process.env.ALLOW_UNKNOWN_ORIGINS !== '1') {
        return callback(new Error('Not allowed by CORS'), false);
      }
      return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true
  }
});
app.set('socketio', io);

io.on('connection', (socket) => {
  console.log('🔗 Client connected to Socket.IO:', socket.id);
  
  socket.on('join_user_room', (userId) => {
     if (userId) {
       socket.join(`user_${userId}`);
       console.log(`👤 User ${userId} joined room: user_${userId}`);
     }
  });

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected from Socket.IO:', socket.id);
  });
});
// -----------------------

// 2. Body Parser: Giúp server đọc được dữ liệu JSON từ body của request
app.use(express.json());

// 3. Phục vụ các file tĩnh trong thư mục uploads để truy cập ảnh qua URL
// Thêm headers để tránh cache và cho phép CORS
app.use('/uploads', express.static(path.resolve(__dirname, 'src/uploads'), { maxAge: '1d' }));
app.use('/images', express.static(path.resolve(__dirname, 'src/uploads/products'), { maxAge: '1d' }));
app.use('/static-assets', express.static(path.resolve(__dirname, '../client/public/images'), { maxAge: '1d' }));
// Serve client public images (for logos, banners, etc) - also at /images path
app.use('/client-images', express.static(path.resolve(__dirname, '../client/public/images'), { maxAge: '1d' }));
// Additional /images route for client public images (logos, banners)
app.use('/img', express.static(path.resolve(__dirname, '../client/public/images'), { maxAge: '1d' }));
// --- Root Route (Dành cho Health Check của Render) ---
app.get('/', (req, res) => {
  res.status(200).json({ success: true, message: 'Aura K API is live' });
});

// Chuyển hướng các route cũ (frontend gọi) sang route mới có /v1
app.get('/api/products', (req, res) => { res.redirect('/api/v1/products'); });
app.get('/api/categories', (req, res) => { res.redirect('/api/v1/categories'); });
app.get('/api/flash-sale', (req, res) => { res.json([]); });
app.get('/api/coupons', (req, res) => { res.json([]); });

// --- API Routes ---
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/categories', categoryRoutes); // Sử dụng category routes
app.use('/api/v1/cart', cartRoutes); // THÊM DÒNG NÀY
app.use('/api/v1/users', userRoutes); // DÒNG MỚI THÊM
app.use('/api/v1/admin', adminRoutes); // ĐĂNG KÝ ROUTE ADMIN
app.use('/api/v1/settings', settingsRoutes); // ĐĂNG KÝ ĐƯỜNG DẪN SETTINGS PUBLIC
app.use('/api/v1/addresses', addressRoutes); // ĐĂNG KÝ ROUTE ĐỊA CHỈ
app.use('/api/v1/notifications', notificationRoutes); // ĐĂNG KÝ ROUTE NOTIFICATIONS
app.use('/api/v1/brands', brandRoutes); // ĐĂNG KÝ ROUTE THƯƠNG HIỆU

// --- Health Check (Dành cho việc kiểm tra trạng thái Server) ---
app.get('/health', (req, res) => {
  sequelize.authenticate()
    .then(() => {
      res.status(200).json({ status: 'ok', database: true, timestamp: new Date() });
    })
    .catch(err => {
      logger.error('Health check failed:', err);
      res.status(503).json({ status: 'error', database: false, timestamp: new Date() });
    });
});

// --- Global Error Handler ---
// Sử dụng middleware tập trung đã tạo ở trên
app.use(errorHandler);

// Biến cờ để kiểm tra trạng thái khởi tạo DB trong vòng đời của instance Serverless
let isDbInitialized = false;

// --- Khởi động Server ---
const startServer = async () => {
  try {
    // Kiểm tra kết nối CSDL
    await sequelize.authenticate();
    logger.info('✅ Database connection has been established successfully.');
    
    // Đồng bộ Schema
    await syncDatabaseSchema();
    isDbInitialized = true;

    // Khởi chạy server: Luôn chạy nếu không phải môi trường Vercel (Serverless)
    // Hoặc chạy nếu đang ở local (development)
    if (!process.env.VERCEL || process.env.NODE_ENV === 'development') {
      server.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
      });
    }
  } catch (error) {
    isDbInitialized = false;
    console.error('❌ Không thể kết nối đến cơ sở dữ liệu hoặc khởi động server:', error);
  }
};

startServer();

// ✅ Đúng cho Vercel: Export app để chạy dưới dạng Serverless Function
module.exports = app;


