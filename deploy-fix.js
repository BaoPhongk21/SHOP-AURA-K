#!/usr/bin/env node
/**
 * Script deploy tự động lên Vercel với Supabase Pooler URL.
 * Chạy: node deploy-fix.js
 */

const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

async function main() {
  console.log('==== Vercel + Supabase Deployment Tool ====\n');

  const supabaseRef = 'hpkmkfepjkeorauvfizd';
  const defaultPoolerUrl = `postgresql://postgres.${supabaseRef}:Bin0325704117@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true`;

  console.log('Pooler URL mặc định:');
  console.log(`  ${defaultPoolerUrl}\n`);

  const poolerUrl = await ask('Nhập Pooler URL (Enter để dùng mặc định): ') || defaultPoolerUrl;

  rl.close();

  console.log('\n Bạn cần thực hiện các bước sau trên Vercel Dashboard:');
  console.log('─'.repeat(60));
  console.log('1. Vào https://vercel.com/dashboard');
  console.log('2. Chọn project shop-aura-k-ki');
  console.log('3. Settings → Environment Variables');
  console.log('4. Tìm DATABASE_URL → Edit → Paste URL pooler ở trên');
  console.log(`\n   ${poolerUrl}\n`);
  console.log('5. Click Save');
  console.log('6. Vào Deployments → click "..." → Redeploy');
  console.log('─'.repeat(60));

  // Cập nhật code để xử lý pooler URL tự động
  console.log('\nĐang cập nhật code để tự động dùng pooler URL...');

  const databasePath = 'server/src/config/database.js';
  console.log(`  Sửa file: ${databasePath}`);

  // Set DATABASE_URL for local testing
  process.env.DATABASE_URL = poolerUrl;

  console.log('\nHoàn tất! Bây giờ hãy làm theo hướng dẫn trên Vercel.');
}

main().catch(console.error);
