// Script tạo các secrets cần thiết cho deployment
const crypto = require('crypto');

console.log('\n🔐 GENERATING SECRETS FOR DEPLOYMENT\n');
console.log('═══════════════════════════════════════════════════════════\n');

// Tạo JWT Secret (64 bytes = 128 hex chars)
const jwtSecret = crypto.randomBytes(64).toString('hex');
console.log('📝 JWT_SECRET (Copy vào Vercel Environment Variables):');
console.log('─────────────────────────────────────────────────────────');
console.log(jwtSecret);
console.log('');

// Tạo VNPay Hash Secret (nếu chưa có)
const vnpaySecret = crypto.randomBytes(32).toString('hex');
console.log('💳 VNP_HASH_SECRET (Optional - chỉ nếu dùng VNPay):');
console.log('─────────────────────────────────────────────────────────');
console.log(vnpaySecret);
console.log('');

// Tạo session secret
const sessionSecret = crypto.randomBytes(32).toString('hex');
console.log('🔑 SESSION_SECRET (Optional - nếu dùng sessions):');
console.log('─────────────────────────────────────────────────────────');
console.log(sessionSecret);
console.log('');

console.log('═══════════════════════════════════════════════════════════');
console.log('\n✅ Secrets generated successfully!\n');
console.log('📋 Next steps:');
console.log('1. Copy JWT_SECRET above');
console.log('2. Go to Vercel Dashboard → Settings → Environment Variables');
console.log('3. Add new variable: JWT_SECRET');
console.log('4. Paste the value');
console.log('5. Select: Production, Preview, Development');
console.log('6. Click Save\n');
console.log('⚠️  IMPORTANT: Keep these secrets safe and NEVER commit to Git!\n');
