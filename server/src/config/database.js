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

if (DATABASE_URL && DATABASE_URL.trim()) {
  const dbUrl = String(DATABASE_URL).trim();
  const dialectOptions = {};
  let connectionOptions = {
    dialect: 'postgres',
    protocol: 'postgres',
    dialectModule: pg,
    dialectOptions,
    logging: false,
  };

  try {
    const parsedUrl = new URL(dbUrl);
    const password = parsedUrl.password !== null ? String(parsedUrl.password) : undefined;
    const database = parsedUrl.pathname ? parsedUrl.pathname.replace(/^\//, '') : undefined;
    const port = parsedUrl.port ? Number(parsedUrl.port) : 5432;

    if (!['localhost', '127.0.0.1'].includes(parsedUrl.hostname)) {
      dialectOptions.ssl = {
        require: true,
        rejectUnauthorized: false,
      };
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
    console.warn('⚠️ Parse DATABASE_URL failed, using fallback config:', err.message);
    // Nếu parse URL lỗi thì vẫn dùng raw DATABASE_URL như fallback.
    connectionOptions = {
      ...connectionOptions,
      url: dbUrl,
    };
  }

  sequelize = new Sequelize(connectionOptions);
} else {
  // Fallback: Cấu hình dành cho Local hoặc khi DATABASE_URL không có
  console.log('📝 Using fallback database configuration (individual env vars)');
  
  const dbPassword = DB_PASS !== 'password' ? String(DB_PASS) : undefined;
  const dbPort = DB_PORT ? Number(DB_PORT) : 5432;

  // Tự động bật bảo mật SSL khi chạy trên Vercel/Production hoặc sử dụng CSDL Neon Cloud
  const dialectOptions = {};
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1' || (DB_HOST && DB_HOST.includes('neon.tech'))) {
    dialectOptions.ssl = {
      require: true,
      rejectUnauthorized: false,
    };
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

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Kết nối Database PostgreSQL thành công!');
  } catch (error) {
    console.error('❌ Kết nối Database thất bại:', error.message);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };