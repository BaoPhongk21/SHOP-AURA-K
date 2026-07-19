const axios = require('axios');

// Usage: set environment variables before running:
// BASE_URL (default http://localhost:3000), TOKEN (Bearer token if needed), VARIANT_ID, QUANTITY, CONCURRENCY

// Test defaults (safe for local dev): skip order auth and target local server:5000
process.env.SKIP_ORDER_AUTH_FOR_TEST = process.env.SKIP_ORDER_AUTH_FOR_TEST || '1';
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const TOKEN = process.env.TOKEN || '';
const VARIANT_ID = parseInt(process.env.VARIANT_ID || '1', 10);
const PRODUCT_ID = parseInt(process.env.PRODUCT_ID || process.env.VARIANT_ID || '1', 10);
const QUANTITY = parseInt(process.env.QUANTITY || '1', 10);
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '10', 10);

if (!VARIANT_ID) {
  console.error('Please set VARIANT_ID env var to a valid product variant id');
  process.exit(1);
}

const createOrderPayload = (i) => ({
  items: [
    { product_id: PRODUCT_ID, variant_id: VARIANT_ID, quantity: QUANTITY }
  ],
  shippingInfo: { address: 'Test address', phone: '0123456789', name: 'Tester' },
  payment_method: 'cod'
});

async function send(i) {
  try {
    const resp = await axios.post(`${BASE_URL}/api/v1/orders`, createOrderPayload(i), {
      headers: Object.assign({}, TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}, { 'x-skip-order-auth': '1' })
    });
    return { idx: i, status: resp.status, data: resp.data };
  } catch (err) {
    if (err.response) return { idx: i, status: err.response.status, data: err.response.data };
    return { idx: i, error: err.message };
  }
}

(async () => {
  const tasks = [];
  for (let i = 0; i < CONCURRENCY; i++) tasks.push(send(i));

  const results = await Promise.all(tasks);
  console.log('Results:');
  results.forEach(r => console.log(JSON.stringify(r)));
  const errors = results.filter(r => r.status && r.status >= 500);
  const non2xx = results.filter(r => r.status && (r.status < 200 || r.status >= 300));
  console.log(`\nSummary: ${results.length} requests, ${errors.length} server errors (5xx), ${non2xx.length} non-2xx responses`);
  if (errors.length > 0) {
    console.error('Integration test failed: server returned 5xx for some concurrent requests');
    process.exit(1);
  }
  // otherwise success
  process.exit(0);
})();
