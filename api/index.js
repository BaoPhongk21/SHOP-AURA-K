// Vercel Serverless Function Entry Point
// This wraps the Express app for Vercel's serverless runtime

process.env.VERCEL = '1';
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

let app;
let initError = null;

try {
  // Require the Express server
  app = require('../server/server');
  console.log('[Vercel API] Express app loaded successfully');
} catch (err) {
  console.error('[Vercel API] Failed to load Express app:', err);
  initError = err;
}

// Wrap as serverless function
module.exports = async (req, res) => {
  if (initError) {
    return res.status(500).json({
      success: false,
      message: 'Server initialization failed',
      error: initError.message,
    });
  }

  if (!app) {
    return res.status(500).json({
      success: false,
      message: 'Server not available',
    });
  }

  try {
    return app(req, res);
  } catch (err) {
    console.error('[Vercel API] Request error:', err);
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: err.message,
      });
    }
  }
};