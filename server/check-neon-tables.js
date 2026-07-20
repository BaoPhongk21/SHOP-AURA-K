/**
 * check-neon-tables.js - Check database tables
 * Usage: Set DATABASE_URL in .env, then: node server/check-neon-tables.js
 */
require('dotenv').config({ path: '../.env' });
const { Sequelize } = require('sequelize');
const pg = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL not set in .env');
  process.exit(1);
}
const s = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  protocol: 'postgres',
  dialectModule: pg,
  logging: false,
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }
});
(async () => {
  try {
    await s.authenticate();
    const r = await s.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
    );
    console.log('So bang trong schema public:', r[0].length);
    r[0].forEach((t) => console.log('  -', t.table_name));
    const c = await s.query('SELECT COUNT(*) AS n FROM users');
    console.log('Users count:', c[0][0].n);
    const cp = await s.query('SELECT COUNT(*) AS n FROM categories');
    console.log('Categories count:', cp[0][0].n);
    const pp = await s.query('SELECT COUNT(*) AS n FROM products');
    console.log('Products count:', pp[0][0].n);
    await s.close();
  } catch (e) {
    console.error('FAIL:', e.message);
    process.exit(1);
  }
})();