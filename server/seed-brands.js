const { sequelize } = require('./src/config/database');

const brands = [
  {
    name: 'Gucci',
    tier: 'luxury',
    description: 'Thương hiệu thời trang cao cấp nước Ý, biểu tượng của sự sang trọng và đẳng cấp.',
    logo_url: null
  },
  {
    name: 'Nike',
    tier: 'street',
    description: 'Thương hiệu thể thao hàng đầu thế giới, năng động và hiện đại.',
    logo_url: null
  },
  {
    name: 'Adidas',
    tier: 'street',
    description: 'Phong cách thể thao kinh điển, kết hợp giữa hiệu suất và thời trang đường phố.',
    logo_url: null
  },
  {
    name: 'Uniqlo',
    tier: 'street',
    description: 'Trang phục tối giản, chất lượng cao, phù hợp phong cách sống hiện đại.',
    logo_url: null
  },
  {
    name: 'H&M',
    tier: 'street',
    description: 'Thời trang nhanh, xu hướng mới liên tục, giá cả hợp lý.',
    logo_url: null
  },
  {
    name: 'Zara',
    tier: 'street',
    description: 'Thiết kế thời thượng theo xu hướng quốc tế, cập nhật liên tục.',
    logo_url: null
  }
];

const run = async () => {
  try {
    console.log('🔧 Kết nối database...');
    await sequelize.authenticate();
    console.log('✅ Đã kết nối database');

    console.log('🛠️  Khởi tạo bảng brands nếu chưa tồn tại...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS brands (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        tier VARCHAR(50) NOT NULL DEFAULT 'street',
        description TEXT,
        logo_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await sequelize.query("ALTER TABLE brands ADD COLUMN IF NOT EXISTS tier VARCHAR(50) NOT NULL DEFAULT 'street'");
    await sequelize.query("ALTER TABLE brands ADD COLUMN IF NOT EXISTS description TEXT");
    await sequelize.query("ALTER TABLE brands ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500)");

    for (const brand of brands) {
      const query = `
        INSERT INTO brands (name, tier, description, logo_url, created_at, updated_at)
        VALUES (?, ?, ?, ?, NOW(), NOW())
        ON CONFLICT (name) DO UPDATE SET
          tier = EXCLUDED.tier,
          description = EXCLUDED.description,
          logo_url = EXCLUDED.logo_url,
          updated_at = NOW()
      `;
      await sequelize.query(query, { replacements: [brand.name, brand.tier, brand.description, brand.logo_url] });
      console.log(`✅ Đã cập nhật thương hiệu: ${brand.name}`);
    }

    console.log('🎉 Cập nhật brands hoàn tất');
  } catch (error) {
    console.error('❌ Lỗi khi cập nhật brands:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

run();
