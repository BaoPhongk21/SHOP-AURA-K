const fs = require('fs');
const path = require('path');

const filesToUpdate = [
    'client/src/pages/Home/Home.jsx',
    'client/src/pages/Offer/Offers.jsx',
    'client/src/pages/ProductDetail/ProductDetail.jsx',
    'client/src/pages/Checkout/Checkout.jsx',
    'client/src/components/Navbar.jsx',
    'client/src/components/Header.jsx'
];

console.log('📦 Adding formatPrice import to files...\n');

filesToUpdate.forEach(filePath => {
    const fullPath = path.join(__dirname, filePath);
    
    if (!fs.existsSync(fullPath)) {
        console.log(`⚠️  File không tồn tại: ${filePath}`);
        return;
    }
    
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Check if already imported
    if (content.includes('formatPrice')) {
        console.log(`   Bỏ qua: ${filePath} (đã có formatPrice)`);
        return;
    }
    
    // Find the last import statement
    const lines = content.split('\n');
    let lastImportIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('import ')) {
            lastImportIndex = i;
        } else if (lastImportIndex !== -1 && lines[i].trim() !== '') {
            break;
        }
    }
    
    if (lastImportIndex !== -1) {
        // Insert after last import
        lines.splice(lastImportIndex + 1, 0, "import { formatPrice } from '../../utils/formatPrice';");
        content = lines.join('\n');
        
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`✅ Đã thêm: ${filePath}`);
    } else {
        console.log(`⚠️  Không tìm thấy import: ${filePath}`);
    }
});

console.log('\n✨ Hoàn tất!\n');
