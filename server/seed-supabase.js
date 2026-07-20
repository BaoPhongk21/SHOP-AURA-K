/**
 * seed-supabase.js - Seed database for Supabase
 *
 * Usage:
 *   1. Set DATABASE_URL in .env (file d:/Shop-Quan-Ao - DELOY/.env)
 *   2. Set SEED_ADMIN_EMAIL and SEED_DEFAULT_PASSWORD in .env
 *   3. Run: node server/seed-supabase.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { Sequelize, QueryTypes } = require('sequelize');
const pg = require('pg');
const bcrypt = require('bcryptjs');

const DATABASE_URL = process.env.DATABASE_URL;
const SEED_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@shopquanao.com';
const SEED_DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD;

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL not found. Please set it in .env file.');
  console.error('Example: postgresql://postgres.xxx:PASSWORD@aws-0-region.pooler.supabase.com:6543/postgres');
  process.exit(1);
}

if (!SEED_DEFAULT_PASSWORD) {
  console.error('ERROR: SEED_DEFAULT_PASSWORD not set in .env');
  process.exit(1);
}

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  protocol: 'postgres',
  dialectModule: pg,
  logging: false,
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
});

const TABLES = [
  'user_notification_reads', 'notifications', 'banners',
  'order_items', 'orders', 'cart_items', 'carts',
  'reviews', 'product_reviews', 'product_variants', 'product_images',
  'products', 'categories', 'sizes', 'colors', 'addresses',
  'user_coupons', 'coupons', 'users', 'settings', 'contacts',
  'coupon_attempts', 'newsletters', 'brands', 'role_permissions'
];

async function checkTables() {
  const rows = await sequelize.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name",
    { type: QueryTypes.SELECT }
  );
  const arr = Array.isArray(rows) ? rows : (rows && rows.rows) || [];
  return arr.map(r => r.table_name);
}

async function resetSchema() {
  console.log('Dropping existing tables...');
  for (const t of TABLES) {
    await sequelize.query(`DROP TABLE IF EXISTS ${t} CASCADE`).catch(() => {});
  }
  console.log('  Done.\n');
}

async function createSchema() {
  console.log('Creating 24 tables...');
  await sequelize.query(`CREATE TABLE users (
    id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE, password VARCHAR(255), phone VARCHAR(20),
    role VARCHAR(50) DEFAULT 'customer', rank VARCHAR(50) DEFAULT 'bronze',
    avatar VARCHAR(500), is_active BOOLEAN DEFAULT true, phone_verified BOOLEAN DEFAULT false,
    address TEXT, ward VARCHAR(100), district VARCHAR(100), city VARCHAR(100),
    loyalty_points INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await sequelize.query(`CREATE TABLE categories (
    id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, slug VARCHAR(255) UNIQUE,
    description TEXT, image_url VARCHAR(500), parent_id INTEGER,
    sort_order INTEGER DEFAULT 0, is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await sequelize.query(`CREATE TABLE products (
    id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, sku VARCHAR(255) UNIQUE,
    slug VARCHAR(255) UNIQUE, brand VARCHAR(255), category_id INTEGER,
    description TEXT, price DECIMAL(12,0) NOT NULL, original_price DECIMAL(12,0),
    discount INTEGER DEFAULT 0, stock INTEGER DEFAULT 0, sold INTEGER DEFAULT 0,
    rating DECIMAL(2,1) DEFAULT 0, review_count INTEGER DEFAULT 0,
    thumbnail VARCHAR(500), is_active BOOLEAN DEFAULT true, is_featured BOOLEAN DEFAULT false,
    is_new BOOLEAN DEFAULT false, gender VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await sequelize.query(`CREATE TABLE sizes (id SERIAL PRIMARY KEY, name VARCHAR(50) NOT NULL UNIQUE, sort_order INTEGER DEFAULT 0)`);
  await sequelize.query(`CREATE TABLE colors (id SERIAL PRIMARY KEY, name VARCHAR(50) NOT NULL UNIQUE, hex_code VARCHAR(10))`);
  await sequelize.query(`CREATE TABLE product_variants (
    id SERIAL PRIMARY KEY, product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    size_id INTEGER REFERENCES sizes(id), color_id INTEGER REFERENCES colors(id),
    stock INTEGER DEFAULT 0, stock_quantity INTEGER DEFAULT 0, sku VARCHAR(255), UNIQUE(product_id, size_id, color_id)
  )`);
  await sequelize.query(`CREATE TABLE product_images (
    id SERIAL PRIMARY KEY, product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    image_url VARCHAR(500) NOT NULL, alt_text VARCHAR(255), sort_order INTEGER DEFAULT 0, is_primary BOOLEAN DEFAULT false
  )`);
  await sequelize.query(`CREATE TABLE coupons (
    id SERIAL PRIMARY KEY, code VARCHAR(50) UNIQUE NOT NULL, description TEXT,
    discount_type VARCHAR(20) NOT NULL, discount_value DECIMAL(12,0) NOT NULL,
    min_order DECIMAL(12,0) DEFAULT 0, max_discount DECIMAL(12,0),
    quantity INTEGER DEFAULT 0, used INTEGER DEFAULT 0,
    start_date TIMESTAMP, end_date TIMESTAMP, is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await sequelize.query(`CREATE TABLE user_coupons (
    id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    coupon_id INTEGER REFERENCES coupons(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1, UNIQUE(user_id, coupon_id)
  )`);
  await sequelize.query(`CREATE TABLE carts (
    id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await sequelize.query(`CREATE TABLE cart_items (
    id SERIAL PRIMARY KEY, cart_id INTEGER REFERENCES carts(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id), variant_id INTEGER REFERENCES product_variants(id),
    quantity INTEGER NOT NULL DEFAULT 1, price DECIMAL(12,0) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await sequelize.query(`CREATE TABLE addresses (
    id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    recipient_name VARCHAR(255), phone VARCHAR(20), address TEXT,
    ward VARCHAR(100), district VARCHAR(100), city VARCHAR(100),
    is_default BOOLEAN DEFAULT false, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await sequelize.query(`CREATE TABLE orders (
    id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id),
    order_code VARCHAR(50) UNIQUE NOT NULL,
    subtotal DECIMAL(12,0) NOT NULL, shipping_fee DECIMAL(12,0) DEFAULT 0,
    discount DECIMAL(12,0) DEFAULT 0, total DECIMAL(12,0) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', payment_method VARCHAR(50),
    payment_status VARCHAR(50) DEFAULT 'pending', payment_receipt TEXT,
    coupon_code VARCHAR(50), shipping_address TEXT, shipping_phone VARCHAR(20),
    shipping_name VARCHAR(255), note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await sequelize.query(`CREATE TABLE order_items (
    id SERIAL PRIMARY KEY, order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id), product_name VARCHAR(255),
    variant_info VARCHAR(255), quantity INTEGER NOT NULL,
    price DECIMAL(12,0) NOT NULL, subtotal DECIMAL(12,0) NOT NULL
  )`);
  await sequelize.query(`CREATE TABLE reviews (
    id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id),
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    rating INTEGER CHECK(rating >= 1 AND rating <= 5),
    comment TEXT, is_approved BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await sequelize.query(`CREATE TABLE product_reviews (
    id SERIAL PRIMARY KEY, product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    rating INTEGER CHECK(rating >= 1 AND rating <= 5),
    comment TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, user_id)
  )`);
  await sequelize.query(`CREATE TABLE settings (
    id SERIAL PRIMARY KEY, key VARCHAR(100) UNIQUE NOT NULL, value TEXT,
    type VARCHAR(50) DEFAULT 'text', updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await sequelize.query(`CREATE TABLE contacts (
    id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, email VARCHAR(255) NOT NULL,
    phone VARCHAR(20), subject VARCHAR(255), message TEXT NOT NULL,
    attachments TEXT, status VARCHAR(50) DEFAULT 'new',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await sequelize.query(`CREATE TABLE notifications (
    id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL, message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'system', link VARCHAR(500),
    is_read BOOLEAN DEFAULT false, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await sequelize.query(`CREATE TABLE user_notification_reads (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    notification_id INTEGER REFERENCES notifications(id) ON DELETE CASCADE,
    read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, notification_id)
  )`);
  await sequelize.query(`CREATE TABLE role_permissions (
    id SERIAL PRIMARY KEY, role_name VARCHAR(50) UNIQUE NOT NULL,
    products BOOLEAN DEFAULT false, orders BOOLEAN DEFAULT false,
    customers BOOLEAN DEFAULT false, reports BOOLEAN DEFAULT false,
    settings BOOLEAN DEFAULT false, vouchers BOOLEAN DEFAULT false,
    inventory BOOLEAN DEFAULT false
  )`);
  await sequelize.query(`CREATE TABLE banners (
    id SERIAL PRIMARY KEY, page_key VARCHAR(50) NOT NULL, title VARCHAR(255),
    image_url VARCHAR(500) NOT NULL, link_url VARCHAR(500),
    sort_order INTEGER DEFAULT 0, is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await sequelize.query(`CREATE TABLE brands (
    id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT, logo_url VARCHAR(500), tier VARCHAR(50) NOT NULL DEFAULT 'street',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await sequelize.query(`CREATE TABLE coupon_attempts (
    ip_address VARCHAR(45) PRIMARY KEY,
    attempts INTEGER DEFAULT 1,
    last_attempt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await sequelize.query(`CREATE TABLE newsletters (
    id SERIAL PRIMARY KEY, email VARCHAR(255) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  console.log('  Done - 24 tables created.\n');
}

async function seedBasic() {
  console.log('Seeding basic data...');

  const hashedPassword = await bcrypt.hash(SEED_DEFAULT_PASSWORD, 10);
  await sequelize.query(
    `INSERT INTO users (name, email, username, password, phone, role, rank, is_active) VALUES
      ('Admin', :adminEmail, 'admin', :hash, '0123456789', 'admin', 'platinum', true),
      ('Khach hang mau', 'customer@example.com', 'customer', :hash, '0987654321', 'customer', 'silver', true),
      ('Nguyen Van An', 'nguyenvanan@gmail.com', 'vanan', :hash, '0912345678', 'customer', 'bronze', true)
     ON CONFLICT (email) DO NOTHING`,
    { replacements: { adminEmail: SEED_ADMIN_EMAIL, hash: hashedPassword } }
  );
  console.log('  3 users created.');

  const cats = [
    ['Ao', 'ao', 'Cac loai ao thoi trang'],
    ['Quan', 'quan', 'Cac loai quan thoi trang'],
    ['Vay & Dam', 'vay-dam', 'Vay va dam nu'],
    ['Phu Kien', 'phu-kien', 'Phu kien thoi trang']
  ];
  for (const [name, slug, desc] of cats) {
    await sequelize.query(
      'INSERT INTO categories (name, slug, description, is_active, sort_order) VALUES (:name, :slug, :desc, true, 0) ON CONFLICT (slug) DO NOTHING',
      { replacements: { name, slug, desc } }
    );
  }
  console.log('  4 categories created.');

  const sizes = ['S', 'M', 'L', 'XL', 'XXL'];
  for (let i = 0; i < sizes.length; i++) {
    await sequelize.query(
      'INSERT INTO sizes (name, sort_order) VALUES (:name, :order) ON CONFLICT (name) DO NOTHING',
      { replacements: { name: sizes[i], order: i } }
    );
  }
  console.log('  5 sizes created.');

  const colors = [
    ['Den', '#000000'], ['Trang', '#FFFFFF'], ['Xam', '#808080'],
    ['Do', '#FF0000'], ['Xanh duong', '#0066CC'], ['Xanh la', '#00AA00'],
    ['Vang', '#FFD700'], ['Be', '#F5F5DC'], ['Nau', '#8B4513']
  ];
  for (const [name, hex] of colors) {
    await sequelize.query(
      'INSERT INTO colors (name, hex_code) VALUES (:name, :hex) ON CONFLICT (name) DO NOTHING',
      { replacements: { name, hex } }
    );
  }
  console.log('  9 colors created.');

  const brands = [
    ['Nike', 'Thuong hieu the thao hang dau', 'premium'],
    ['Adidas', 'Thuong hieu the thao', 'premium'],
    ['Uniqlo', 'Thoi trang Nhat Ban', 'mid'],
    ['Zara', 'Thoi trang cao cap', 'mid'],
    ['H&M', 'Thoi trang binh dan', 'mid'],
    ['Gucci', 'Thoi trang hang sang', 'luxury']
  ];
  for (const [name, desc, tier] of brands) {
    await sequelize.query(
      'INSERT INTO brands (name, description, tier) VALUES (:name, :desc, :tier) ON CONFLICT (name) DO NOTHING',
      { replacements: { name, desc, tier } }
    );
  }
  console.log('  6 brands created.');

  await sequelize.query(
    `INSERT INTO role_permissions (role_name, products, orders, customers, reports, settings, vouchers, inventory)
     VALUES ('Admin', true, true, true, true, true, true, true), ('Staff', false, true, true, false, false, false, false)
     ON CONFLICT (role_name) DO NOTHING`
  );
  console.log('  role_permissions created.');

  await sequelize.query(
    `INSERT INTO banners (page_key, title, image_url, sort_order, is_active) VALUES
      ('home', 'Summer Sale 2025', '/static-assets/bannerthuonghieu.jpg', 1, true),
      ('home', 'New Arrivals', '/static-assets/BSTTHUDONG.jpg', 2, true)
     ON CONFLICT DO NOTHING`
  );
  console.log('  2 banners created.');

  await sequelize.query(
    `INSERT INTO settings (key, value) VALUES
      ('shop_name', 'Aura K Shop'),
      ('shop_email', 'contact@shopquanao.com'),
      ('shop_phone', '0123456789'),
      ('shipping_fee', '30000'),
      ('free_shipping_threshold', '200000')
     ON CONFLICT (key) DO NOTHING`
  );
  console.log('  settings created.\n');
}

async function seedProducts() {
  console.log('Seeding products...');

  const products = [
    ['Nike Tech Fleece Hoodie', 'nike-tech-fleece-hoodie', 'Ao hoodie Nike Tech Fleece cao cap, chat lieu cotton pha polyester, thiet ke hien dai, giu am tot', 1500000, 'ao', 'Nike', '/static-assets/nike-tech-fleece-hoodie.jpg', true],
    ['Nike Sportswear Pants', 'nike-sportswear-pants', 'Quan the thao Nike Sportswear, chat lieu tham hut moi hot tot, co gian 4 chieu, thoai mai moi dong tac', 980000, 'quan', 'Nike', '/static-assets/nike-sportswear-pants.jpg', true],
    ['Adidas Essentials Tee', 'adidas-essentials-tee', 'Ao thun Adidas Essentials basic, chat cotton 100%, tham hut tot, form regular fit, pho bien', 450000, 'ao', 'Adidas', '/static-assets/adidas-essentials-tee.jpg', true],
    ['Uniqlo AIRism Tee', 'uniqlo-airism-tee', 'Ao thun Uniqlo AIRism mat lanh, chong UV, khang khuan, tham hut moi hot tuyet doi', 390000, 'ao', 'Uniqlo', '/static-assets/uniqlo-airism-tee.jpg', true],
    ['Zara Leather Jacket', 'zara-leather-jacket', 'Ao khoac da Zara phong cach biker, chat lieu da tong hop cao cap, tre trung nam phong', 2500000, 'ao', 'Zara', '/static-assets/zara-leather-jacket.jpg', true],
    ['H&M Denim Jacket', 'hm-denim-jacket', 'Ao khoac jean H&M classic, chat denim ben dep, phu hop mix do da dang, gia thanh ly', 1100000, 'ao', 'H&M', '/static-assets/hm-denim-jacket.jpg', false],
    ['Gucci Logo Tee', 'gucci-logo-tee', 'Ao thun Gucci cao cap voi logo thuong hieu noi bat, chat cotton premium, sang trong', 8500000, 'ao', 'Gucci', '/static-assets/gucci-logo-tee.jpg', true],
    ['Nike Dri-FIT Academy', 'nike-dri-fit-academy', 'Ao thun the thao Nike Dri-FIT Academy, cong nghe tham hut vuot troi, phu hop tap luyen', 650000, 'ao', 'Nike', '/static-assets/nike-dri-fit-academy.jpg', false],
    ['Adidas Windbreaker', 'adidas-windbreaker', 'Ao khoac gio Adidas, chat lieu chong nuoc nhe, co mu trum, phu hop thoi tiet se lanh', 1200000, 'ao', 'Adidas', '/static-assets/adidas-windbreaker.jpg', true],
    ['Uniqlo Light Down Jacket', 'uniqlo-light-down', 'Ao phao long vu Supa Light Down, giu am tuyet doi, co the gap gon gon, tien loi mang theo', 1800000, 'ao', 'Uniqlo', '/static-assets/uniqlo-light-down.jpg', true],
  ];

  for (const [name, slug, desc, price, catSlug, brand, img, featured] of products) {
    await sequelize.query(
      `INSERT INTO products (name, slug, description, price, category_id, brand, stock, thumbnail, is_featured, is_active, created_at, updated_at)
       SELECT :name, :slug, :desc, :price, id, :brand, 50, :img, :featured, true, NOW(), NOW()
       FROM categories WHERE slug = :catSlug
       ON CONFLICT (slug) DO NOTHING`,
      { replacements: { name, slug, desc, price, catSlug, brand, img, featured } }
    );
  }
  console.log('  10 products created.');

  // Seed product_images with is_primary
  const imageMap = [
    ['nike-tech-fleece-hoodie', '/static-assets/nike-tech-fleece-hoodie.jpg'],
    ['nike-sportswear-pants', '/static-assets/nike-sportswear-pants.jpg'],
    ['adidas-essentials-tee', '/static-assets/adidas-essentials-tee.jpg'],
    ['uniqlo-airism-tee', '/static-assets/uniqlo-airism-tee.jpg'],
    ['zara-leather-jacket', '/static-assets/zara-leather-jacket.jpg'],
    ['hm-denim-jacket', '/static-assets/hm-denim-jacket.jpg'],
    ['gucci-logo-tee', '/static-assets/gucci-logo-tee.jpg'],
    ['nike-dri-fit-academy', '/static-assets/nike-dri-fit-academy.jpg'],
    ['adidas-windbreaker', '/static-assets/adidas-windbreaker.jpg'],
    ['uniqlo-light-down', '/static-assets/uniqlo-light-down.jpg'],
  ];
  for (const [slug, imgUrl] of imageMap) {
    await sequelize.query(
      `INSERT INTO product_images (product_id, image_url, alt_text, sort_order, is_primary)
       SELECT id, :img, :slug, 1, true FROM products WHERE slug = :slug
       ON CONFLICT DO NOTHING`,
      { replacements: { slug, img: imgUrl } }
    );
  }
  console.log('  10 product_images created.\n');
}

async function main() {
  try {
    console.log('========================================');
    console.log('SUPABASE DATABASE SEEDER');
    console.log('========================================\n');

    await sequelize.authenticate();
    console.log('Connected to database.\n');

    const existingTables = await checkTables();

    if (existingTables.length === 0) {
      console.log('Database is empty. Creating schema...');
      await createSchema();
      await seedBasic();
      await seedProducts();
    } else {
      console.log(`Database has ${existingTables.length} existing tables.`);
      console.log('Options:');
      console.log('  [r] Reset all tables and seed fresh (recommended for new Supabase)');
      console.log('  [s] Seed basic data only (skip products)');
      console.log('  [p] Seed products only');
      console.log('  [n] Skip seeding and exit');

      const readline = await import('readline');
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));
      const answer = (await question('\nYour choice [r/s/p/n]: ')).toLowerCase().trim();
      rl.close();

      if (answer === 'r') {
        await resetSchema();
        await createSchema();
        await seedBasic();
        await seedProducts();
      } else if (answer === 's') {
        await seedBasic();
      } else if (answer === 'p') {
        await seedProducts();
      } else {
        console.log('Skipped.');
        await sequelize.close();
        return;
      }
    }

    console.log('========================================');
    console.log('SEEDING COMPLETE!');
    console.log(`Admin email: ${SEED_ADMIN_EMAIL}`);
    console.log(`Admin password: ${SEED_DEFAULT_PASSWORD}`);
    console.log('========================================');

    await sequelize.close();
  } catch (e) {
    console.error('ERROR:', e.message);
    console.error(e);
    process.exit(1);
  }
}

main();
