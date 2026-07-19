import React, { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Home from './pages/Home/Home';
import Products from './pages/Products/Products';
import Contact from './pages/Contact/Contact';
import Brand from './pages/Brand/Brands';
import Offers from "./pages/Offer/Offers";
import ProductDetail from './pages/ProductDetail/ProductDetail';
import Cart from './pages/Cart/Cart';
import Checkout from './pages/Checkout/Checkout';
import OrderSuccess from './pages/Checkout/OrderSuccess'; // Thêm trang success
import Login from './pages/Login/Login';
import OrderHistory from './pages/Account/OrderHistory'; // Import OrderHistory
import OrderDetail from './pages/Account/OrderDetail'; // Import OrderDetail
import Register from './pages/Register/Register';
import Account from './pages/Account/Account';
import Addresses from './pages/Account/Addresses'; // Import Addresses
import Header from './components/Header';
import Navbar from './components/Navbar'; // Thêm Navbar dành cho Mobile
import PrivateRoute from './components/PrivateRoute';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { SettingsProvider } from './components/SettingsContext';
import Vouchers from './pages/Account/Vouchers';
import AdminRoute from './components/AdminRoute';
import { API_BASE_URL } from './config/api.config';
import GlobalSocketListener from './components/GlobalSocketListener';
import AdminDashboard from './pages/Admin/AdminDashboard';
import AdminProducts from './pages/Admin/AdminProducts';
import AdminOrders from './pages/Admin/AdminOrders';
import AdminCustomers from './pages/Admin/AdminCustomers';
import AdminAnalytics from './pages/Admin/AdminAnalytics';
import AdminVouchers from './pages/Admin/AdminVouchers';
import AdminSettings from './pages/Admin/AdminSettings';
import AdminHelp from './pages/Admin/AdminHelp';
import AdminInventory from './pages/Admin/AdminInventory';
import AdminCategories from './pages/Admin/AdminCategories';


function App() {
  // Lấy mã từ file .env
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  // Tự động tải và áp dụng màu chủ đạo (primaryColor) cho toàn bộ trang web
  useEffect(() => {
    const applyThemeConfig = async () => {
      try {
        // SỬA LỖI: Gọi vào endpoint public thay vì admin để tránh lỗi 401 khi chưa đăng nhập
        const res = await fetch(`${API_BASE_URL || ''}/api/v1/settings`);

        // Bỏ qua lỗi 401/403 từ API settings — đây là route public nhưng server
        // chưa cấu hình hoặc chưa khởi động. Không cần log warning gây nhầm lẫn.
        if (res.status === 401 || res.status === 403) {
          // Không làm gì — fetch interceptor đã được cấu hình để bỏ qua 401
          // từ các request không có Authorization header.
          return;
        }

        if (res.ok) {
          const result = await res.json();
          if (result.success && result.data) {
            if (result.data.logoUrl) {
              localStorage.setItem('storeLogo', result.data.logoUrl);
            }
          }
        }
        // Trường hợp lỗi khác (500, 404...) — server chưa sẵn sàng, bỏ qua
      } catch (error) {
        // Server chưa khởi động hoặc mất kết nối — bỏ qua lỗi này một cách im lặng
      }
    };
    applyThemeConfig();
  }, []);

  return (
    <LanguageProvider>
      <AuthProvider>
        <GlobalSocketListener />
        <SettingsProvider>
          <GoogleOAuthProvider clientId={googleClientId}>
            <CartProvider>
              {/* Ẩn Header ở trang Admin */}
              {!isAdminRoute && <Header />}
              <div className={isAdminRoute ? "" : "main-content flex-grow"}>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/products" element={<Products />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/brand" element={<Brand />} />
                  <Route path="/offers" element={<Offers />} />
                  <Route path="/product/:id" element={<ProductDetail />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route element={<PrivateRoute />}>
                    <Route path="/checkout" element={<Checkout />} />
                    <Route path="/order-success" element={<OrderSuccess />} />
                    <Route path="/orders" element={<OrderHistory />} /> {/* Thêm route xử lý nút Xem đơn hàng */}
                    <Route path="/orders/:id" element={<OrderDetail />} />
                    <Route path="/account" element={<Account />} />
                    <Route path="/addresses" element={<Addresses />} />
                    <Route path="/vouchers" element={<Vouchers />} />
                  </Route>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />

                  {/* Khu vực route dành cho Admin */}
                  <Route element={<AdminRoute />}>
                    <Route path="/admin" element={<AdminDashboard />} />
                    <Route path="/admin/products" element={<AdminProducts />} />
                    <Route path="/admin/categories" element={<AdminCategories />} />
                    <Route path="/admin/orders" element={<AdminOrders />} />
                    <Route path="/admin/customers" element={<AdminCustomers />} />
                    <Route path="/admin/analytics" element={<AdminAnalytics />} />
                    <Route path="/admin/vouchers" element={<AdminVouchers />} />
                    <Route path="/admin/settings" element={<AdminSettings />} />
                    <Route path="/admin/help" element={<AdminHelp />} />
                    <Route path="/admin/inventory" element={<AdminInventory />} />
                  </Route>
                </Routes>

              </div>
            </CartProvider>
          </GoogleOAuthProvider>
        </SettingsProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;