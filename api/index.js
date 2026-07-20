const app = require('../server/server');

// Vercel serverless handler
module.exports = (req, res) => {
  // Override query parser for Vercel
  req.query = { ...req.query, ...req.params };
  
  // Handle the request
  app(req, res);
};
