import React, { useState, useEffect, useRef, useContext } from 'react';
import { Link } from 'react-router-dom';
import { CartContext } from '../context/CartContext';
import { AuthContext } from '../context/AuthContext';
import { getImageUrl, API_BASE_URL } from '../pages/Register/api.config';
import { useSettings } from './SettingsContext';
import { formatPrice } from '../utils/formatPrice';

const Navbar = () => {
  // State quản lý việc đóng/mở menu trên Mobile
  const [isOpen, setIsOpen] = useState(false);

  // State cho tính năng Live Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchRef = useRef(null);

  // Tích hợp Context từ dự án để đếm số sản phẩm trong giỏ
  const { totalQuantity } = useContext(CartContext);

  // Sử dụng settings từ Context toàn cục
  const { settings } = useSettings();

  // Lấy thông tin user đăng nhập
  const authContext = useContext(AuthContext);
  const user = authContext?.user;

  // Đóng dropdown tìm kiếm khi click ra ngoài (Dành cho Desktop)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Kỹ thuật Debounce: Gọi API tìm kiếm sau khi người dùng ngừng gõ 300ms
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim().length > 0) {
        setIsSearching(true);
        try {
          const apiUrl = API_BASE_URL || '';
          const response = await fetch(`${apiUrl}/api/v1/products`);
          const data = await response.json();
          if (data.success && data.data) {
            const filtered = data.data
              .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
              .slice(0, 5);
            setSearchResults(filtered);
          }
        } catch (error) {
          console.error("Lỗi tìm kiếm:", error);
        } finally {
          setIsSearching(false);
          setShowSearchDropdown(true);
        }
      } else {
        setSearchResults([]);
        setShowSearchDropdown(false);
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  return (
    <nav className="bg-gray-900 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">

          {/* 1. Logo (Luôn hiển thị trên mọi thiết bị) */}
          <div className="flex-shrink-0 font-bold text-xl flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2">
              <span>{settings?.name || "Aura K Shop"}</span>
            </Link>
          </div>

          {/* 2. Menu Desktop (Ẩn trên điện thoại 'hidden', Hiện trên Tablet/PC 'md:flex') */}
          <div className="hidden md:flex space-x-6 items-center flex-1 justify-end ml-4">
            <Link to="/" className="hover:text-blue-400 transition-colors shrink-0">Trang chủ</Link>
            <Link to="/products" className="hover:text-blue-400 transition-colors shrink-0">Sản phẩm</Link>
            <Link to="/offers" className="hover:text-blue-400 transition-colors shrink-0">Khuyến mãi</Link>

            {/* Thanh tìm kiếm Desktop */}
            <div className="relative hidden lg:block flex-1 max-w-xs mx-4" ref={searchRef}>
              <div className="relative group">
                <input
                  type="text"
                  placeholder="Tìm kiếm sản phẩm..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery.trim() && setShowSearchDropdown(true)}
                  className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-full py-1.5 pl-9 pr-8 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
                <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>

                {isSearching && (
                  <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-blue-400 animate-spin text-lg">progress_activity</span>
                )}
                {searchQuery && !isSearching && (
                  <button
                    onClick={() => { setSearchQuery(''); setShowSearchDropdown(false); }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-400 transition-colors flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                )}
              </div>

              {/* Dropdown Kết quả tìm kiếm (Desktop) */}
              {showSearchDropdown && (
                <div className="absolute top-full mt-2 w-full bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50 text-black">
                  {searchResults.length > 0 ? (
                    <div className="flex flex-col">
                      {searchResults.map(product => {
                        const displayImage = getImageUrl(product.imageUrl || product.image || product.image_url) || "https://via.placeholder.com/50";
                        return (
                          <Link
                            key={product.id}
                            to={`/product/${product.id}`}
                            onClick={() => { setShowSearchDropdown(false); setSearchQuery(''); }}
                            className="flex items-center gap-3 p-3 hover:bg-gray-100 transition-colors border-b border-gray-100 last:border-0"
                          >
                            <img src={displayImage} alt={product.name} className="w-10 h-10 object-cover rounded-md border border-gray-200" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-gray-800 truncate">{product.name}</p>
                              <p className="text-xs text-blue-600 font-semibold mt-0.5">{Number(product.price).toLocaleString('vi-VN')}đ</p>
                            </div>
                          </Link>
                        );
                      })}
                      <Link
                        to="/products"
                        onClick={() => { setShowSearchDropdown(false); setSearchQuery(''); }}
                        className="p-2 text-center text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors block"
                      >
                        Xem tất cả sản phẩm
                      </Link>
                    </div>
                  ) : (
                    <div className="p-4 text-center text-sm text-gray-500 flex flex-col items-center">
                      <span className="material-symbols-outlined text-2xl opacity-40 mb-1">search_off</span>
                      Không tìm thấy "{searchQuery}"
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Icon Giỏ hàng Desktop */}
            <Link to="/cart" className="relative p-2 hover:bg-gray-800 rounded-full transition-colors">
              <span className="material-symbols-outlined">shopping_cart</span>
              {totalQuantity > 0 && (
                <span className="absolute top-0 right-0 inline-flex min-w-[18px] h-[18px] items-center justify-center px-1.5 text-[10px] font-black leading-none text-[#0a0e27] transform translate-x-1/4 -translate-y-1/4 bg-[#d4af37] rounded-full shadow-[0_0_10px_rgba(212,175,55,0.25)] ring-2 ring-gray-900">
                  {totalQuantity > 99 ? '99+' : totalQuantity}
                </span>
              )}
            </Link>

            {/* Trạng thái Đăng nhập Desktop */}
            {user ? (
              <div className="flex items-center gap-2 text-sm bg-gray-800 px-3 py-1.5 rounded-full cursor-pointer hover:bg-gray-700 transition">
                <img src={user.avatar_url || 'https://via.placeholder.com/40'} alt="avatar" className="w-7 h-7 rounded-full object-cover" />
                <span className="font-medium">{user.first_name}</span>
              </div>
            ) : (
              <Link to="/login" className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm font-semibold transition-colors">
                Đăng nhập
              </Link>
            )}
          </div>

          {/* 3. Khu vực công cụ Mobile (Hiện trên điện thoại 'flex', Ẩn trên PC 'md:hidden') */}
          <div className="md:hidden flex items-center gap-4">

            {/* Icon Giỏ hàng Mobile (Đặt bên ngoài để khách không cần mở menu vẫn thấy) */}
            <Link to="/cart" className="relative p-1">
              <span className="material-symbols-outlined">shopping_cart</span>
              {totalQuantity > 0 && (
                <span className="absolute top-0 right-0 inline-flex min-w-[18px] h-[18px] items-center justify-center px-1.5 text-[10px] font-black leading-none text-[#0a0e27] transform translate-x-1/4 -translate-y-1/4 bg-[#d4af37] rounded-full shadow-[0_0_10px_rgba(212,175,55,0.25)] ring-2 ring-gray-900">
                  {totalQuantity > 99 ? '99+' : totalQuantity}
                </span>
              )}
            </Link>

            {/* Nút Hamburger bật/tắt Menu */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="outline-none focus:outline-none p-1"
            >
              <span className="material-symbols-outlined text-2xl">
                {isOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>

        </div>
      </div>

      {/* 4. Menu thả xuống trên Mobile (Chỉ xuất hiện khi isOpen = true) */}
      {/* Class 'md:hidden' đảm bảo nếu lỡ kéo rộng màn hình máy tính thì menu dọc này cũng tự biến mất */}
      {isOpen && (
        <div className="md:hidden bg-gray-800 border-t border-gray-700 pb-4 shadow-xl">

          {/* Thanh tìm kiếm Mobile */}
          <div className="px-4 pt-4 pb-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Tìm kiếm sản phẩm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg py-2 pl-10 pr-4 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>

              {isSearching && (
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 animate-spin text-lg">progress_activity</span>
              )}
            </div>

            {/* Hiển thị kết quả tìm kiếm ngay trong menu Mobile */}
            {searchQuery.trim().length > 0 && (
              <div className="mt-2 bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
                {searchResults.length > 0 ? (
                  <div className="flex flex-col">
                    {searchResults.map(product => {
                      const displayImage = getImageUrl(product.imageUrl || product.image || product.image_url) || "https://via.placeholder.com/50";
                      return (
                        <Link
                          key={product.id}
                          to={`/product/${product.id}`}
                          onClick={() => { setIsOpen(false); setSearchQuery(''); }}
                          className="flex items-center gap-3 p-2 hover:bg-gray-800 transition-colors border-b border-gray-700 last:border-0"
                        >
                          <img src={displayImage} alt={product.name} className="w-10 h-10 object-cover rounded-md border border-gray-600" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white truncate">{product.name}</p>
                            <p className="text-xs text-blue-400 font-semibold mt-0.5">{Number(product.price).toLocaleString('vi-VN')}đ</p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3 text-center text-sm text-gray-400">
                    Không tìm thấy "{searchQuery}"
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col space-y-1 px-4 pt-2">

            <Link to="/" className="block hover:bg-gray-700 px-3 py-3 rounded transition-colors" onClick={() => setIsOpen(false)}>Trang chủ</Link>
            <Link to="/products" className="block hover:bg-gray-700 px-3 py-3 rounded transition-colors" onClick={() => setIsOpen(false)}>Sản phẩm</Link>
            <Link to="/offers" className="block hover:bg-gray-700 px-3 py-3 rounded transition-colors" onClick={() => setIsOpen(false)}>Khuyến mãi</Link>

            {!user && (
              <Link to="/login" className="block text-center mt-4 bg-blue-600 hover:bg-blue-700 px-3 py-3 rounded font-semibold transition-colors" onClick={() => setIsOpen(false)}>
                Đăng nhập
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;