const { sequelize } = require('../config/database');



const getAllBrands = async (req, res) => {
  try {

    const [brands] = await sequelize.query('SELECT id, name, tier, description, logo_url FROM brands ORDER BY name ASC');

    if (brands.length > 0) {
      return res.status(200).json({ success: true, data: brands });
    }

    const [productBrands] = await sequelize.query("SELECT DISTINCT brand FROM products WHERE brand IS NOT NULL AND brand != '' ORDER BY brand ASC");
    const fallbackBrands = (productBrands || []).map((row) => ({
      name: row.brand,
      tier: '',
      description: '',
      logo_url: null
    }));

    return res.status(200).json({ success: true, data: fallbackBrands });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách thương hiệu:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server khi lấy danh sách thương hiệu' });
  }
};

module.exports = {
  getAllBrands,
};
