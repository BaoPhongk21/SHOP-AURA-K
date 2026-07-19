const fs = require('fs');
const path = require('path');

function replaceInDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
        replaceInDir(filePath);
      }
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Check if it actually contains localhost:5000 before processing
      if (content.includes('http://localhost:5000')) {
        // Placeholders to protect already-correct usages
        content = content.replace(/import\.meta\.env\.VITE_API_URL\s*\|\|\s*'http:\/\/localhost:5000'/g, 'PLACEHOLDER_API_URL');
        content = content.replace(/import\.meta\.env\.VITE_API_URL\s*\|\|\s*"http:\/\/localhost:5000"/g, 'PLACEHOLDER_API_URL');
        
        // Replace all remaining naked 'http://localhost:5000' with the environment variable or fallback
        content = content.replace(/http:\/\/localhost:5000/g, "import.meta.env.VITE_API_URL || 'http://localhost:5000'");
        
        // Restore placeholders
        content = content.replace(/PLACEHOLDER_API_URL/g, "import.meta.env.VITE_API_URL || 'http://localhost:5000'");
        
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated API URLs in: ${filePath}`);
      }
    }
  }
}

replaceInDir(path.join(__dirname, 'client/src'));
console.log('✅ All hardcoded API URLs in client/src have been successfully updated to support dynamic VITE_API_URL!');
