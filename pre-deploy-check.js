// Script kiểm tra toàn bộ trước khi deploy
const fs = require('fs');
const path = require('path');

console.log('🔍 BẮT ĐẦU KIỂM TRA TRƯỚC KHI DEPLOY...\n');

let errors = [];
let warnings = [];
let success = [];

// 1. Kiểm tra cấu trúc thư mục
console.log('📁 Kiểm tra cấu trúc thư mục...');
const requiredDirs = [
  'client/src',
  'client/public',
  'server/src',
  'api'
];

requiredDirs.forEach(dir => {
  if (fs.existsSync(path.join(__dirname, dir))) {
    success.push(`✅ Thư mục ${dir} tồn tại`);
  } else {
    errors.push(`❌ Thiếu thư mục ${dir}`);
  }
});

// 2. Kiểm tra file cấu hình quan trọng
console.log('\n📝 Kiểm tra file cấu hình...');
const requiredFiles = {
  'vercel.json': true,
  'api/index.js': true,
  'client/package.json': true,
  'server/package.json': true,
  '.env.example': true,
  'client/.env.example': true
};

Object.keys(requiredFiles).forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    success.push(`✅ File ${file} tồn tại`);
  } else {
    errors.push(`❌ Thiếu file ${file}`);
  }
});

// 3. Kiểm tra package.json - Client
console.log('\n📦 Kiểm tra Client package.json...');
try {
  const clientPkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'client/package.json'), 'utf8'));
  
  if (clientPkg.scripts && clientPkg.scripts.build) {
    success.push('✅ Client có script build');
  } else {
    errors.push('❌ Client thiếu script build');
  }

  const requiredDeps = ['react', 'react-dom', 'react-router-dom', 'axios'];
  requiredDeps.forEach(dep => {
    if (clientPkg.dependencies && clientPkg.dependencies[dep]) {
      success.push(`✅ Client có dependency: ${dep}`);
    } else {
      errors.push(`❌ Client thiếu dependency: ${dep}`);
    }
  });

  if (clientPkg.devDependencies && clientPkg.devDependencies.vite) {
    success.push('✅ Client sử dụng Vite');
  } else {
    warnings.push('⚠️ Client không sử dụng Vite');
  }
} catch (e) {
  errors.push(`❌ Không thể đọc client/package.json: ${e.message}`);
}

// 4. Kiểm tra package.json - Server
console.log('\n🖥️ Kiểm tra Server package.json...');
try {
  const serverPkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'server/package.json'), 'utf8'));
  
  if (serverPkg.scripts && serverPkg.scripts.start) {
    success.push('✅ Server có script start');
  } else {
    errors.push('❌ Server thiếu script start');
  }

  if (serverPkg.main) {
    success.push(`✅ Server có entry point: ${serverPkg.main}`);
  } else {
    warnings.push('⚠️ Server không có field "main"');
  }

  const requiredDeps = ['express', 'cors', 'sequelize', 'pg'];
  requiredDeps.forEach(dep => {
    if (serverPkg.dependencies && serverPkg.dependencies[dep]) {
      success.push(`✅ Server có dependency: ${dep}`);
    } else {
      errors.push(`❌ Server thiếu dependency: ${dep}`);
    }
  });
} catch (e) {
  errors.push(`❌ Không thể đọc server/package.json: ${e.message}`);
}

// 5. Kiểm tra .env.example
console.log('\n🔐 Kiểm tra biến môi trường...');
try {
  const envExample = fs.readFileSync(path.join(__dirname, '.env.example'), 'utf8');
  const requiredEnvVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'PORT',
    'NODE_ENV',
    'FRONTEND_URL',
    'BACKEND_URL'
  ];

  requiredEnvVars.forEach(envVar => {
    if (envExample.includes(envVar)) {
      success.push(`✅ .env.example có ${envVar}`);
    } else {
      warnings.push(`⚠️ .env.example thiếu ${envVar}`);
    }
  });
} catch (e) {
  errors.push(`❌ Không thể đọc .env.example: ${e.message}`);
}

