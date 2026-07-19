const { sequelize } = require('./src/config/database');
sequelize.query("SELECT conname, pg_get_constraintdef(c.oid) FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace WHERE conrelid = 'product_variants'::regclass").then(([res]) => { console.log(res); process.exit(0); });
