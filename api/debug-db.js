// Debug endpoint for Vercel serverless
process.env.VERCEL = '1';
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

module.exports = async (req, res) => {
  const url = process.env.DATABASE_URL || 'NOT SET';
  const masked = url.replace(/\/\/.*@/, '//***@');
  
  const result = {
    vercel: process.env.VERCEL,
    nodeEnv: process.env.NODE_ENV,
    databaseUrl: masked,
    region: process.env.VERCEL_REGION,
    timestamp: new Date().toISOString(),
  };

  if (url === 'NOT SET') {
    return res.status(200).json({ ...result, status: 'NO_DATABASE_URL' });
  }

  try {
    const { Sequelize } = require('sequelize');
    const pg = require('pg');
    
    const sequelize = new Sequelize(url, {
      dialect: 'postgres',
      dialectModule: pg,
      dialectOptions: {
        ssl: { require: true, rejectUnauthorized: false }
      },
      logging: false
    });
    
    await sequelize.authenticate();
    const [r] = await sequelize.query('SELECT current_database() as db, current_user as user, version() as version');
    result.status = 'OK';
    result.dbInfo = r[0];
    await sequelize.close();
  } catch (err) {
    result.status = 'ERROR';
    result.error = err.message;
    result.errorCode = err.code;
    result.errorName = err.name;
  }

  return res.status(200).json(result);
};