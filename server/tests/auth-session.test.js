const test = require('node:test');
const assert = require('node:assert/strict');
const { createAuthToken, verifyAuthToken } = require('../src/utils/authSession');

test('token becomes invalid when the server session version changes', () => {
  process.env.AUTH_SESSION_VERSION = 'server-v1';
  const secret = 'test-secret';
  const token = createAuthToken({ id: 1, role: 'customer' }, secret);

  process.env.AUTH_SESSION_VERSION = 'server-v2';

  assert.throws(() => verifyAuthToken(token, secret), /SESSION_INVALIDATED/);
});

test('token remains valid for the current server session version', () => {
  process.env.AUTH_SESSION_VERSION = 'server-v3';
  const secret = 'test-secret';
  const token = createAuthToken({ id: 2, role: 'admin' }, secret);

  const decoded = verifyAuthToken(token, secret);

  assert.equal(decoded.id, 2);
  assert.equal(decoded.role, 'admin');
  assert.equal(decoded.sessionVersion, 'server-v3');
});
