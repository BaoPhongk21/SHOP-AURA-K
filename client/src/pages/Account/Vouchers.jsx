import React, { useContext, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { CartContext } from '../../context/CartContext';
import Footer from '../../components/Footer';
import toast, { Toaster } from 'react-hot-toast';
import AccountSidebar from '../../components/AccountSidebar';
import { useLanguage } from '../../context/LanguageContext';

import { API_BASE_URL } from '../../config/api.config';

const Vouchers = () => {
  const { user, logout } = useContext(AuthContext);
  const { applyVoucher } = useContext(CartContext);
  const navigate = useNavigate();
  const { t, language, formatPrice } = useLanguage();
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  useEffect(() => {
    const fetchVouchers = async () => {
      setError(null);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/v1/admin/public-vouchers`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` })
          }
        });

        if (!response.ok) {
          throw new Error(language === 'vi' ? `Lỗi từ server: HTTP ${response.status} - Không tìm thấy API` : `Server error: HTTP ${response.status} - API Not Found`);
        }

        const data = await response.json();

        // BẢN VÁ: Xử lý nhiều định dạng dữ liệu trả về từ API một cách an toàn
        if (data.success && Array.isArray(data.data)) {
          setVouchers(data.data);
        } else if (Array.isArray(data)) { // Fallback cho trường hợp API trả về mảng trực tiếp
          setVouchers(data);
        } else {
          setVouchers([]);
        }
      } catch (error) {
        console.error('Lỗi khi tải dữ liệu voucher:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchVouchers();
  }, [language]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleCopy = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    applyVoucher(code);
    toast.success(language === 'vi' ? `Đã áp dụng mã ${code} vào giỏ hàng!` : `Voucher code ${code} applied to cart!`);
    setCopiedCode(code);
    setTimeout(() => {
      setCopiedCode(null);
    }, 2000);
  };

  const getFilteredVouchers = () => {
    const now = new Date();
    return vouchers.filter(voucher => {
      const endDate = voucher.end_date ? new Date(voucher.end_date) : null;
      const isExpired = endDate && endDate < now;
      const isFullyUsedBySystem = voucher.usage_limit && voucher.current_usage >= voucher.usage_limit;
      const isUsed = voucher.is_used === true || isFullyUsedBySystem || voucher.is_active === 0 || voucher.is_active === false;

      if (activeTab === 'active') return !isExpired && !isUsed;
      if (activeTab === 'expired') return isExpired && !isUsed;
      if (activeTab === 'used') return isUsed;
      return true;
    });
  };

  if (!user) return null;

  return (
    <div className="bg-surface text-on-surface antialiased min-h-screen flex flex-col">
      <Toaster position="top-center" />

      <main className="pt-32 pb-20 px-8 max-w-7xl mx-auto flex flex-col md:flex-row gap-12 flex-grow w-full">
        <AccountSidebar />

        <section className="flex-1">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-extrabold tracking-tight text-primary mb-2 font-headline">
              {language === 'vi' ? 'Kho Voucher của tôi' : 'My Vouchers'}
            </h1>
            <p className="text-on-surface-variant">
              {language === 'vi' ? 'Lưu trữ và quản lý các ưu đãi đặc quyền dành riêng cho bạn.' : 'Store and manage exclusive promotions tailored for you.'}
            </p>
          </div>

          {/* Tabs/Filters */}
          <div className="flex flex-wrap gap-4 mb-8 overflow-x-auto pb-2 scrollbar-hide">
            <button onClick={() => setActiveTab('all')} className={`px-6 py-2 rounded-full font-medium transition-all duration-300 ${activeTab === 'all' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-high'}`}>
              {language === 'vi' ? 'Tất cả' : 'All'}
            </button>
            <button onClick={() => setActiveTab('active')} className={`px-6 py-2 rounded-full font-medium transition-all duration-300 ${activeTab === 'active' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-high'}`}>
              {language === 'vi' ? 'Đang hiệu lực' : 'Active'}
            </button>
            <button onClick={() => setActiveTab('used')} className={`px-6 py-2 rounded-full font-medium transition-all duration-300 ${activeTab === 'used' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-high'}`}>
              {language === 'vi' ? 'Đã sử dụng / Hết lượt' : 'Used / Out of stock'}
            </button>
            <button onClick={() => setActiveTab('expired')} className={`px-6 py-2 rounded-full font-medium transition-all duration-300 ${activeTab === 'expired' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-high'}`}>
              {language === 'vi' ? 'Hết hạn' : 'Expired'}
            </button>
          </div>

          {/* Voucher Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {loading ? (
              <div className="col-span-full py-8 text-center text-on-surface-variant">{language === 'vi' ? 'Đang tải dữ liệu...' : 'Loading data...'}</div>
            ) : error ? (
              <div className="col-span-full py-8 text-center text-red-500 font-medium">
                <p>{error}</p>
                <p className="text-sm mt-2 text-on-surface-variant">
                  {language === 'vi' ? 'Vui lòng kiểm tra lại kết nối đến máy chủ hoặc quyền truy cập.' : 'Please check your connection to the server or permissions.'}
                </p>
              </div>
            ) : getFilteredVouchers().length > 0 ? (
              getFilteredVouchers().map((voucher) => {
                const now = new Date();
                const endDate = voucher.end_date ? new Date(voucher.end_date) : null;
                const isExpired = endDate && endDate < now; // Hết hạn
                const isFullyUsedBySystem = voucher.usage_limit && voucher.current_usage >= voucher.usage_limit; // Hệ thống hết lượt
                const isUsed = voucher.is_used === true || isFullyUsedBySystem || voucher.is_active === 0 || voucher.is_active === false; // User đã dùng, hoặc hệ thống hết lượt, hoặc bị admin tắt
                const isInactive = isExpired || isUsed;
                
                let statusLabel = '';
                if (isUsed) {
                   if (voucher.is_used === true) statusLabel = language === 'vi' ? 'ĐÃ SỬ DỤNG' : 'USED';
                   else if (isFullyUsedBySystem) statusLabel = language === 'vi' ? 'HẾT LƯỢT' : 'OUT OF STOCK';
                   else statusLabel = language === 'vi' ? 'ĐÃ TẮT' : 'DISABLED';
                } else if (isExpired) {
                   statusLabel = language === 'vi' ? 'HẾT HẠN' : 'EXPIRED';
                }

                return (
                  <div key={voucher._id || voucher.id} className={`relative bg-surface-container-lowest rounded-xl flex overflow-hidden transition-all duration-300 hover:-translate-y-1 shadow-sm border border-outline-variant/20 group ${isInactive ? 'opacity-70 grayscale-[0.2] border-red-200' : ''}`}>
                    <div className={`w-1/3 ${isInactive ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-primary'} flex flex-col items-center justify-center p-4 relative`}>
                      <div className="absolute -right-3 top-0 bottom-0 w-6 flex flex-col justify-around py-2 z-10">
                        <div className="w-3 h-3 bg-surface rounded-full -mr-3"></div>
                        <div className="w-3 h-3 bg-surface rounded-full -mr-3"></div>
                        <div className="w-3 h-3 bg-surface rounded-full -mr-3"></div>
                      </div>
                      <span className="material-symbols-outlined text-4xl mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>{isInactive ? 'block' : 'confirmation_number'}</span>
                      <span className="font-headline font-bold text-xl text-center break-all px-1">{voucher.code}</span>
                    </div>
                    <div className="w-2/3 p-6 flex flex-col justify-between bg-surface-container-lowest border-l border-dashed border-outline-variant/50">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <span className={`text-[10px] font-bold uppercase tracking-wider py-1 px-2 rounded ${isInactive ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-primary'}`}>
                            {isInactive ? statusLabel : (voucher.type === 'percent' ? (language === 'vi' ? 'GIẢM THEO %' : 'DISCOUNT %') : (language === 'vi' ? 'GIẢM TIỀN' : 'DISCOUNT CASH'))}
                          </span>
                          <span className="material-symbols-outlined text-outline cursor-pointer hover:text-primary transition-colors text-lg" title={language === 'vi' ? 'Điều kiện áp dụng' : 'Terms & Conditions'}>info</span>
                        </div>
                        <h3 className={`font-headline font-bold text-lg mb-1 ${isInactive ? 'text-red-700' : 'text-on-surface'}`}>
                          {language === 'vi' ? 'Giảm' : 'Discount'} {voucher.type === 'percent' ? `${voucher.value}%` : `${formatPrice(voucher.value)}`}
                        </h3>
                        <div className="text-sm text-on-surface-variant space-y-1">
                          <p>{language === 'vi' ? `Đơn tối thiểu ${formatPrice(voucher.min_order_value || 0)}` : `Min spend ${formatPrice(voucher.min_order_value || 0)}`}</p>
                          {voucher.max_discount_amount > 0 &&
                            <p className="text-[10px] italic">{language === 'vi' ? `Giảm tối đa: ${formatPrice(voucher.max_discount_amount)}` : `Max discount: ${formatPrice(voucher.max_discount_amount)}`}</p>}
                        </div>
                      </div>
                      <div className="mt-4 flex items-end justify-between">
                        <div className="text-xs text-outline font-medium">
                          {isExpired ? (language === 'vi' ? 'Đã hết hạn' : 'Expired') : (language === 'vi' ? 'HSD: ' : 'Exp: ') + (voucher.end_date ? new Date(voucher.end_date).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US') : (language === 'vi' ? 'Không giới hạn' : 'No Limit'))}
                        </div>
                        <div className="flex gap-2 items-center">
                          <button className={`text-xs font-bold hover:underline ${isInactive ? 'text-gray-400' : 'text-primary'}`}>{language === 'vi' ? 'Điều kiện' : 'Terms'}</button>
                          <button
                            onClick={() => !isInactive && handleCopy(voucher.code)}
                            disabled={isInactive}
                            className={`px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all ${isInactive ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-primary text-white hover:shadow-md'}`}
                          >
                            {isInactive
                              ? (language === 'vi' ? 'Không thể dùng' : 'Unavailable')
                              : (copiedCode === voucher.code ? (language === 'vi' ? 'Đã lưu' : 'Saved') : (language === 'vi' ? 'Dùng ngay' : 'Use Now'))}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full py-8 text-center text-on-surface-variant">
                {language === 'vi' ? 'Không có voucher nào phù hợp.' : 'No vouchers available.'}
              </div>
            )}
          </div>

          {/* Featured Banner */}
          <div className="mt-16 relative rounded-2xl overflow-hidden min-h-[300px] flex items-center p-8 md:p-12 bg-primary">
            <div className="absolute inset-0 z-0">
              <img alt="Promotion Banner" className="w-full h-full object-cover opacity-20 mix-blend-overlay" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBX62XhOxhGlRONmUOIWCAgShEPtnvuBFxmPxHaSL60_s67vbBq2fR41i5YDSGblSofsYhVaBKVQiIzTAFsBtYWLlk1jFEucU7mx30Kx2JCCEXJHbJ9gXgitaDtIqI-KpQpxU07OcZEFD_jYH3dqw_DDwABN-i5AaCcAuY5NZioXl9cIlzXaa5W-Cir23dbn37Vlq3FJ1a61v4fsTuPjwb4iUS8UrxNmaFLuaZJrOV99IkiGsU1z0EHcRIJUfRJIKmsKtcFg5pf4Ws" />
            </div>
            <div className="relative z-10 max-w-xl">
              <span className="text-blue-200 font-bold tracking-widest text-sm uppercase mb-4 block">Special Collection</span>
              <h2 className="text-3xl md:text-4xl font-black text-white mb-6 leading-tight font-headline">
                {language === 'vi' ? 'Săn thêm mã ưu đãi từ các bộ sưu tập giới hạn' : 'Get exclusive discount codes from limited collections'}
              </h2>
              <Link to="/products" className="inline-block bg-white text-primary font-bold px-8 py-4 rounded-xl hover:bg-gray-100 transition-colors shadow-lg">
                {language === 'vi' ? 'Khám phá ngay' : 'Explore Now'}
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Vouchers;