const { VNPay } = require('vnpay');

const tmnCode = process.env.VNP_TMN_CODE;
const secureSecret = process.env.VNP_HASH_SECRET;

if (!tmnCode || !secureSecret) {
    throw new Error('VNP_TMN_CODE and VNP_HASH_SECRET are required to initialize VNPay');
}

const vnpay = new VNPay({
    tmnCode,
    secureSecret,
    vnpayHost: 'https://sandbox.vnpayment.vn',
    testMode: process.env.VNP_TEST_MODE !== 'false',
});

module.exports = vnpay;
