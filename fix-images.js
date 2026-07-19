const fs = require('fs');
const path = require('path');

// Pattern cần thay thế
const oldPattern = /product\.images\?\.\S*find\(img => img\.is_primary\)\?\.image_url \|\| product\.images\?\.\[0\]\?\.image_url \|\| product\.image_url/g;
const newPattern = 'product.imageUrl || product.image || product.image_url';

const oldPattern2 = /relatedProduct\.images\?\.\S*find\(img => img\.is_primary\)\?\.image_url \|\| relatedProduct\.images\?\.\[0\]\?\.image_url \|\| relatedProduct\.image_url/g;
const newPattern2 = 'relatedProduct.imageUrl || relatedProduct.image || relatedProduct.image_url';

const filesToFix = [
    'client/src/pages/Home/Home.jsx',
    'client/src/pages/Cart/Cart.jsx',
    'client/src/pages/Offer/Offers.jsx',
    'client/src/pages/ProductDetail/ProductDetail.jsx',
    'client/src/components/Navbar.jsx',
    'client/src/components/Header.jsx',
    'client/src/pages/Admin/AdminSettings.jsx'
];

console.log('🔧 Bắt đầu fix hiển thị hình ảnh...\n');

filesToFix.forEach(filePath => {
    const fullPath = path.join(__dirname, filePath);
    
    if (!fs.existsSync(fullPath)) {
        console.log(`⚠️  File không tồn tại: ${filePath}`);
        return;
    }
    
    let content = fs.readFileSync(fullPath, 'utf8');
    const originalContent = content;
    
    // Thay thế pattern 1
    content = content.replace(oldPattern, newPattern);
    
    // Thay thế pattern 2
    content = content.replace(oldPattern2, newPattern2);
    
    if (content !== originalContent) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`✅ Đã fix: ${filePath}`);
    } else {
        console.log(`   Bỏ qua: ${filePath} (không cần sửa)`);
    }
});

console.log('\n✨ Hoàn tất!\n');
