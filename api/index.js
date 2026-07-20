const server = require('../server/server');

// Vercel serverless handler
module.exports = async (req, res) => {
  try {
    // Set CORS headers for all responses
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    // Pass to Express app
    server(req, res, (err) => {
      if (err) {
        console.error('Server error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Internal server error' });
        }
      }
    });
  } catch (error) {
    console.error('Unhandled error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};
