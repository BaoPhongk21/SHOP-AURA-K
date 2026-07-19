require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const axios = require('axios');

const BREVO_API_KEY = process.env.BREVO_SMTP_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL;

console.log('=== TEST BREVO REST API ===\n');

async function testAPI() {
    try {
        // Test 1: Check account
        console.log('1. Checking account...');
        const accountRes = await axios.get('https://api.brevo.com/v3/account', {
            headers: { 'api-key': BREVO_API_KEY }
        });
        console.log('✅ Account info:', accountRes.data.companyName || 'OK');
        
        // Test 2: Send email
        console.log('\n2. Sending test email...');
        const emailRes = await axios.post('https://api.brevo.com/v3/smtp/email', {
            sender: { name: 'Aura K Shop', email: FROM_EMAIL },
            to: [{ email: FROM_EMAIL, name: 'Test' }],
            subject: 'Test Email from Aura K Shop',
            htmlContent: '<h1>Test thành công!</h1><p>Email hoạt động!</p>'
        }, {
            headers: { 
                'api-key': BREVO_API_KEY,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Email sent! ID:', emailRes.data.messageId);
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.response?.data?.message || err.message);
        console.error('Status:', err.response?.status);
        process.exit(1);
    }
}

testAPI();
