# 🛍️ Shop Quần Áo - Aura K

> Hệ thống thương mại điện tử thời trang hiện đại, xây dựng với React, Node.js, PostgreSQL

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)
[![Database](https://img.shields.io/badge/Database-PostgreSQL-blue)](https://neon.tech)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 📋 MỤC LỤC

- [Tính năng](#-tính-năng)
- [Tech Stack](#-tech-stack)
- [Cài đặt](#-cài-đặt)
- [Deploy](#-deploy)
- [Tạo lại dữ liệu](#-tạo-lại-dữ-liệu)
- [Cấu trúc dự án](#-cấu-trúc-dự-án)
- [API Documentation](#-api-documentation)
- [Screenshots](#-screenshots)
- [Contributing](#-contributing)

---

## ✨ TÍNH NĂNG

### 👥 Khách hàng
- ✅ Đăng ký / Đăng nhập (Email, Google, Facebook)
- ✅ Xem danh sách sản phẩm với filter & search
- ✅ Chi tiết sản phẩm với variants (size, color)
- ✅ Giỏ hàng thông minh
- ✅ Thanh toán VNPay
- ✅ Quản lý đơn hàng
- ✅ Quản lý địa chỉ giao hàng
- ✅ Sử dụng mã giảm giá / voucher
- ✅ Đánh giá & review sản phẩm
- ✅ Hệ thống rank khách hàng (Bronze, Silver, Gold, Platinum)

### 👨‍💼 Admin
- ✅ Dashboard với thống kê doanh thu
- ✅ Quản lý sản phẩm (CRUD)
- ✅ Quản lý danh mục
- ✅ Quản lý đơn hàng
- ✅ Quản lý khách hàng
- ✅ Quản lý voucher
- ✅ Quản lý kho (inventory)
- ✅ Báo cáo & Analytics
- ✅ Cấu hình website

### 🔒 Bảo mật
- ✅ JWT Authentication
- ✅ Bcrypt password hashing
- ✅ Rate limiting
- ✅ Helmet security headers
- ✅ SQL injection prevention (Sequelize ORM)
- ✅ XSS protection

---

## 🛠️ TECH STACK

### Frontend
- **React 18** - UI Library
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **React Router v7** - Routing
- **Axios** - HTTP client
- **React Hot Toast** - Notifications
- **Recharts** - Analytics charts

### Backend
- **Node.js** - Runtime
- **Express 5** - Web framework
- **PostgreSQL** - Database
- **Sequelize** - ORM
- **JWT** - Authentication
- **Bcrypt** - Password hashing
- **Multer** - File upload
- **Nodemailer** - Email service
- **VNPay** - Payment gateway

### DevOps
- **Vercel** - Hosting
- **Neon** - PostgreSQL hosting
- **GitHub** - Version control
- **GitHub Actions** - CI/CD (optional)

---

## 🚀 CÀI ĐẶT

### Yêu cầu
- Node.js >= 20.x
- PostgreSQL >= 14
- npm hoặc yarn

### 1. Clone repository

```bash
git clone https://github.com/BaoPhongk21/Shop-Quan-Ao.git
cd Shop-Quan-Ao
```

### 2. Cài đặt dependencies

```bash
# Root dependencies
npm install

# Client dependencies
cd client
npm install

# Server dependencies
cd ../server
npm install
```

### 3. Cấu hình environment variables

```bash
# Copy file mẫu
cp .env.example .env

# Chỉnh sửa .env với thông tin của bạn
```

**File `.env` cần có:**
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/shopquanao

# JWT
JWT_SECRET=your_super_secret_key_min_32_chars

# Server
PORT=5000
NODE_ENV=development

# URLs
BACKEND_URL=http://localhost:5000
FRONTEND_URL=http://localhost:5173

# Email (optional)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your_app_password

# VNPay (optional)
VNP_TMN_CODE=your_code
VNP_HASH_SECRET=your_secret

# Gemini AI (optional)
GEMINI_API_KEY=your_api_key
```

### 4. Tạo database và seed data

```bash
cd server
npm run reset-and-seed
```

### 5. Chạy development server

```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd client
npm run dev
```

**Truy cập:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000
- Health check: http://localhost:5000/health

---

## 🌐 DEPLOY

### Hướng dẫn deploy lên Vercel + Neon

Xem chi tiết tại:
- **[QUICK_START.md](QUICK_START.md)** - Hướng dẫn nhanh 15 phút
- **[HUONG_DAN_DEPLOY.md](HUONG_DAN_DEPLOY.md)** - Hướng dẫn chi tiết
- **[POST_DEPLOY.md](POST_DEPLOY.md)** - Các bước sau khi deploy
- **[COMMON_ISSUES.md](COMMON_ISSUES.md)** - Xử lý lỗi thường gặp

### Tóm tắt

```bash
# 1. Kiểm tra cấu hình
node check-deploy.js

# 2. Push lên GitHub
git add .
git commit -m "Ready for deployment"
git push origin main

# 3. Deploy trên Vercel
# - Truy cập https://vercel.com
# - Import project từ GitHub
# - Thêm environment variables
# - Deploy!
```

---

## 🔄 TẠO LẠI DỮ LIỆU

Xem hướng dẫn chi tiết: **[HUONG_DAN_TAO_LAI_DU_LIEU.md](HUONG_DAN_TAO_LAI_DU_LIEU.md)**

### Nhanh

```bash
cd server
npm run reset-and-seed
```

### Dữ liệu mẫu bao gồm:
- 👥 2 Users (1 admin, 1 customer)
- 📁 4 Categories
- 🛍️ 15+ Products (Nike, Adidas, Gucci, Zara, H&M, Uniqlo)
- 📏 5 Sizes
- 🎨 7 Colors
- 🎫 4 Coupons
- ⚙️ Settings

**Tài khoản mẫu:**
- Email mẫu được tạo bởi seed script.
- Mật khẩu lấy từ biến môi trường `SEED_DEFAULT_PASSWORD`; không dùng mật khẩu mặc định trong production.

---

## 📁 CẤU TRÚC DỰ ÁN

```
Shop-Quan-Ao/
├── client/                 # Frontend React
│   ├── public/
│   │   └── images/         # Static images
│   ├── src/
│   │   ├── api/            # API clients
│   │   ├── components/     # Reusable components
│   │   ├── context/        # Context providers
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom hooks
│   │   └── config/         # Configuration
│   ├── .env                # Client env (local)
│   ├── .env.production     # Client env (production)
│   └── package.json
│
├── server/                 # Backend Express
│   ├── src/
│   │   ├── config/         # Database, app config
│   │   ├── controllers/    # Route controllers
│   │   ├── middlewares/    # Express middlewares
│   │   ├── models/         # Sequelize models
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── utils/          # Helper functions
│   │   └── uploads/        # Uploaded files
│   ├── migrations/         # Database migrations
│   ├── reset-database.js   # Reset DB script
│   ├── seed-data.js        # Seed data script
│   └── package.json
│
├── api/
│   └── index.js            # Vercel serverless entry
│
├── vercel.json             # Vercel configuration
├── .env                    # Root env variables
├── .env.example            # Env template
├── package.json            # Root scripts
└── README.md               # This file
```

---

## 📚 API DOCUMENTATION

### Base URL
- **Local**: `http://localhost:5000/api/v1`
- **Production**: `https://your-domain.vercel.app/api/v1`

### Endpoints

#### Authentication
```http
POST   /auth/register       # Đăng ký
POST   /auth/login          # Đăng nhập
POST   /auth/google         # Đăng nhập Google
POST   /auth/facebook       # Đăng nhập Facebook
GET    /auth/profile        # Lấy thông tin user (require auth)
PUT    /auth/profile        # Cập nhật profile (require auth)
```

#### Products
```http
GET    /products            # Danh sách sản phẩm (có filter, search, pagination)
GET    /products/:slug      # Chi tiết sản phẩm
POST   /products            # Tạo sản phẩm (admin only)
PUT    /products/:id        # Cập nhật sản phẩm (admin only)
DELETE /products/:id        # Xóa sản phẩm (admin only)
```

#### Categories
```http
GET    /categories          # Danh sách danh mục
POST   /categories          # Tạo danh mục (admin only)
PUT    /categories/:id      # Cập nhật danh mục (admin only)
DELETE /categories/:id      # Xóa danh mục (admin only)
```

#### Cart
```http
GET    /cart                # Lấy giỏ hàng (require auth)
POST   /cart                # Thêm vào giỏ (require auth)
PUT    /cart/:itemId        # Cập nhật số lượng (require auth)
DELETE /cart/:itemId        # Xóa khỏi giỏ (require auth)
```

#### Orders
```http
GET    /orders              # Danh sách đơn hàng (require auth)
GET    /orders/:id          # Chi tiết đơn hàng (require auth)
POST   /orders              # Tạo đơn hàng (require auth)
PUT    /orders/:id/status   # Cập nhật trạng thái (admin only)
```

#### Admin
```http
GET    /admin/dashboard     # Dashboard statistics (admin only)
GET    /admin/customers     # Danh sách khách hàng (admin only)
GET    /admin/vouchers      # Quản lý voucher (admin only)
```

### Authentication
API sử dụng JWT Bearer token:

```http
Authorization: Bearer <your_jwt_token>
```

---

## 📸 SCREENSHOTS

### Trang chủ
![Homepage](docs/screenshots/homepage.png)

### Sản phẩm
![Products](docs/screenshots/products.png)

### Giỏ hàng
![Cart](docs/screenshots/cart.png)

### Admin Dashboard
![Admin](docs/screenshots/admin-dashboard.png)

---

## 🤝 CONTRIBUTING

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

---

## 📝 LICENSE

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

---

## 👨‍💻 AUTHOR

**Bảo Phong**
- GitHub: [@BaoPhongk21](https://github.com/BaoPhongk21)
- Email: contact@example.com

---

## 🙏 ACKNOWLEDGMENTS

- [React](https://react.dev/)
- [Vercel](https://vercel.com/)
- [Neon](https://neon.tech/)
- [TailwindCSS](https://tailwindcss.com/)
- [Express](https://expressjs.com/)

---

## 📞 SUPPORT

Nếu gặp vấn đề, vui lòng:
1. Xem [COMMON_ISSUES.md](COMMON_ISSUES.md)
2. Tạo [Issue](https://github.com/BaoPhongk21/Shop-Quan-Ao/issues) trên GitHub
3. Liên hệ qua email

---

**⭐ Nếu project hữu ích, hãy cho 1 star nhé! ⭐**
