export const translateCategoryName = (name, lang) => {
  if (!name) return '';
  if (lang === 'vi') return name;
  const lowercase = name.toLowerCase();
  if (lowercase.includes('thể thao') || lowercase.includes('sport')) return 'Sportswear';
  if (lowercase.includes('quần dài') || lowercase.includes('quần nam') || lowercase.includes('quần nữ')) return 'Pants & Trousers';
  if (lowercase.includes('áo khoác') || lowercase.includes('hoodie')) return 'Jackets & Hoodies';
  if (lowercase.includes('áo thun') || lowercase.includes('polo') || lowercase.includes('t-shirt') || lowercase.includes('áo polo')) return 'T-Shirts & Polos';
  if (lowercase === 'áo' || lowercase.includes('áo')) return 'Tops & Shirts';
  if (lowercase.includes('váy') || lowercase.includes('đầm') || lowercase.includes('dress') || lowercase.includes('đầm nữ')) return 'Dresses & Skirts';
  if (lowercase.includes('nam') || lowercase.includes('men')) return "Men's Fashion";
  if (lowercase.includes('nữ') || lowercase.includes('women')) return "Women's Fashion";
  if (lowercase.includes('phụ kiện') || lowercase.includes('accessories')) return 'Accessories';
  if (lowercase.includes('gia dụng') || lowercase.includes('nội thất') || lowercase.includes('home')) return 'Home & Living';
  if (lowercase.includes('giày') || lowercase.includes('shoes')) return 'Shoes & Footwear';
  if (lowercase.includes('nước hoa') || lowercase.includes('fragrance')) return 'Fragrances';
  if (lowercase === 'quần') return 'Pants & Bottoms';
  return name;
};

