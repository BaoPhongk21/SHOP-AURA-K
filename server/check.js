const { sequelize } = require('./src/config/database');
sequelize.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'product_variants'").then(([res]) => { console.log(res); process.exit(0); });
