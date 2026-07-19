const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const SESSION_VERSION_ENV = 'AUTH_SESSION_VERSION';

function getSessionVersion() {
  if (!process.env[SESSION_VERSION_ENV]) {
    process.env[SESSION_VERSION_ENV] = process.env.JWT_SECRET ? crypto.createHash('sha256').update(process.env.JWT_SECRET).digest('hex').substring(0, 8) : 'default_v1';
  }
  return process.env[SESSION_VERSION_ENV];
}

function createAuthToken(payload, secret, options = {}) {
  return jwt.sign({ ...payload, sessionVersion: getSessionVersion() }, secret, options);
}

function verifyAuthToken(token, secret) {
  const decoded = jwt.verify(token, secret);

  // Allow skipping sessionVersion check only in non-production when explicitly set
  if (process.env.SKIP_AUTH_SESSION_VERSION === '1') {
    if (process.env.NODE_ENV === 'production') {
      console.warn('SKIP_AUTH_SESSION_VERSION is set in production — ignoring for safety.');
    } else {
      return decoded;
    }
  }

  if (!decoded.sessionVersion || decoded.sessionVersion !== getSessionVersion()) {
    const error = new Error('SESSION_INVALIDATED');
    error.code = 'SESSION_INVALIDATED';
    throw error;
  }

  return decoded;
}

module.exports = {
  createAuthToken,
  getSessionVersion,
  verifyAuthToken,
};
