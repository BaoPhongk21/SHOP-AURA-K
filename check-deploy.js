// Script kiểm tra cấu hình trước khi deploy
const fs = require('fs');
const path = require('path');

console.log('🔍 Checking deployment configuration...\n');

let errors = [];
let warnings = [];
let success = [];

// 1. Kiểm tra vercel.json
const vercelJsonPath = path.join(__dirname, 'vercel.json');
if (fs.existsSync(vercelJsonPath)) {
  success.push('✅ vercel.json exists');
  try {
    const vercelConfig = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8'));
    if (vercelConfig.builds && vercelConfig.routes) {
      success.push('✅ vercel.json has builds and routes');
    } else {
      errors.push('❌ vercel.json missing builds or routes');
    }
  } catch (e) {
    errors.push('❌ vercel.json is not valid JSON');
  }
} else {
  errors.push('❌ vercel.json not found');
}

// 2. Kiểm tra api/index.js
const apiIndexPath = path.join(__dirname, 'api', 'index.js');
if (fs.existsSync(apiIndexPath)) {
  success.push('✅ api/index.js exists');
} else {
  errors.push('❌ api/index.js not found');
}

// 3. Kiểm tra .env.example
const envExamplePath = path.join(__dirname, '.env.example');
if (fs.existsSync(envExamplePath)) {
  success.push('✅ .env.example exists');
  const envContent = fs.readFileSync(envExamplePath, 'utf8');
  const requiredVars = ['DATABASE_URL', 'JWT_SECRET', 'NODE_ENV'];
  requiredVars.forEach(varName => {
    if (envContent.includes(varName)) {
      success.push(`  ✅ ${varName} documented`);
    } else {
      warnings.push(`  ⚠️  ${varName} not in .env.example`);
    }
  });
} else {
  warnings.push('⚠️  .env.example not found');
}

// 4. Kiểm tra .gitignore
const gitignorePath = path.join(__dirname, '.gitignore');
if (fs.existsSync(gitignorePath)) {
  const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
  if (gitignoreContent.includes('.env')) {
    success.push('✅ .env is in .gitignore');
  } else {
    errors.push('❌ .env NOT in .gitignore - SECURITY RISK!');
  }
} else {
  warnings.push('⚠️  .gitignore not found');
}

// 5. Kiểm tra package.json scripts
const packageJsonPath = path.join(__dirname, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  if (packageJson.scripts && packageJson.scripts.build) {
    success.push('✅ package.json has build script');
  } else {
    errors.push('❌ package.json missing build script');
  }
  
  if (packageJson.engines && packageJson.engines.node) {
    success.push(`✅ Node version specified: ${packageJson.engines.node}`);
  } else {
    warnings.push('⚠️  Node version not specified in engines');
  }
}

// 6. Kiểm tra client/package.json
const clientPackagePath = path.join(__dirname, 'client', 'package.json');
if (fs.existsSync(clientPackagePath)) {
  const clientPackage = JSON.parse(fs.readFileSync(clientPackagePath, 'utf8'));
  if (clientPackage.scripts && clientPackage.scripts.build) {
    success.push('✅ client/package.json has build script');
  } else {
    errors.push('❌ client/package.json missing build script');
  }
}

// 7. Kiểm tra server/server.js
const serverPath = path.join(__dirname, 'server', 'server.js');
if (fs.existsSync(serverPath)) {
  const serverContent = fs.readFileSync(serverPath, 'utf8');
  if (serverContent.includes('module.exports')) {
    success.push('✅ server.js exports app for Vercel');
  } else {
    errors.push('❌ server.js does not export app');
  }
}

// 8. Kiểm tra database config
const dbConfigPath = path.join(__dirname, 'server', 'src', 'config', 'database.js');
if (fs.existsSync(dbConfigPath)) {
  const dbContent = fs.readFileSync(dbConfigPath, 'utf8');
  if (dbContent.includes('DATABASE_URL')) {
    success.push('✅ Database config supports DATABASE_URL');
  } else {
    warnings.push('⚠️  Database config might not support DATABASE_URL');
  }
  
  if (dbContent.includes('ssl') || dbContent.includes('dialectOptions')) {
    success.push('✅ Database config has SSL support');
  } else {
    warnings.push('⚠️  Database config might not support SSL (needed for Neon)');
  }
}

// In kết quả
console.log('═══════════════════════════════════════\n');

if (success.length > 0) {
  console.log('✨ SUCCESSES:\n');
  success.forEach(msg => console.log(msg));
  console.log('');
}

if (warnings.length > 0) {
  console.log('⚠️  WARNINGS:\n');
  warnings.forEach(msg => console.log(msg));
  console.log('');
}

if (errors.length > 0) {
  console.log('❌ ERRORS (MUST FIX):\n');
  errors.forEach(msg => console.log(msg));
  console.log('');
}

console.log('═══════════════════════════════════════\n');

if (errors.length === 0) {
  console.log('🎉 READY TO DEPLOY! Run: git push origin main\n');
  process.exit(0);
} else {
  console.log('🛑 FIX ERRORS BEFORE DEPLOYING\n');
  process.exit(1);
}
