-- Migration: Thêm các cột Hero Content vào bảng settings
-- Ngày tạo: 2026-05-31
-- Mục đích: Cho phép Admin chỉnh sửa nội dung Hero Section trên trang chủ

-- Kiểm tra và thêm cột hero_title
ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS hero_title VARCHAR(255) DEFAULT '';

-- Kiểm tra và thêm cột hero_subtitle
ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS hero_subtitle VARCHAR(255) DEFAULT '';

-- Kiểm tra và thêm cột hero_description
ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS hero_description TEXT DEFAULT '';

-- Kiểm tra và thêm cột hero_button_text
ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS hero_button_text VARCHAR(100) DEFAULT '';

-- Cập nhật giá trị mặc định nếu chưa có
UPDATE settings 
SET 
    hero_title = COALESCE(NULLIF(hero_title, ''), 'Định nghĩa phong cách của bạn'),
    hero_subtitle = COALESCE(NULLIF(hero_subtitle, ''), 'BST MỚI 2026'),
    hero_description = COALESCE(NULLIF(hero_description, ''), 'Khám phá bộ sưu tập thời trang cao cấp với thiết kế độc đáo và chất liệu tuyệt hảo'),
    hero_button_text = COALESCE(NULLIF(hero_button_text, ''), 'Khám phá ngay')
WHERE id = 1;

-- Hiển thị kết quả
SELECT 'Migration completed successfully!' AS status;
SELECT * FROM settings LIMIT 1;