// 6. Kiểm tra vercel.json
console.log('\n☁️ Kiểm tra cấu hình Vercel...');
try {
  const vercelConfig = JSON.parse(fs.readFileSync(path.join(__dirname, 'vercel.json'), 'utf8'));
  
  if (vercelConfig.builds && Array.isArray(vercelConfig.builds)) {
    success.push('✅ vercel.json có cấu hình builds');
    
    const hasApiConfig = vercelConfig.builds.some(b => b.src && b.src.includes('api'));
    const hasClientConfig = vercelConfig.builds.some(b => b.src && b.src.includes('client'));
    
    if (hasApiConfig) success.push('✅ vercel.json có cấu hình API');
    else errors.push('❌ vercel.json thiếu cấu hình API');
    
    if (hasClientConfig) success.push('✅ vercel.json có cấu hình Client');
    else errors.push('❌ vercel.json thiếu cấu hình Client');
  } else {
    errors.push('❌ vercel.json thiếu hoặc sai cấu hình builds');
  }

  if (vercelConfig.routes && Array.isArray(vercelConfig.routes)) {
    success.push('✅ vercel.json có cấu hình routes');
  } else {
    warnings.push('⚠️ vercel.json thiếu cấu hình routes');
  }
} catch (e) {
  errors.push(`❌ Không thể đọc hoặc parse vercel.json: ${e.message}`);
}

// 7. Kiểm tra api/index.js
console.log('\n🔌 Kiểm tra API entry point...');
try {
  const apiIndex = fs.readFileSync(path.join(__dirname, 'api/index.js'), 'utf8');
  
  if (apiIndex.includes('module.exports')) {
    success.push('✅ api/index.js export app');
  } else {
    errors.push('❌ api/index.js không export app');
  }

  if (apiIndex.includes('../server/server')) {
    success.push('✅ api/index.js import từ server/server.js');
  } else {
    warnings.push('⚠️ api/index.js có thể import sai đường dẫn');
  }
} catch (e) {
  errors.push(`❌ Không thể đọc api/index.js: ${e.message}`);
}

// 8. Kiểm tra xem có .env thật không (không nên commit)
console.log('\n🔒 Kiểm tra bảo mật...');
if (fs.existsSync(path.join(__dirname, '.env'))) {
  warnings.push('⚠️ File .env tồn tại - Đảm bảo không commit file này!');
}

// Kiểm tra .gitignore
try {
  const gitignore = fs.readFileSync(path.join(__dirname, '.gitignore'), 'utf8');
  if (gitignore.includes('.env')) {
    success.push('✅ .gitignore có .env');
  } else {
    errors.push('❌ .gitignore không có .env - RỦI RO BẢO MẬT!');
  }
  
  if (gitignore.includes('node_modules')) {
    success.push('✅ .gitignore có node_modules');
  } else {
    warnings.push('⚠️ .gitignore không có node_modules');
  }
} catch (e) {
  warnings.push('⚠️ Không tìm thấy .gitignore');
}

// KẾT QUẢ CUỐI CÙNG
console.log('\n' + '='.repeat(60));
console.log('📊 KẾT QUẢ KIỂM TRA');
console.log('='.repeat(60));

if (success.length > 0) {
  console.log(`\n✅ THÀNH CÔNG (${success.length}):`);
  success.forEach(s => console.log(`   ${s}`));
}

if (warnings.length > 0) {
  console.log(`\n⚠️  CẢNH BÁO (${warnings.length}):`);
  warnings.forEach(w => console.log(`   ${w}`));
}

if (errors.length > 0) {
  console.log(`\n❌ LỖI (${errors.length}):`);
  errors.forEach(e => console.log(`   ${e}`));
}

console.log('\n' + '='.repeat(60));

if (errors.length === 0) {
  console.log('✅ TẤT CẢ KIỂM TRA QUAN TRỌNG ĐÃ PASS!');
  console.log('🚀 Bạn có thể deploy lên Vercel ngay bây giờ!');
  console.log('\nCác bước deploy:');
  console.log('1. Tạo project mới trên Vercel');
  console.log('2. Kết nối với GitHub repository');
  console.log('3. Thêm các biến môi trường từ .env.example');
  console.log('4. Deploy!');
  process.exit(0);
} else {
  console.log('❌ CÒN LỖI CẦN SỬA TRƯỚC KHI DEPLOY!');
  console.log('Vui lòng sửa các lỗi trên trước khi tiếp tục.');
  process.exit(1);
}
