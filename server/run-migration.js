const { sequelize } = require('./src/config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    try {
        console.log('🚀 Bắt đầu migration...');
        
        // Đọc file SQL
        const sqlFile = path.join(__dirname, 'migrations', 'add_hero_content_to_settings.sql');
        const sql = fs.readFileSync(sqlFile, 'utf8');
        
        // Tách các câu lệnh SQL
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));
        
        // Thực thi từng câu lệnh
        for (const statement of statements) {
            if (statement.toLowerCase().includes('select')) {
                const [results] = await sequelize.query(statement);
                console.log('✅ Kết quả:', results);
            } else {
                await sequelize.query(statement);
                console.log('✅ Đã thực thi:', statement.substring(0, 50) + '...');
            }
        }
        
        console.log('🎉 Migration hoàn tất!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Lỗi migration:', error);
        process.exit(1);
    }
}

runMigration();
