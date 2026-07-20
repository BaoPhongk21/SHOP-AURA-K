const { Sequelize } = require('sequelize');
const pg = require('pg');
const path = require('path');

// Đọc file .env từ thư mục gốc
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

let sequelize;

const DATABASE_URL = process.env.DATABASE_URL || '';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 5432;
const DB_NAME = process.env.DB_NAME || 'shop_quan_ao';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASS = process.env.DB_PASS || 'password';

// Cloud providers (Supabase, Neon, RDS, ...) luôn yêu cầu SSL trừ localhost.
const isLocalHost = (host) =>
  !host || ['localhost', '127.0.0.1'].includes(host) || host.endsWith('.local');

const buildSslOptions = () => ({
  require: true,
  rejectUnauthorized: false,
});

// Supabase serverless connection string (use pooler for serverless)
const getSupabasePoolerUrl = (directUrl) => {
  try {
    const url = new URL(directUrl);
    // Supabase pooler format: replace hostname with pooler and port with 6543
    url.hostname = 'aws-0-ap-southeast-1.pooler.supabase.com';
    url.port = '6543';
    return url.toString();
  } catch {
    return directUrl;
  }
};

if (DATABASE_URL && DATABASE_URL.trim()) {
  const dbUrl = String(DATABASE_URL).trim();
  const dialectOptions = {};
  let connectionOptions = {
    dialect: 'postgres',
    protocol: 'postgres',
    dialectModule: pg,
    dialectOptions,
    logging: false,
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
  };

  // Sử dụng pooler URL cho Supabase (tốt hơn cho serverless)
  const finalUrl = dbUrl.includes('supabase.co') ? getSupabasePoolerUrl(dbUrl) : dbUrl;
  console.log('Using database URL:', finalUrl.replace(/\/\/.*@/, '//***@'));

  try {
    const parsedUrl = new URL(finalUrl);
    const password = parsedUrl.password !== null ? String(parsedUrl.password) : undefined;
    const database = parsedUrl.pathname ? parsedUrl.pathname.replace(/^\//, '') : undefined;
    const port = parsedUrl.port ? Number(parsedUrl.port) : 5432;

    if (!isLocalHost(parsedUrl.hostname)) {
      dialectOptions.ssl = buildSslOptions();
    }

    connectionOptions = {
      ...connectionOptions,
      username: parsedUrl.username ? String(parsedUrl.username) : undefined,
      password,
      database,
      host: parsedUrl.hostname,
      port,
    };
  } catch (err) {
    console.warn('Parse DATABASE_URL failed, using fallback config:', err.message);
    connectionOptions = {
      ...connectionOptions,
      url: finalUrl,
      dialectOptions: { ...connectionOptions.dialectOptions, ssl: buildSslOptions() },
    };
  }

  sequelize = new Sequelize(connectionOptions);
} else {
  // Fallback: Cấu hình dành cho Local Postgres khi không có DATABASE_URL
  console.log('Using fallback database configuration (individual env vars)');

  const dbPassword = DB_PASS !== 'password' ? String(DB_PASS) : undefined;
  const dbPort = DB_PORT ? Number(DB_PORT) : 5432;

  const dialectOptions = {};
  if (
    process.env.NODE_ENV === 'production' ||
    process.env.VERCEL === '1' ||
    !isLocalHost(DB_HOST)
  ) {
    dialectOptions.ssl = buildSslOptions();
  }

  sequelize = new Sequelize(
    DB_NAME,
    DB_USER,
    dbPassword,
    {
      host: DB_HOST,
      port: dbPort,
      dialect: 'postgres',
      dialectModule: pg,
      dialectOptions,
      logging: false,
      pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
    }
  );
}

let isDbInitialized = false;
let initPromise = null;

const connectDB = async () => {
  if (isDbInitialized) return sequelize;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      await sequelize.authenticate();
      isDbInitialized = true;
      console.log('Database connection has been established successfully.');
      return sequelize;
    } catch (error) {
      initPromise = null;
      console.error('Database connection failed:', error.message);
      throw error;
    }
  })();

  return initPromise;
};

// Middleware đảm bảo DB đã kết nối trước khi xử lý request (chỉ dùng trên serverless).
const ensureDbConnected = async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(503).json({
      success: false,
      message: 'Database unavailable',
      error: process.env.NODE_ENV === 'production' ? undefined : err.message,
    });
  }
};

module.exports = { sequelize, connectDB, ensureDbConnected, isDbInitialized: () => isDbInitialized };