export const translateProductName = (name, lang) => {
  if (!name || lang === 'vi') return name;

  let translated = name;

  const translations = [
    { vi: 'áo hoodie', en: 'hoodie' },
    { vi: 'áo polo', en: 'polo shirt' },
    { vi: 'áo khoác', en: 'jacket' },
    { vi: 'áo thun', en: 't-shirt' },
    { vi: 'áo sơ mi', en: 'shirt' },
    { vi: 'áo vest', en: 'vest' },
    { vi: 'áo len', en: 'sweater' },
    { vi: 'áo blazer', en: 'blazer' },
    { vi: 'giày thể thao', en: 'sneakers' },
    { vi: 'quần dài', en: 'pants' },
    { vi: 'quần short', en: 'shorts' },
    { vi: 'quần jean', en: 'jeans' },
    { vi: 'quần kaki', en: 'chinos' },
    { vi: 'tập gym', en: 'gym wear' },
    { vi: 'họa tiết', en: 'pattern' },
    { vi: 'mẫu mới', en: 'new style' },
    { vi: 'cổ tròn', en: 'round neck' },
    { vi: 'cổ vuông', en: 'v-neck' },
    { vi: 'cổ tim', en: 'sweetheart neck' },
    { vi: 'cổ cao', en: 'high neck' },
    { vi: 'dài tay', en: 'long sleeve' },
    { vi: 'ngắn tay', en: 'short sleeve' },
    { vi: 'tay lửng', en: 'three-quarter sleeve' },
    { vi: 'áo hai dây', en: 'tank top' },
    { vi: 'áo ba lỗ', en: 'sleeveless' },
    { vi: 'áo', en: 'shirt' },
    { vi: 'quần', en: 'pants' },
    { vi: 'váy', en: 'skirt' },
    { vi: 'đầm', en: 'dress' },
    { vi: 'giày', en: 'shoes' },
    { vi: 'dép', en: 'sandals' },
    { vi: 'sandal', en: 'sandal' },
    { vi: 'boot', en: 'boot' },
    { vi: 'thể thao', en: 'sports' },
    { vi: 'thương hiệu', en: 'brand' },
    { vi: 'phụ kiện', en: 'accessories' },
    { vi: 'dây nịt', en: 'belt' },
    { vi: 'nam', en: 'men' },
    { vi: 'nữ', en: 'women' },
    { vi: 'mũ', en: 'cap' },
    { vi: 'túi', en: 'bag' },
    { vi: 'balo', en: 'backpack' },
    { vi: 'ví', en: 'wallet' },
    { vi: 'kính', en: 'glasses' },
    { vi: 'đồng hồ', en: 'watch' },
    { vi: 'denim', en: 'denim' },
    { vi: 'cotton', en: 'cotton' },
    { vi: 'len', en: 'wool' },
    { vi: 'lụa', en: 'silk' },
    { vi: 'nỉ', en: 'fleece' },
    { vi: 'thun', en: 'jersey' },
    { vi: 'vải', en: 'fabric' },
    { vi: 'chất lượng', en: 'quality' },
    { vi: 'cao cấp', en: 'premium' },
    { vi: 'thời trang', en: 'fashion' },
    { vi: 'casual', en: 'casual' },
    { vi: 'sport', en: 'sport' },
    { vi: 'outdoor', en: 'outdoor' },
    { vi: 'basic', en: 'basic' },
    { vi: 'sọc', en: 'striped' },
    { vi: 'trơn', en: 'plain' },
    { vi: 'in hoa', en: 'floral print' },
    { vi: 'kẻ caro', en: 'plaid' },
    { vi: 'oversize', en: 'oversized' },
    { vi: 'rộng', en: 'loose' },
    { vi: 'ôm', en: 'slim' },
    { vi: 'bó', en: 'tight' },
    { vi: 'suông', en: 'straight' },
    { vi: 'midi', en: 'midi' },
    { vi: 'mini', en: 'mini' },
    { vi: 'maxi', en: 'maxi' },
    { vi: 'ngắn', en: 'short' },
    { vi: 'dài', en: 'long' },
    { vi: 'hè', en: 'summer' },
    { vi: 'đông', en: 'winter' },
    { vi: 'thu', en: 'autumn' },
    { vi: 'xuân', en: 'spring' },
    { vi: 'mới', en: 'new' },
    { vi: 'cũ', en: 'classic' }
  ];

  for (const { vi: viKey, en } of translations) {
    const escaped = viKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}([^\\p{L}\\p{N}]|$)`, 'giu');
    translated = translated.replace(regex, (match, before, after) => `${before}${en}${after}`);
  }

  return translated;
};

export const translateColorName = (color, lang) => {
  if (!color) return '';
  if (lang === 'vi') return color;
  
  const colorMap = {
    'đen': 'Black',
    'trắng': 'White',
    'xám': 'Gray',
    'xanh navy': 'Navy Blue',
    'đỏ': 'Red',
    'xanh dương': 'Blue',
    'be': 'Beige',
    'vàng': 'Yellow',
    'xanh lá': 'Green',
    'hồng': 'Pink',
    'tím': 'Purple',
    'nâu': 'Brown',
    'cam': 'Orange'
  };

  const lowercase = color.toLowerCase();
  return colorMap[lowercase] || color;
};

export const translateProductDescription = (description, lang) => {
  if (!description) return '';
  if (lang === 'vi') return description;

  let translated = description;

  const translations = [
    // ===== Exact full descriptions from seed data =====
    { vi: 'áo hoodie nike tech fleece cao cấp, chất liệu cotton pha polyester, thiết kế hiện đại, phù hợp cho hoạt động thể thao và dạo phố', en: 'premium nike tech fleece hoodie, cotton-polyester blend, modern design, suitable for sports and casual wear' },
    { vi: 'quần thể thao nike sportswear, chất liệu thấm hút mồ hôi tốt, co giãn 4 chiều, thoải mái cho mọi hoạt động', en: 'nike sportswear pants, sweat-absorbent material, 4-way stretch, comfortable for all activities' },
    { vi: 'quần legging nike pro cho nữ, chất liệu dri-fit thấm hút mồ hôi, ôm body tôn dáng, phù hợp tập yoga và gym', en: 'nike pro leggings for women, dri-fit sweat-wicking material, body-hugging, suitable for yoga and gym' },
    { vi: 'áo thun adidas essentials basic, chất cotton 100%, thấm hút tốt, form regular fit thoải mái', en: 'adidas essentials basic t-shirt, 100% cotton, good absorption, comfortable regular fit' },
    { vi: 'quần thể thao adidas tiro 23, thiết kế iconic với 3 sọc đặc trưng, chất liệu thoáng khí', en: 'adidas tiro 23 sports pants, iconic design with 3 signature stripes, breathable material' },
    { vi: 'áo khoác gió adidas, chất liệu chống nước nhẹ, có mũ trùm, phù hợp cho thời tiết se lạnh', en: 'adidas windbreaker, lightweight water-resistant material, with hood, suitable for cool weather' },
    { vi: 'áo thun gucci cao cấp với logo thương hiệu nổi bật, chất cotton premium, thiết kế sang trọng', en: 'premium gucci t-shirt with prominent brand logo, premium cotton, luxurious design' },
    { vi: 'váy lụa gucci cao cấp, chất liệu silk 100%, thiết kế tinh tế, phù hợp dự tiệc và sự kiện', en: 'premium gucci silk dress, 100% silk, exquisite design, suitable for parties and events' },
    { vi: 'áo khoác da zara phong cách biker, thiết kế trẻ trung, chất liệu da tổng hợp cao cấp', en: 'zara biker style leather jacket, youthful design, premium synthetic leather' },
    { vi: 'quần kaki zara slim fit, chất liệu cotton cao cấp, phù hợp đi làm và dạo phố', en: 'zara slim fit khakis, premium cotton material, suitable for work and strolling' },
    { vi: 'váy midi zara họa tiết hoa, thiết kế nữ tính, chất liệu voan nhẹ nhàng', en: 'zara floral midi dress, feminine design, lightweight chiffon material' },
    { vi: 'áo thun h&m premium cotton organic, mềm mại, thấm hút tốt, thân thiện môi trường', en: 'h&m premium organic cotton t-shirt, soft, good absorption, eco-friendly' },
    { vi: 'quần cargo h&m phong cách streetwear, nhiều túi tiện dụng, chất liệu bền bỉ', en: 'h&m streetwear cargo pants, convenient multi-pockets, durable material' },
    { vi: 'áo thun uniqlo airism mát lạnh, chống uv, kháng khuẩn, thấm hút mồ hôi tức thì', en: 'uniqlo airism cooling t-shirt, uv protection, antibacterial, instant moisture wicking' },
    { vi: 'quần jean uniqlo selvedge denim nhật bản, chất lượng cao, độ bền tốt', en: 'uniqlo japanese selvedge denim jeans, high quality, good durability' },

    // ===== Full sentence/phrase patterns (longest first to avoid partial matches) =====
    { vi: 'thấm hút mồ hôi tức thì', en: 'instant moisture-wicking' },
    { vi: 'thấm hút mồ hôi tốt', en: 'excellent moisture-wicking' },
    { vi: 'thấm hút mồ hôi', en: 'moisture-wicking' },
    { vi: 'phù hợp cho hoạt động thể thao và dạo phố', en: 'suitable for sports and streetwear' },
    { vi: 'phù hợp cho mọi hoạt động', en: 'suitable for all activities' },
    { vi: 'phù hợp tập yoga và gym', en: 'suitable for yoga and gym' },
    { vi: 'phù hợp cho thời tiết se lạnh', en: 'suitable for cool weather' },
    { vi: 'phù hợp đi làm và dạo phố', en: 'suitable for work and casual wear' },
    { vi: 'phù hợp dự tiệc và sự kiện', en: 'suitable for parties and events' },
    { vi: 'phù hợp đi chơi', en: 'great for casual outings' },
    { vi: 'phù hợp đi làm', en: 'great for work' },
    { vi: 'phù hợp', en: 'suitable' },
    { vi: 'thân thiện môi trường', en: 'eco-friendly' },
    { vi: 'thoải mái cho mọi hoạt động', en: 'comfortable for all activities' },
    { vi: 'chất liệu cotton pha polyester', en: 'cotton-polyester blend fabric' },
    { vi: 'chất liệu thấm hút mồ hôi tốt', en: 'moisture-wicking fabric' },
    { vi: 'chất liệu chống nước nhẹ', en: 'lightweight waterproof fabric' },
    { vi: 'chất liệu da tổng hợp cao cấp', en: 'premium synthetic leather' },
    { vi: 'chất liệu cotton cao cấp', en: 'premium cotton fabric' },
    { vi: 'chất liệu thoáng khí', en: 'breathable fabric' },
    { vi: 'chất liệu voan nhẹ nhàng', en: 'lightweight chiffon fabric' },
    { vi: 'chất liệu bền bỉ', en: 'durable fabric' },
    { vi: 'chất liệu Dri-FIT', en: 'Dri-FIT fabric' },
    { vi: 'chất liệu', en: 'fabric' },
    { vi: 'chất cotton premium', en: 'premium cotton' },
    { vi: 'chất cotton 100%', en: '100% cotton' },
    { vi: 'chất cotton', en: 'cotton fabric' },
    { vi: 'chất lượng cao', en: 'high quality' },
    { vi: 'chất lượng', en: 'quality' },
    { vi: 'da tổng hợp cao cấp', en: 'premium synthetic leather' },
    { vi: 'da tổng hợp', en: 'synthetic leather' },
    { vi: 'thiết kế hiện đại', en: 'modern design' },
    { vi: 'thiết kế tinh tế', en: 'elegant design' },
    { vi: 'thiết kế sang trọng', en: 'luxurious design' },
    { vi: 'thiết kế trẻ trung', en: 'youthful design' },
    { vi: 'thiết kế nữ tính', en: 'feminine design' },
    { vi: 'thiết kế iconic', en: 'iconic design' },
    { vi: 'thiết kế', en: 'design' },
    { vi: 'logo thương hiệu nổi bật', en: 'prominent brand logo' },
    { vi: 'thương hiệu nổi bật', en: 'prominent brand' },
    { vi: 'với logo', en: 'with logo' },
    { vi: 'nhiều túi tiện dụng', en: 'multiple utility pockets' },
    { vi: 'form regular fit thoải mái', en: 'comfortable regular fit' },
    { vi: 'form regular fit', en: 'regular fit' },
    { vi: 'ôm body tôn dáng', en: 'body-hugging and flattering' },
    { vi: 'phong cách biker', en: 'biker style' },
    { vi: 'phong cách streetwear', en: 'streetwear style' },
    { vi: 'phong cách', en: 'style' },
    { vi: '3 sọc đặc trưng', en: 'signature 3 stripes' },
    { vi: 'sọc đặc trưng', en: 'signature stripes' },
    { vi: 'họa tiết hoa', en: 'floral pattern' },
    { vi: 'họa tiết', en: 'pattern' },
    { vi: 'Nhật Bản', en: 'Japanese' },
    { vi: 'chống UV', en: 'UV protection' },
    { vi: 'chống nước', en: 'waterproof' },
    { vi: 'có mũ trùm', en: 'with hood' },
    { vi: 'mát lạnh', en: 'cool touch' },
    { vi: 'dạo phố', en: 'casual wear' },
    { vi: 'dự tiệc', en: 'party' },
    { vi: 'sự kiện', en: 'events' },
    { vi: 'đi làm', en: 'work' },
    { vi: 'tập yoga', en: 'yoga' },
    { vi: 'hoạt động thể thao', en: 'sports activities' },
    { vi: 'thể thao', en: 'sports' },
    { vi: 'độ bền tốt', en: 'good durability' },
    { vi: 'thấm hút tốt', en: 'good absorption' },
    { vi: 'nhẹ nhàng', en: 'lightweight' },
    { vi: 'thoải mái', en: 'comfortable' },
    { vi: 'tiện dụng', en: 'convenient' },
    { vi: 'trẻ trung', en: 'youthful' },
    { vi: 'nữ tính', en: 'feminine' },
    { vi: 'sang trọng', en: 'luxurious' },
    { vi: 'hiện đại', en: 'modern' },
    { vi: 'tôn dáng', en: 'flattering' },
    { vi: 'dễ phối đồ', en: 'easy to mix and match' },

    // ===== Product type keywords =====
    { vi: 'áo hoodie', en: 'hoodie' },
    { vi: 'áo khoác gió', en: 'windbreaker' },
    { vi: 'áo khoác da', en: 'leather jacket' },
    { vi: 'áo khoác', en: 'jacket' },
    { vi: 'áo thun', en: 't-shirt' },
    { vi: 'quần thể thao', en: 'sports pants' },
    { vi: 'quần legging', en: 'leggings' },
    { vi: 'quần cargo', en: 'cargo pants' },
    { vi: 'quần kaki', en: 'chinos' },
    { vi: 'quần jean', en: 'jeans' },
    { vi: 'váy midi', en: 'midi dress' },
    { vi: 'váy lụa', en: 'silk dress' },
    { vi: 'váy', en: 'dress' },
    { vi: 'quần', en: 'pants' },
    { vi: 'áo', en: 'shirt' },

    // ===== Care & quality =====
    { vi: 'không xù lông', en: 'anti-pilling' },
    { vi: 'chống nhăn', en: 'wrinkle-resistant' },
    { vi: 'chống co rút', en: 'pre-shrunk' },
    { vi: 'kháng khuẩn', en: 'antibacterial' },
    { vi: 'nhanh khô', en: 'quick-dry' },
    { vi: 'slim fit', en: 'slim fit' },
    { vi: 'regular fit', en: 'regular fit' },
    { vi: 'wide leg', en: 'wide leg' },
    { vi: 'không tẩy', en: 'do not bleach' },
    { vi: 'không sấy', en: 'do not tumble dry' },
    { vi: 'không ủi', en: 'do not iron' },
    { vi: 'giặt tay', en: 'hand wash' },
    { vi: 'giặt máy', en: 'machine wash' },
    { vi: 'nước lạnh', en: 'cold water' },
    { vi: 'nước ấm', en: 'warm water' },
    { vi: 'cho mọi lứa tuổi', en: 'for all ages' },
    { vi: 'nhập khẩu', en: 'imported' },
    { vi: 'chính hãng', en: 'authentic' },
    { vi: 'bộ sưu tập', en: 'collection' },
    { vi: 'độc quyền', en: 'exclusive' },
    { vi: 'phơi khô', en: 'hang dry' },
    { vi: 'cao cấp', en: 'premium' },
    { vi: 'mềm mại', en: 'soft' },
    { vi: 'siêu mềm', en: 'ultra soft' },
    { vi: 'thoáng mát', en: 'breathable' },
    { vi: 'thoáng khí', en: 'breathable' },
    { vi: 'co giãn 4 chiều', en: '4-way stretch' },
    { vi: 'co giãn', en: 'stretchy' },
    { vi: 'bền bỉ', en: 'durable' },
    { vi: 'cho nữ', en: 'for women' },
    { vi: 'cho nam', en: 'for men' },
    { vi: 'voan', en: 'chiffon' },
    { vi: 'chất', en: 'material' },

    { vi: 'cotton', en: 'cotton' },
    { vi: 'polyester', en: 'polyester' },
    { vi: 'lụa', en: 'silk' },
    { vi: 'len', en: 'wool' },
    { vi: 'nylon', en: 'nylon' },
    { vi: 'spandex', en: 'spandex' },
    { vi: 'linen', en: 'linen' },
    { vi: 'da thật', en: 'genuine leather' },
    { vi: 'da bò', en: 'cowhide leather' },
    { vi: 'da cừu', en: 'sheepskin' },
    { vi: 'da', en: 'leather' },
    { vi: 'suede', en: 'suede' },

    { vi: 'đen', en: 'black' },
    { vi: 'trắng', en: 'white' },
    { vi: 'xám', en: 'gray' },
    { vi: 'xanh dương', en: 'blue' },
    { vi: 'xanh lá', en: 'green' },
    { vi: 'xanh than', en: 'navy' },
    { vi: 'xanh', en: 'blue' },
    { vi: 'đỏ', en: 'red' },
    { vi: 'vàng', en: 'yellow' },
    { vi: 'hồng', en: 'pink' },
    { vi: 'hồng pastel', en: 'pastel pink' },
    { vi: 'tím', en: 'purple' },
    { vi: 'cam', en: 'orange' },
    { vi: 'nâu', en: 'brown' },
    { vi: 'be', en: 'beige' },
    { vi: 'beige', en: 'beige' },
    { vi: 'navy', en: 'navy' },
    { vi: 'kem', en: 'cream' },
    { vi: 'tự nhiên', en: 'natural' },

    { vi: 'oversized', en: 'oversized' },
    { vi: 'fitted', en: 'fitted' },
    { vi: 'relaxed', en: 'relaxed' },
    { vi: 'skinny', en: 'skinny' },
    { vi: 'straight', en: 'straight' },
    { vi: 'bootcut', en: 'bootcut' },
    { vi: 'flare', en: 'flare' },
    { vi: 'regular', en: 'regular' },
    { vi: 'slim', en: 'slim' },
    { vi: 'loose', en: 'loose' },

    { vi: 'thoáng khí', en: 'breathable' },
    { vi: 'co giãn', en: 'stretchy' },
    { vi: 'mềm mại', en: 'soft' },
    { vi: 'bền', en: 'durable' },
    { vi: 'siêu bền', en: 'highly durable' },
    { vi: 'chống thấm', en: 'water-resistant' },
    { vi: 'chống nắng', en: 'UV protection' },
    { vi: 'giữ ấm', en: 'warm' },
    { vi: 'giữ nhiệt', en: 'heat-retaining' },

    { vi: 'thương hiệu', en: 'brand' },
    { vi: 'giới hạn', en: 'limited' },
    { vi: 'phiên bản giới hạn', en: 'limited edition' },
    { vi: 'mùa', en: 'season' },
    { vi: 'xu hướng', en: 'trend' },
    { vi: 'thời trang', en: 'fashion' },
    { vi: 'phong cách', en: 'style' },

    { vi: 'hoàn hảo', en: 'perfect' },
    { vi: 'hoàn hảo cho', en: 'perfect for' },
    { vi: 'tuyệt vời', en: 'amazing' },
    { vi: 'đẹp', en: 'beautiful' },
    { vi: 'sang trọng', en: 'elegant' },
    { vi: 'tinh tế', en: 'sophisticated' },
    { vi: 'đơn giản', en: 'simple' },
    { vi: 'hiện đại', en: 'modern' },
    { vi: 'cổ điển', en: 'classic' },
    { vi: 'trẻ trung', en: 'youthful' },
    { vi: 'thanh lịch', en: 'refined' },
    { vi: 'duyên dáng', en: 'graceful' },
    { vi: 'nữ tính', en: 'feminine' },
    { vi: 'nam tính', en: 'masculine' },
    { vi: 'unisex', en: 'unisex' },
    { vi: 'phù hợp', en: 'suitable' },
    { vi: 'thích hợp', en: 'appropriate' },
    { vi: 'kích thước', en: 'size' },
    { vi: 'vừa vặn', en: 'fit' },
    { vi: 'thoải mái', en: 'comfortable' },
    { vi: 'lý tưởng', en: 'ideal' },
    { vi: 'giá trị', en: 'value' },
    { vi: 'đáng giá', en: 'worth' },
    { vi: 'chất lượng', en: 'quality' },
    { vi: 'tốt', en: 'good' },
    { vi: 'xuất sắc', en: 'excellent' },
    { vi: 'khuyên dùng', en: 'recommended' },
    { vi: 'phổ biến', en: 'popular' },
    { vi: 'ưa chuộng', en: 'favorite' },
    { vi: 'thiết kế', en: 'design' },
    { vi: 'đường may', en: 'stitching' },
    { vi: 'đường nét', en: 'lines' },
    { vi: 'chi tiết', en: 'detail' },

    { vi: 'mặc hằng ngày', en: 'everyday wear' },
    { vi: 'mặc đi chơi', en: 'casual outings' },
    { vi: 'mặc đi làm', en: 'office wear' },
    { vi: 'mặc dạo phố', en: 'streetwear' },
    { vi: 'mặc ở nhà', en: 'loungewear' },
    { vi: 'đi biển', en: 'beach' },
    { vi: 'đi tiệc', en: 'party' },
    { vi: 'dự sự kiện', en: 'events' },

    { vi: 'giặt', en: 'wash' },
    { vi: 'không', en: 'no' },
    { vi: 'phơi', en: 'hang dry' },
    { vi: 'ủi', en: 'iron' },
    { vi: 'nhiệt độ', en: 'temperature' },
    { vi: 'thấp', en: 'low' },
    { vi: 'cao', en: 'high' },
    { vi: 'thường', en: 'normal' }
  ];

  for (const item of translations) {
    const escaped = item.vi.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}([^\\p{L}\\p{N}]|$)`, 'giu');
    translated = translated.replace(regex, (match, before, after) => `${before}${item.en}${after}`);
  }

  return translated;
};

export const translateOrderStatus = (status, lang) => {
  if (!status) return '';
  if (lang === 'vi') {
    const map = {
      'pending': 'Chờ xác nhận',
      'confirmed': 'Đã xác nhận',
      'shipping': 'Đang giao hàng',
      'delivered': 'Đã giao hàng',
      'cancelled': 'Đã hủy'
    };
    return map[status.toLowerCase()] || status;
  } else {
    const map = {
      'pending': 'Pending',
      'confirmed': 'Confirmed',
      'shipping': 'Shipping',
      'delivered': 'Delivered',
      'cancelled': 'Cancelled'
    };
    return map[status.toLowerCase()] || status;
  }
};
