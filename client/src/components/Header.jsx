import React, { useState, useEffect, useRef, useContext } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { getImageUrl, API_BASE_URL } from '../pages/Register/api.config';
import { CartContext } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { useSettings } from './SettingsContext';

const Header = () => {
  const { t, language, changeLanguage, formatPrice } = useLanguage();

  // State quản lý Dropdown User trên Desktop
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // State quản lý Dropdown Ngôn Ngữ trên Desktop
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const langRef = useRef(null);

  // States quản lý Thông báo
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const notifRef = useRef(null);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  // State quản lý Menu Hamburger trên Mobile
  const [isOpen, setIsOpen] = useState(false);

  // States cho tính năng Live Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchRef = useRef(null);

  // State theo dõi scroll để thêm hiệu ứng backdrop blur
  const [scrolled, setScrolled] = useState(false);

  const { user, logout } = useContext(AuthContext);
  const { totalQuantity } = useContext(CartContext);

  // Sử dụng settings từ Context toàn cục
  const { settings } = useSettings();

  // Theo dõi scroll để thêm hiệu ứng
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Gọi API lấy thông báo
  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const apiUrl = API_BASE_URL || '';
      const response = await fetch(`${apiUrl}/api/v1/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success && data.data) {
        setNotifications(data.data);
      }
    } catch (error) {
      console.error('Lỗi lấy thông báo:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // 1 phút check 1 lần
    return () => clearInterval(interval);
  }, [user]);

  const markNotifAsRead = async (id, link) => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = API_BASE_URL || '';
      await fetch(`${apiUrl}/api/v1/notifications/${id}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      if (link) window.location.href = link;
    } catch (e) { console.error(e); }
  };

  const markAllNotifAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = API_BASE_URL || '';
      await fetch(`${apiUrl}/api/v1/notifications/mark-all-read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (e) { console.error(e); }
  };

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (langRef.current && !langRef.current.contains(event.target)) {
        setIsLangDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifDropdown(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Kỹ thuật Debounce: Gọi API tìm kiếm sau khi người dùng ngừng gõ 300ms
  useEffect(() => {
    const controller = new AbortController();
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim().length > 0) {
        setIsSearching(true);
        try {
          const apiUrl = API_BASE_URL || '';
          const response = await fetch(`${apiUrl}/api/v1/products?search=${encodeURIComponent(searchQuery.trim())}&limit=5`, {
            signal: controller.signal,
          });
          const data = await response.json();
          if (data.success && data.data) {
            setSearchResults(data.data);
          }
        } catch (error) {
          if (error.name !== 'AbortError') {
            console.error('Lỗi tìm kiếm:', error);
          }
        } finally {
          setIsSearching(false);
          setShowSearchDropdown(true);
        }
      } else {
        setSearchResults([]);
        setShowSearchDropdown(false);
      }
    }, 300);

    return () => {
      clearTimeout(delayDebounceFn);
      controller.abort();
    };
  }, [searchQuery]);

  const navLinkClass = ({ isActive }) =>
    `relative font-headline text-[13px] tracking-[0.18em] uppercase transition-all duration-300 group ${isActive ? 'text-[#1a1a2e] font-bold' : 'text-gray-600 hover:text-[#1a1a2e]'}`;

  const handleLogout = () => {
    logout();
    setIsDropdownOpen(false);
  };

  // Kiểm tra hoàn toàn dựa trên role
  const userRole = user?.role ? String(user.role).toLowerCase().trim() : '';
  const isStaff = user && (userRole === 'staff' || userRole === 'nhân viên');
  const isAdmin = user && userRole === 'admin';
  const isStaffOrAdmin = isAdmin || isStaff;

  return (
    <header className={`fixed top-0 w-full z-50 transition-all duration-500 ${
      scrolled 
        ? 'bg-white/90 backdrop-blur-xl shadow-[0_4px_30px_rgba(212,175,55,0.08)] border-b border-[#d4af37]/15' 
        : 'bg-gradient-to-r from-white/95 via-[#fffbf0]/80 to-white/95 backdrop-blur-md border-b border-[#d4af37]/10'
    }`}>
      {/* Subtle gold accent line at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#d4af37]/30 to-transparent pointer-events-none"></div>
      
      <div className="flex items-center justify-between px-4 sm:px-6 md:px-8 py-2.5 sm:py-3.5 max-w-[1440px] mx-auto relative">
        {/* Logo - Enhanced Gold Theme */}
        {settings?.logoUrl ? (
          <Link to="/" className="flex items-center gap-3 group relative shrink-0">
            <div className="h-9 sm:h-11 w-auto flex items-center justify-center transition-all duration-500 group-hover:scale-105">
              <img 
                src={getImageUrl(settings.logoUrl)} 
                alt={settings?.name || "AURA.K"} 
                className="h-full w-auto object-contain max-w-[180px] drop-shadow-sm" 
                loading="lazy"
                onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
              />
            </div>
          </Link>
        ) : (
          <Link to="/" className="flex items-center gap-2.5 group relative shrink-0">
            {/* Monogram Badge - Gold Luxury */}
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#1a1a2e] to-[#2c2c4a] border-2 border-[#d4af37]/40 shadow-md transition-all duration-300 group-hover:border-[#d4af37] group-hover:shadow-[0_0_20px_rgba(212,175,55,0.45)] group-hover:scale-105">
              {/* Gold corner accents */}
              <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-[#d4af37] rounded-tl-xl opacity-80 transition-opacity duration-300 group-hover:opacity-100"></div>
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-[#d4af37] rounded-br-xl opacity-80 transition-opacity duration-300 group-hover:opacity-100"></div>
              <span className="font-headline text-base font-black text-[#d4af37] tracking-tighter z-10 select-none">
                {settings?.name ? settings.name.charAt(0).toUpperCase() : 'A'}
              </span>
            </div>
            
            {/* Brand Name & Subtitle */}
            <div className="flex flex-col leading-none">
              <span className="text-lg sm:text-xl font-headline font-bold tracking-[0.18em] text-[#1a1a2e] transition-all duration-300">
                {settings?.name || "AURA.K"}
              </span>
              {/* Gold accent underline that expands on hover */}
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="h-[1.5px] w-4 bg-gradient-to-r from-[#d4af37] to-[#e8c468] transition-all duration-300 group-hover:w-full rounded-full"></div>
                <span className="text-[7px] font-body tracking-[0.38em] text-[#d4af37] font-bold uppercase whitespace-nowrap">
                  COUTURE
                </span>
              </div>
            </div>
          </Link>
        )}

        {/* Menu ngang - Enhanced */}
        <nav className="hidden lg:flex items-center space-x-1">
          <NavLink to="/products" className={navLinkClass}>
            {({ isActive }) => (
              <div className="relative px-3.5 py-1.5 flex items-center gap-1 group">
                <span className="relative z-10 transition-colors duration-300">
                  {t('nav.products')}
                </span>
                {/* Sleek bottom gold accent line */}
                <div className={`absolute bottom-0 left-3.5 right-3.5 h-[2px] bg-gradient-to-r from-[#d4af37] to-[#e8c468] transform origin-left transition-all duration-300 ${isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`}></div>
              </div>
            )}
          </NavLink>
          <NavLink to="/brand" className={navLinkClass}>
            {({ isActive }) => (
              <div className="relative px-3.5 py-1.5 flex items-center gap-1 group">
                <span className="relative z-10 transition-colors duration-300">
                  {t('nav.brand')}
                </span>
                {/* Sleek bottom gold accent line */}
                <div className={`absolute bottom-0 left-3.5 right-3.5 h-[2px] bg-gradient-to-r from-[#d4af37] to-[#e8c468] transform origin-left transition-all duration-300 ${isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`}></div>
              </div>
            )}
          </NavLink>
          <NavLink to="/offers" className={navLinkClass}>
            {({ isActive }) => (
              <div className="relative px-3.5 py-1.5 flex items-center gap-1 group">
                <span className="relative z-10 transition-colors duration-300">
                  {t('nav.offers')}
                </span>
                {/* Sleek bottom gold accent line */}
                <div className={`absolute bottom-0 left-3.5 right-3.5 h-[2px] bg-gradient-to-r from-[#d4af37] to-[#e8c468] transform origin-left transition-all duration-300 ${isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`}></div>
              </div>
            )}
          </NavLink>
          <NavLink to="/contact" className={navLinkClass}>
            {({ isActive }) => (
              <div className="relative px-3.5 py-1.5 flex items-center gap-1 group">
                <span className="relative z-10 transition-colors duration-300">
                  {t('nav.contact')}
                </span>
                {/* Sleek bottom gold accent line */}
                <div className={`absolute bottom-0 left-3.5 right-3.5 h-[2px] bg-gradient-to-r from-[#d4af37] to-[#e8c468] transform origin-left transition-all duration-300 ${isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`}></div>
              </div>
            )}
          </NavLink>
        </nav>

        {/* Search Bar - Enhanced */}
        <div className="relative hidden lg:block flex-1 max-w-md mx-6" ref={searchRef}>
          <div className="relative group">
            {/* Background glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#d4af37]/15 to-[#e8c468]/15 rounded-full opacity-0 group-focus-within:opacity-100 transition-all duration-300 scale-105 blur-sm"></div>
            
            <input
              type="text"
              placeholder={t('nav.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.trim() && setShowSearchDropdown(true)}
              className="relative w-full bg-gradient-to-r from-gray-50 to-[#fffbf0]/50 backdrop-blur-sm border-2 border-gray-200/60 text-gray-700 text-sm rounded-full py-3 pl-12 pr-12 outline-none focus:border-[#d4af37] focus:ring-4 focus:ring-[#d4af37]/15 transition-all duration-300 shadow-sm focus:shadow-md"
            />
            
            {/* Search Icon */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300">
              <span className="material-symbols-outlined text-gray-500 text-lg group-focus-within:text-[#d4af37]">search</span>
            </div>

            {/* Loading Spinner */}
            {isSearching && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="w-5 h-5 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
            
            {/* Clear Button */}
            {searchQuery && !isSearching && (
              <button
                onClick={() => { setSearchQuery(''); setShowSearchDropdown(false); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-red-500 transition-all hover:scale-110 rounded-full hover:bg-red-50"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
          </div>

          {/* Search Results Dropdown - Enhanced */}
          {showSearchDropdown && (
            <div className="absolute top-full mt-3 w-full bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-[#d4af37]/10 border border-[#d4af37]/20 overflow-hidden z-50 animate-scale-in">
              {searchResults.length > 0 ? (
                <div className="flex flex-col max-h-80 overflow-y-auto">
                  {searchResults.map(product => {
                    const displayImage = getImageUrl(product.imageUrl || product.image || product.image_url) || "https://via.placeholder.com/50";
                    return (
                      <Link
                        key={product.id}
                        to={`/product/${product.id}`}
                        onClick={() => { setShowSearchDropdown(false); setSearchQuery(''); }}
                        className="flex items-center gap-4 p-4 hover:bg-gradient-to-r hover:from-[#fffbf0] hover:to-[#fef3d3]/50 transition-all duration-300 border-b border-gray-100 last:border-0 group"
                      >
                        <div className="relative flex-shrink-0">
                          <img src={displayImage} alt={product.name} className="w-14 h-14 object-cover rounded-xl border border-gray-200 shadow-sm group-hover:shadow-md group-hover:border-[#d4af37]/40 transition-all duration-300" loading="lazy" />
                          <div className="absolute inset-0 bg-gradient-to-br from-transparent to-[#d4af37]/10 opacity-0 group-hover:opacity-100 rounded-xl transition-opacity duration-300"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-700 truncate group-hover:text-[#1a1a2e] transition-colors">{product.name}</p>
                          <p className="text-base font-bold text-[#d4af37] mt-1">{formatPrice(product.price)}</p>
                        </div>
                        <div className="flex-shrink-0">
                          <span className="material-symbols-outlined text-gray-400 group-hover:text-[#d4af37] transition-all transform group-hover:translate-x-1">arrow_forward</span>
                        </div>
                      </Link>
                    );
                  })}
                  <Link
                    to="/products"
                    onClick={() => { setShowSearchDropdown(false); setSearchQuery(''); }}
                    className="p-4 text-center text-sm font-bold text-[#1a1a2e] bg-gradient-to-r from-[#d4af37] via-[#e8c468] to-[#d4af37] hover:brightness-105 transition-all duration-300"
                  >
                    {t('nav.searchViewAll')} →
                  </Link>
                </div>
              ) : (
                <div className="p-8 text-center text-gray-600 flex flex-col items-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#fffbf0] to-[#fef3d3] rounded-full flex items-center justify-center mb-3 border border-[#d4af37]/20">
                    <span className="material-symbols-outlined text-3xl text-[#d4af37]">search_off</span>
                  </div>
                  <p className="font-medium">{t('nav.searchNoResults', { query: searchQuery })}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side Actions - Enhanced */}
        <div className="flex items-center gap-2 sm:gap-3">

          {/* Language Selector - Gold themed */}
          <div className="relative hidden md:block" ref={langRef}>
            <button
              onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-gradient-to-r from-[#fffbf0] to-white border-2 border-[#d4af37]/30 hover:border-[#d4af37] transition-all duration-300 group hover:shadow-md hover:shadow-[#d4af37]/10"
            >
              <span className="text-xs font-bold uppercase text-[#1a1a2e] tracking-wider">{language}</span>
              <span className={`material-symbols-outlined text-sm text-[#d4af37] transition-transform duration-300 ${isLangDropdownOpen ? 'rotate-180' : ''}`}>expand_more</span>
            </button>

            {isLangDropdownOpen && (
              <div className="absolute right-0 mt-2 w-32 bg-white rounded-xl shadow-lg border border-[#d4af37]/20 overflow-hidden z-50 animate-scale-in">
                <button
                  onClick={() => { changeLanguage('vi'); setIsLangDropdownOpen(false); }}
                  className={`w-full text-center px-3 py-2 text-sm font-bold transition-all ${language === 'vi' ? 'bg-gradient-to-r from-[#1a1a2e] to-[#2c2c4a] text-[#d4af37]' : 'text-gray-700 hover:bg-[#fffbf0]'}`}
                >
                  VI
                </button>
                <button
                  onClick={() => { changeLanguage('en'); setIsLangDropdownOpen(false); }}
                  className={`w-full text-center px-3 py-2 text-sm font-bold transition-all ${language === 'en' ? 'bg-gradient-to-r from-[#1a1a2e] to-[#2c2c4a] text-[#d4af37]' : 'text-gray-700 hover:bg-[#fffbf0]'}`}
                >
                  EN
                </button>
              </div>
            )}
          </div>

          {/* Notification Button */}
          {user && (
            <div className="relative hidden sm:block" ref={notifRef}>
              <button
                onClick={() => {
                  setShowNotifDropdown(!showNotifDropdown);
                  if (!showNotifDropdown) fetchNotifications();
                }}
                className="relative p-3 rounded-xl bg-gradient-to-br from-gray-50 to-[#fffbf0]/50 hover:from-[#fffbf0] hover:to-[#fef3d3] transition-all duration-300 hover:shadow-md hover:shadow-[#d4af37]/15 border border-gray-200/60 group"
              >
                <span className="material-symbols-outlined text-gray-700 group-hover:text-[#d4af37] transition-colors">notifications</span>
                {unreadCount > 0 && (
                  <div className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-red-600 text-white font-bold text-[10px] min-w-[20px] h-5 flex items-center justify-center rounded-full shadow-lg animate-pulse px-1.5">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </div>
                )}
              </button>
              
              {showNotifDropdown && (
                <div className="absolute right-0 mt-3 w-80 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-[#d4af37]/10 py-2 z-50 border border-[#d4af37]/20 animate-scale-in flex flex-col max-h-[80vh]">
                  <div className="px-4 py-3 border-b border-gray-100/50 flex justify-between items-center bg-gradient-to-r from-[#fffbf0] to-white rounded-t-2xl">
                    <h3 className="font-bold text-[#1a1a2e]">{t('notifications.title')}</h3>
                    {unreadCount > 0 && (
                      <button onClick={markAllNotifAsRead} className="text-xs text-[#d4af37] hover:text-[#b8952e] hover:underline font-bold">
                        {t('notifications.markAllRead')}
                      </button>
                    )}
                  </div>
                  <div className="overflow-y-auto flex-1 custom-scrollbar">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-gray-500 text-sm">
                        {t('notifications.empty')}
                      </div>
                    ) : (
                      notifications.map(notif => (
                        <div 
                          key={notif.id} 
                          onClick={() => markNotifAsRead(notif.id, notif.link)}
                          className={`p-4 border-b border-gray-100 hover:bg-gradient-to-r hover:from-[#fffbf0] hover:to-transparent cursor-pointer transition-colors flex gap-3 ${!notif.is_read ? 'bg-gradient-to-r from-[#d4af37]/8 to-transparent' : ''}`}>
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${notif.type === 'order' ? 'bg-gradient-to-br from-green-100 to-green-200 text-green-600' : notif.type === 'promotion' ? 'bg-gradient-to-br from-[#fef3d3] to-[#fde4a8] text-[#d4af37]' : 'bg-gradient-to-br from-blue-100 to-blue-200 text-blue-600'}`}>
                            <span className="material-symbols-outlined text-xl">
                              {notif.type === 'order' ? 'local_shipping' : notif.type === 'promotion' ? 'sell' : 'info'}
                            </span>
                          </div>
                          <div>
                            <h4 className={`text-sm ${!notif.is_read ? 'font-bold text-[#1a1a2e]' : 'font-medium text-gray-700'}`}>{notif.title}</h4>
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.message}</p>
                            <span className="text-[10px] text-gray-400 mt-1 block">{new Date(notif.created_at).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US')}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Cart Button - Enhanced */}
          <Link to="/cart" className="relative p-3 rounded-xl bg-gradient-to-br from-gray-50 to-[#fffbf0]/50 hover:from-[#fffbf0] hover:to-[#fef3d3] transition-all duration-300 hover:shadow-md hover:shadow-[#d4af37]/15 border border-gray-200/60 group">
            <span className="material-symbols-outlined text-gray-700 group-hover:text-[#d4af37] transition-colors">shopping_bag</span>
            {totalQuantity > 0 && (
              <div className="absolute -top-2 -right-2 min-w-[22px] h-5 px-1.5 bg-gradient-to-r from-[#d4af37] to-[#e8c468] text-[#1a1a2e] font-black text-[10px] flex items-center justify-center rounded-full shadow-[0_0_12px_rgba(212,175,55,0.45)] ring-2 ring-white transition-all duration-300">
                {totalQuantity > 99 ? '99+' : totalQuantity}
              </div>
            )}
          </Link>

          {/* Admin Button - Enhanced Gold theme */}
          {isStaffOrAdmin && (
            <Link
              to="/admin"
              className="hidden md:flex items-center gap-2 bg-gradient-to-r from-[#1a1a2e] via-[#2c2c4a] to-[#1a1a2e] text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-[#d4af37]/25 transition-all duration-300 hover:-translate-y-0.5 border border-[#d4af37]/20"
            >
              <span className="material-symbols-outlined text-base text-[#d4af37]">{isAdmin ? 'shield_person' : 'receipt_long'}</span>
              <span className={isAdmin ? 'text-[#d4af37]' : ''}>{isAdmin ? t('nav.admin') : t('nav.staff')}</span>
            </Link>
          )}

          {/* User Profile - Enhanced */}
          <div className="relative hidden sm:block" ref={dropdownRef}>
            {user ? (
              <>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 p-2 rounded-xl bg-gradient-to-br from-gray-50 to-[#fffbf0]/50 hover:from-[#fffbf0] hover:to-[#fef3d3] transition-all duration-300 hover:shadow-md hover:shadow-[#d4af37]/15 border border-gray-200/60 group"
                >
                  {user?.avatar_url ? (
                    <div className="relative">
                      <img src={user.avatar_url} alt="Avatar" className="w-8 h-8 rounded-lg object-cover border-2 border-[#d4af37]/30 shadow-sm group-hover:border-[#d4af37] transition-all" referrerPolicy="no-referrer" loading="lazy" />
                      <div className="absolute inset-0 rounded-lg ring-2 ring-[#d4af37]/0 group-hover:ring-[#d4af37]/40 transition-all"></div>
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1a1a2e] to-[#d4af37] flex items-center justify-center shadow-sm">
                      <span className="material-symbols-outlined text-white text-lg">person</span>
                    </div>
                  )}
                  <span className="material-symbols-outlined text-gray-500 group-hover:text-[#d4af37] transition-colors text-sm">keyboard_arrow_down</span>
                </button>
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-3 w-72 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl py-2 z-50 border border-gray-200/50 animate-scale-in">
                    {/* User Info Header */}
                    <div className="px-5 py-4 border-b border-gray-100/50">
                      <div className="flex items-center gap-3">
                        {user?.avatar_url ? (
                          <img src={user.avatar_url} alt="Avatar" className="w-12 h-12 rounded-xl object-cover border-2 border-gray-200/50 shadow-sm" referrerPolicy="no-referrer" loading="lazy" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-sm">
                            <span className="material-symbols-outlined text-white text-xl">person</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-700 truncate">{t('nav.welcome', { name: user.name || user.username })}</p>
                          <p className="text-xs text-gray-400 truncate mt-0.5">{user.email}</p>
                        </div>
                      </div>
                      
                      {/* Role Badge */}
                      <div className="mt-3">
                        {isAdmin && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-[#1a1a2e] via-[#2c2c4a] to-[#1a1a2e] text-[#d4af37] rounded-full text-xs font-bold shadow-sm border border-[#d4af37]/30">
                            <span className="material-symbols-outlined text-sm">shield_person</span>
                            {t('nav.admin')}
                          </div>
                        )}
                        {!isAdmin && isStaffOrAdmin && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-[#d4af37] to-[#e8c468] text-[#1a1a2e] rounded-full text-xs font-bold shadow-sm">
                            <span className="material-symbols-outlined text-sm">badge</span>
                            {t('nav.staff')}
                          </div>
                        )}
                        {!isStaffOrAdmin && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-[#fffbf0] to-[#fef3d3] text-[#1a1a2e] rounded-full text-xs font-bold border border-[#d4af37]/30">
                            <span className="material-symbols-outlined text-sm text-[#d4af37]">person</span>
                            {t('nav.customer')}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Menu Items */}
                    <div className="py-2">
                      {isStaffOrAdmin && (
                        <Link to="/admin" onClick={() => setIsDropdownOpen(false)} className="flex items-center gap-3 px-5 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-[#fffbf0] hover:to-[#fef3d3] hover:text-[#1a1a2e] transition-all group">
                          <div className="w-8 h-8 rounded-lg bg-[#d4af37]/10 flex items-center justify-center group-hover:bg-[#d4af37]/20 transition-colors">
                            <span className="material-symbols-outlined text-[#d4af37] text-lg">dashboard</span>
                          </div>
                          <span className="font-medium">{t('nav.adminPanel')}</span>
                        </Link>
                      )}
                      <Link to="/account" onClick={() => setIsDropdownOpen(false)} className="flex items-center gap-3 px-5 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-[#fffbf0] hover:to-[#fef3d3] hover:text-[#1a1a2e] transition-all group">
                        <div className="w-8 h-8 rounded-lg bg-[#d4af37]/10 flex items-center justify-center group-hover:bg-[#d4af37]/20 transition-colors">
                          <span className="material-symbols-outlined text-[#d4af37] text-lg">account_circle</span>
                        </div>
                        <span className="font-medium">{t('nav.myAccount')}</span>
                      </Link>
                      <button onClick={handleLogout} className="w-full flex items-center gap-3 px-5 py-3 text-sm text-red-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 transition-all group">
                        <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center group-hover:bg-red-200 transition-colors">
                          <span className="material-symbols-outlined text-red-600 text-lg">logout</span>
                        </div>
                        <span className="font-medium">{t('nav.logout')}</span>
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold text-[#1a1a2e] border-2 border-[#d4af37]/40 hover:border-[#d4af37] hover:bg-[#fffbf0] transition-all"
                >
                  <span className="material-symbols-outlined text-base text-[#d4af37]">login</span>
                  {language === 'vi' ? 'Đăng nhập' : 'Login'}
                </Link>
                <Link
                  to="/register"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold text-[#1a1a2e] bg-gradient-to-r from-[#d4af37] to-[#e8c468] hover:shadow-lg hover:shadow-[#d4af37]/30 transition-all"
                >
                  <span className="material-symbols-outlined text-base">person_add</span>
                  {language === 'vi' ? 'Đăng ký' : 'Register'}
                </Link>
              </div>
            )}
          </div>

          {/* Nút Hamburger (Hiện trên Mobile & Tablet, Ẩn trên PC) */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden p-2 rounded-full hover:bg-gray-100 transition-colors flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-gray-500">
              {isOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* DRAWER MENU (Ngăn kéo hiển thị khi bấm nút Hamburger) */}
      {isOpen && (
        <div className="lg:hidden absolute top-full left-0 w-full bg-white border-t border-gray-200/50 shadow-2xl overflow-y-auto max-h-[85vh] animate-fade-in-up">

          {/* Thanh tìm kiếm Mobile */}
          <div className="px-4 py-4 border-b border-gray-200/50 bg-gray-50">
            <div className="relative">
              <input
                type="text"
                placeholder={t('nav.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-full py-2.5 pl-10 pr-10 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg">search</span>

              {isSearching && (
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-primary animate-spin text-lg">progress_activity</span>
              )}
              {searchQuery && !isSearching && (
                <button
                  onClick={() => { setSearchQuery(''); setShowSearchDropdown(false); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-error transition-colors flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              )}
            </div>

            {/* Hiển thị kết quả tìm kiếm ngay trong menu Mobile */}
            {searchQuery.trim().length > 0 && (
              <div className="mt-3 bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                {searchResults.length > 0 ? (
                  <div className="flex flex-col">
                    {searchResults.map(product => {
                      const displayImage = getImageUrl(product.imageUrl || product.image || product.image_url) || "https://via.placeholder.com/50";
                      return (
                        <Link
                          key={product.id}
                          to={`/product/${product.id}`}
                          onClick={() => { setIsOpen(false); setSearchQuery(''); }}
                          className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                        >
                          <img src={displayImage} alt={product.name} className="w-10 h-10 object-cover rounded-md border border-gray-200" loading="lazy" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 truncate">{product.name}</p>
                            <p className="text-xs text-primary font-semibold mt-0.5">{formatPrice(product.price)}</p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 text-center text-sm text-gray-600">
                    {t('nav.searchNoResults', { query: searchQuery })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Menu Điều hướng Mobile */}
          <div className="flex flex-col py-2">
            <Link to="/products" className="px-6 py-3 text-gray-900 font-medium hover:bg-gray-50 flex items-center gap-3" onClick={() => setIsOpen(false)}>
              <span className="material-symbols-outlined text-gray-600">inventory_2</span> {t('nav.products')}
            </Link>
            <Link to="/brand" className="px-6 py-3 text-gray-900 font-medium hover:bg-gray-50 flex items-center gap-3" onClick={() => setIsOpen(false)}>
              <span className="material-symbols-outlined text-gray-600">diamond</span> {t('nav.brand')}
            </Link>
            <Link to="/offers" className="px-6 py-3 text-gray-900 font-medium hover:bg-gray-50 flex items-center gap-3" onClick={() => setIsOpen(false)}>
              <span className="material-symbols-outlined text-gray-600">local_offer</span> {t('nav.offers')}
            </Link>
            <Link to="/contact" className="px-6 py-3 text-gray-900 font-medium hover:bg-gray-50 flex items-center gap-3" onClick={() => setIsOpen(false)}>
              <span className="material-symbols-outlined text-gray-600">support_agent</span> {t('nav.contact')}
            </Link>
          </div>

          {/* CHỌN NGÔN NGỮ TRÊN MOBILE */}
          <div className="px-6 py-3 border-t border-b border-gray-200/50 flex items-center justify-between bg-gray-50">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-700">
              {language === 'vi' ? 'Ngôn ngữ' : 'Language'}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => { changeLanguage('vi'); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all shadow-sm ${language === 'vi' ? 'bg-primary text-white border-primary' : 'bg-white border-gray-300 text-gray-700'}`}
              >
                <img src="https://flagcdn.com/w40/vn.png" alt="Tiếng Việt" className="w-4.5 h-3 object-cover rounded-sm border border-gray-200 shadow-sm" />
                VI
              </button>
              <button
                onClick={() => { changeLanguage('en'); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all shadow-sm ${language === 'en' ? 'bg-primary text-white border-primary' : 'bg-white border-gray-300 text-gray-700'}`}
              >
                <img src="https://flagcdn.com/w40/us.png" alt="English" className="w-4.5 h-3 object-cover rounded-sm border border-gray-200 shadow-sm" />
                EN
              </button>
            </div>
          </div>

          {/* Khu vực Tài khoản Mobile */}
          <div className="border-t border-gray-200/50 bg-gray-50">
            {user ? (
              <div className="flex flex-col">
                <div className="px-6 py-4 flex items-center gap-4 border-b border-gray-200/50">
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt="Avatar" className="w-12 h-12 rounded-full object-cover border border-gray-200 shadow-sm" referrerPolicy="no-referrer" loading="lazy" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="material-symbols-outlined text-gray-700 text-2xl">person</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{t('nav.welcome', { name: user.name || user.username })}</p>
                    <p className="text-xs text-gray-600 truncate">{user.email}</p>
                  </div>
                </div>

                {isStaffOrAdmin && (
                  <Link to="/admin" className="px-6 py-3 text-primary font-medium hover:bg-gray-100 flex items-center gap-3" onClick={() => setIsOpen(false)}>
                    <span className="material-symbols-outlined">dashboard</span> {t('nav.adminPanel')}
                  </Link>
                )}
                <Link to="/account" className="px-6 py-3 text-gray-900 font-medium hover:bg-gray-100 flex items-center gap-3" onClick={() => setIsOpen(false)}>
                  <span className="material-symbols-outlined text-gray-600">account_circle</span> {t('nav.myAccount')}
                </Link>
                <button
                  onClick={() => { handleLogout(); setIsOpen(false); }}
                  className="w-full text-left px-6 py-3 text-error font-medium hover:bg-red-50 flex items-center gap-3"
                >
                  <span className="material-symbols-outlined">logout</span> {t('nav.logout')}
                </button>
              </div>
            ) : (
              <div className="p-6 flex flex-col gap-3">
                <Link to="/login" className="block w-full bg-primary/10 text-primary border border-primary/20 text-center py-3 rounded-xl font-bold shadow-sm hover:bg-primary/20 transition-colors" onClick={() => setIsOpen(false)}>
                  {language === 'vi' ? 'Đăng nhập' : 'Login'}
                </Link>
                <Link to="/register" className="block w-full bg-white text-primary border border-primary/20 text-center py-3 rounded-xl font-bold shadow-sm hover:bg-primary/5 transition-colors" onClick={() => setIsOpen(false)}>
                  {language === 'vi' ? 'Đăng ký' : 'Register'}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;