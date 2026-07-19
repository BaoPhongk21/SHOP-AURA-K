import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../components/Footer';
import toast, { Toaster } from 'react-hot-toast';
import { CartContext } from '../../context/CartContext';
import { AuthContext } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { getImageUrl } from '../Register/api.config';
import { API_BASE_URL } from '../../config/api.config';

const Offers = () => {
  const { addToCart } = useContext(CartContext);
  const { user } = useContext(AuthContext);
  const { t, language, formatPrice, translateProductName } = useLanguage();
  const [vouchers, setVouchers] = useState([]);
  const [flashSaleProducts, setFlashSaleProducts] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [bestSellers, setBestSellers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    const fetchVouchers = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/admin/public-vouchers`);
        const data = await response.json();
        if (data.success) {
          setVouchers(data.data.slice(0, 6));
        }
      } catch (error) {
        console.error('Error fetching vouchers:', error);
      }
    };

    const fetchFlashSale = async () => {
      try {
        const flashRes = await fetch(`${API_BASE_URL}/api/v1/admin/public-flash-sale`);
        const flashData = await flashRes.json();
        if (flashData.success && flashData.isActive && flashData.products?.length > 0) {
          const discount = flashData.discount || 20;
          setFlashSaleProducts(flashData.products.map(p => ({ ...p, discountPercent: discount })));
          setTimeLeft(flashData.endTime > Date.now() ? flashData.endTime - Date.now() : 0);
        } else {
          setFlashSaleProducts([]);
          setTimeLeft(0);
        }
      } catch (error) {
        console.error('Error fetching flash sale:', error);
        setFlashSaleProducts([]);
        setTimeLeft(0);
      } finally {
        setLoading(false);
      }
    };

    const fetchBestSellers = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/admin/bestsellers?limit=4`);
        const data = await response.json();
        if (data.success) setBestSellers(data.data);
      } catch (error) {
        console.error('Error fetching bestsellers:', error);
      }
    };

    const fetchCategories = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/categories`);
        const data = await response.json();
        if (data.success) setCategories(data.data);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };

    fetchVouchers();
    fetchFlashSale();
    fetchBestSellers();
    fetchCategories();
  }, []);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1000) {
          clearInterval(timer);
          setFlashSaleProducts([]);
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email?.trim()) {
      toast.error(language === 'vi' ? 'Vui lòng nhập email của bạn.' : 'Please enter your email.');
      return;
    }
    setIsSubscribing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/settings/newsletter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(data.message || (language === 'vi' ? 'Đăng ký thành công!' : 'Subscribed successfully!'));
        setEmail('');
      } else {
        toast.error(data.message || (language === 'vi' ? 'Đã có lỗi xảy ra.' : 'An error occurred.'));
      }
    } catch (error) {
      toast.error(language === 'vi' ? 'Không thể kết nối đến máy chủ.' : 'Unable to connect to the server.');
    } finally {
      setIsSubscribing(false);
    }
  };

  const formatTime = (ms) => {
    if (ms <= 0) return { h: '00', m: '00', s: '00' };
    const total = Math.floor(ms / 1000);
    return {
      h: String(Math.floor(total / 3600)).padStart(2, '0'),
      m: String(Math.floor((total % 3600) / 60)).padStart(2, '0'),
      s: String(total % 60).padStart(2, '0'),
    };
  };
  const { h, m, s } = formatTime(timeLeft);

  const findCategory = (keywords) =>
    categories.find(c => keywords.some(k => (c.name || '').toLowerCase().includes(k)));
  const maleCategory = findCategory(['nam', 'men', 'polo']);
  const femaleCategory = findCategory(['nữ', 'women', 'váy', 'đầm', 'dress']);
  const accessoryCategory = findCategory(['phụ kiện', 'accessories']);

  const vi = language === 'vi';

  return (
    <div className="bg-[#fafaf7] text-gray-900 antialiased min-h-screen flex flex-col">
      <Toaster position="top-center" toastOptions={{
        style: { background: 'linear-gradient(135deg, #1a1a2e 0%, #2c2c4a 100%)', color: '#d4af37', fontWeight: '600', borderRadius: '12px', padding: '16px', border: '1px solid rgba(212,175,55,0.3)' },
      }} />

      <main className="pt-20 flex-grow">
        {/* Hero */}
        <section className="relative h-[460px] md:h-[560px] lg:h-[620px] w-full flex items-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img
              className="w-full h-full object-cover scale-105 transition-transform duration-[10s] hover:scale-110"
              alt="Special offers hero"
              src="https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600&q=80"
              loading="eager"
              onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1600&q=80'; }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent"></div>
          </div>
          <div className="relative z-10 px-6 sm:px-10 md:px-16 lg:px-20 w-full max-w-[1440px] mx-auto" data-aos="fade-right">
            <div
              className="max-w-2xl p-6 sm:p-8 md:p-12 rounded-[2rem] border-2 border-[#d4af37]/30 shadow-2xl shadow-[#d4af37]/10"
              style={{ background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 251, 240, 0.92) 100%)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
            >
              <div className="absolute top-0 left-0 w-10 h-10 border-t-2 border-l-2 border-[#d4af37] rounded-tl-[2rem]"></div>
              <div className="absolute bottom-0 right-0 w-10 h-10 border-b-2 border-r-2 border-[#d4af37] rounded-br-[2rem]"></div>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#1a1a2e] to-[#2c2c4a] text-[#d4af37] text-xs sm:text-sm font-bold tracking-[0.2em] uppercase mb-6 border border-[#d4af37]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37] animate-pulse"></span>
                {vi ? 'Sự kiện theo mùa' : 'Seasonal Event'}
              </span>
              <h1
                className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-black mb-4 sm:mb-6 leading-[1.1] tracking-tight"
                style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #2c2c4a 50%, #1a1a2e 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
              >
                {vi ? <>ƯU ĐÃI ĐẶC BIỆT<br />GIẢM TỚI 50%</> : <>SPECIAL OFFERS<br />UP TO 50% OFF</>}
              </h1>
              <p className="text-sm sm:text-base md:text-lg mb-8 sm:mb-10 max-w-xl leading-relaxed font-medium text-[#4a4a6a]">
                {vi
                  ? 'Khám phá những thiết kế được tuyển chọn kỹ lưỡng với mức giá cực kỳ hấp dẫn, giúp bạn tỏa sáng mỗi ngày cùng Aura K.'
                  : 'Discover thoughtfully curated designs at exceptional prices and elevate your everyday style with Aura K.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/products" className="inline-flex items-center justify-center px-8 md:px-10 py-4 bg-gradient-to-r from-[#1a1a2e] to-[#2c2c4a] text-[#d4af37] text-sm sm:text-base font-bold rounded-full hover:from-[#d4af37] hover:to-[#e8c468] hover:text-[#1a1a2e] transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl hover:shadow-[#d4af37]/40 border border-[#d4af37]/30 group">
                  <span>{vi ? 'Mua ngay' : 'Shop Now'}</span>
                  <span className="material-symbols-outlined ml-2 group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </Link>
                <Link to="/brand" className="inline-flex items-center justify-center px-8 md:px-10 py-4 bg-white text-[#1a1a2e] border-2 border-[#1a1a2e]/20 text-sm sm:text-base font-bold rounded-full hover:bg-[#1a1a2e] hover:text-[#d4af37] hover:border-[#1a1a2e] transition-all duration-300 transform hover:-translate-y-1">
                  <span>{vi ? 'Xem thương hiệu' : 'View Brands'}</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Exclusive Coupons */}
        {vouchers.length > 0 && (
          <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 lg:px-12 max-w-screen-2xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 sm:mb-12 gap-4" data-aos="fade-up">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-12 h-[2px] bg-gradient-to-r from-[#d4af37] to-[#e8c468] rounded-full"></span>
                  <span className="text-[#d4af37] uppercase text-xs tracking-[0.35em] font-bold">{vi ? 'Mã ưu đãi' : 'Promo Codes'}</span>
                </div>
                <h2
                  className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-3"
                  style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #2c2c4a 50%, #1a1a2e 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
                >
                  {vi ? 'Mã giảm giá dành riêng' : 'Exclusive Promo Codes'}
                </h2>
                <p className="text-gray-500 text-base sm:text-lg font-medium">
                  {vi ? 'Những ưu đãi riêng biệt dành cho khách hàng của Aura K.' : 'Special offers crafted just for the Aura K community.'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {vouchers.map((voucher, index) => {
                const palettes = [
                  { accent: 'from-[#1a1a2e] to-[#2c2c4a]', badge: 'bg-[#d4af37]/15 text-[#d4af37]', icon: 'confirmation_number' },
                  { accent: 'from-amber-700 to-amber-900', badge: 'bg-amber-100 text-amber-800', icon: 'loyalty' },
                  { accent: 'from-slate-700 to-slate-900', badge: 'bg-slate-100 text-slate-800', icon: 'local_shipping' },
                ];
                const palette = palettes[index % palettes.length];
                const isPercent = voucher.type === 'percent';
                const discountText = isPercent
                  ? `${voucher.value}% OFF`
                  : (vi ? `Giảm ${Number(voucher.value).toLocaleString('vi-VN')}đ` : `Save ${formatPrice(voucher.value)}`);
                return (
                  <div
                    key={voucher.id}
                    data-aos="fade-up"
                    data-aos-delay={index * 80}
                    className="group relative bg-white rounded-3xl border-2 border-gray-100 hover:border-[#d4af37]/50 hover:shadow-2xl hover:shadow-[#d4af37]/15 transition-all duration-500 hover:-translate-y-2 overflow-hidden"
                  >
                    <div className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${palette.accent}`}></div>
                    <div className="p-7 sm:p-8">
                      <div className="flex justify-between items-start mb-5">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${palette.badge}`}>
                          <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>{palette.icon}</span>
                        </div>
                        {voucher.end_date && (
                          <span className="text-[10px] font-bold tracking-widest uppercase text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                            {vi ? 'HSD: ' : 'EXP: '}{new Date(voucher.end_date).toLocaleDateString(vi ? 'vi-VN' : 'en-US')}
                          </span>
                        )}
                      </div>
                      <h3
                        className="text-4xl font-black mb-3"
                        style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #2c2c4a 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
                      >
                        {discountText}
                      </h3>
                      <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                        {vi ? `Áp dụng cho đơn hàng từ ${Number(voucher.min_order_value || 0).toLocaleString('vi-VN')}đ` : `Valid for orders from ${formatPrice(voucher.min_order_value || 0)}`}
                      </p>
                      <div className="flex items-center justify-between p-4 bg-gradient-to-br from-[#fafaf7] to-[#fffbf0] rounded-2xl border-2 border-dashed border-[#d4af37]/30">
                        <span className="font-mono font-black text-[#1a1a2e] tracking-widest uppercase text-sm">{voucher.code}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(voucher.code);
                            toast.success((vi ? 'Đã sao chép mã: ' : 'Copied code: ') + voucher.code);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#1a1a2e] to-[#2c2c4a] text-[#d4af37] text-xs font-bold hover:from-[#d4af37] hover:to-[#e8c468] hover:text-[#1a1a2e] transition-all duration-300"
                        >
                          <span className="material-symbols-outlined text-sm">content_copy</span>
                          {vi ? 'Sao chép' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Flash Sale Section */}
        <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 lg:px-12 max-w-screen-2xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-10 sm:mb-12 gap-6" data-aos="fade-up">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="material-symbols-outlined text-red-500 text-2xl animate-pulse" style={{ fontVariationSettings: "'FILL' 1" }}>flash_on</span>
                <span className="text-red-500 uppercase text-xs tracking-[0.35em] font-bold">{vi ? 'Flash Sale' : 'Flash Sale'}</span>
              </div>
              <h2
                className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-3"
                style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #2c2c4a 50%, #1a1a2e 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
              >
                {vi ? 'Ưu đãi giảm sốc' : 'Flash Sale Deals'}
              </h2>
              <p className="text-gray-500 text-base sm:text-lg max-w-xl font-medium">
                {vi ? (
                  <>Nhận ngay những món đồ yêu thích với mức giảm giá lên tới <span className="font-bold text-red-600">{(flashSaleProducts[0]?.discountPercent) || 20}%</span> trong thời gian giới hạn.</>
                ) : (
                  <>Grab your favorites at up to <span className="font-bold text-red-600">{(flashSaleProducts[0]?.discountPercent) || 20}%</span> off for a limited time.</>
                )}
              </p>
            </div>
            {timeLeft > 0 && flashSaleProducts.length > 0 && (
              <div className="flex items-center gap-3 bg-gradient-to-br from-[#1a1a2e] to-[#2c2c4a] px-5 py-3 rounded-full border border-red-500/30 shadow-lg shadow-red-500/10">
                <span className="text-xs font-bold uppercase tracking-widest text-red-400">{vi ? 'Kết thúc sau' : 'Ends In'}</span>
                <div className="flex gap-2 font-mono font-black text-lg text-white tabular-nums">
                  <span className="bg-red-500/20 px-2 py-1 rounded">{h}</span>:
                  <span className="bg-red-500/20 px-2 py-1 rounded">{m}</span>:
                  <span className="bg-red-500/20 px-2 py-1 rounded">{s}</span>
                </div>
              </div>
            )}
          </div>
          {loading ? (
            <div className="text-center py-16 text-gray-400 text-sm">
              <span className="material-symbols-outlined animate-spin text-4xl mb-3 inline-block">progress_activity</span>
              <p>{vi ? 'Đang tải ưu đãi...' : 'Loading offers...'}</p>
            </div>
          ) : flashSaleProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
              {flashSaleProducts.map(product => {
                const originalPrice = Number(product.price);
                const discount = product.discountPercent || 20;
                const discountedPrice = originalPrice * (100 - discount) / 100;
                const displayImage = getImageUrl(product.imageUrl || product.image || product.image_url) || 'https://via.placeholder.com/300x400?text=No+Image';
                return (
                  <Link to={`/product/${product.id}`} key={product.id} className="group block" data-aos="fade-up">
                    <div className="bg-white rounded-2xl border-2 border-gray-100 hover:border-[#d4af37]/50 hover:shadow-2xl hover:shadow-[#d4af37]/15 transition-all duration-500 hover:-translate-y-2 overflow-hidden">
                      <div className="relative aspect-[3/4] overflow-hidden bg-gray-50">
                        <img className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={product.name} src={displayImage} loading="lazy" />
                        <div className="absolute top-3 left-3 bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-1 text-[11px] font-black uppercase tracking-widest shadow-md rounded-full">
                          -{discount}%
                        </div>
                        <button onClick={(e) => {
                          e.preventDefault();
                          const totalStock = product.variants ? product.variants.reduce((sum, v) => sum + (Number(v.stock_quantity) || 0), 0) : (product.stock_quantity || 10);
                          addToCart({ id: product.id, name: product.name, price: originalPrice, quantity: 1, size: 'Freesize', image: displayImage, stock_quantity: totalStock });
                        }} className="absolute bottom-3 right-3 bg-gradient-to-r from-[#1a1a2e] to-[#2c2c4a] text-[#d4af37] p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 hover:from-[#d4af37] hover:to-[#e8c468] hover:text-[#1a1a2e] hover:scale-110 shadow-lg">
                          <span className="material-symbols-outlined">add_shopping_cart</span>
                        </button>
                      </div>
                      <div className="p-4">
                        <p className="text-[10px] uppercase tracking-widest text-[#d4af37] font-bold mb-1 truncate">
                          {product.brand && product.brand !== 'No Brand' ? product.brand : 'Aura K'}
                        </p>
                        <h4 className="text-sm font-bold text-[#1a1a2e] mb-2 truncate group-hover:text-[#d4af37] transition-colors">{translateProductName(product.name)}</h4>
                        <div className="flex items-center gap-2">
                          <span className="text-red-600 font-black text-base">{formatPrice(discountedPrice)}</span>
                          <span className="text-xs text-gray-400 line-through">{formatPrice(originalPrice)}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 flex flex-col items-center justify-center bg-white rounded-3xl border-2 border-dashed border-gray-200 shadow-sm">
              <span className="material-symbols-outlined text-7xl text-gray-300 mb-4">timer_off</span>
              <p className="text-lg font-black text-gray-700 mb-1">{vi ? 'Hiện chưa có ưu đãi đang diễn ra' : 'No active deals right now'}</p>
              <p className="text-sm text-gray-400 max-w-md">
                {vi ? 'Hãy quay lại sau để khám phá những chương trình giảm giá hấp dẫn tiếp theo!' : 'Please check back soon for the next exciting offers!'}
              </p>
            </div>
          )}
        </section>

        {/* Best Sellers Section */}
        {bestSellers.length > 0 && (
          <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 lg:px-12 max-w-screen-2xl mx-auto bg-gradient-to-br from-[#fffbf0]/40 via-white to-[#fafaf7]">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 sm:mb-12 gap-4" data-aos="fade-up">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="material-symbols-outlined text-[#d4af37] text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                  <span className="text-[#d4af37] uppercase text-xs tracking-[0.35em] font-bold">{vi ? 'Bán chạy' : 'Top Sellers'}</span>
                </div>
                <h2
                  className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-3"
                  style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #2c2c4a 50%, #1a1a2e 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
                >
                  {vi ? 'Sản phẩm bán chạy' : 'Best Sellers'}
                </h2>
                <p className="text-gray-500 text-base sm:text-lg font-medium">
                  {vi ? 'Những thiết kế luôn được khách hàng yêu thích và lựa chọn nhiều nhất.' : 'The most-loved designs chosen by our customers.'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
              {bestSellers.map(product => {
                const displayImage = getImageUrl(product.image_url) || 'https://via.placeholder.com/300x400?text=No+Image';
                return (
                  <Link to={`/product/${product.id}`} key={product.id} className="group block" data-aos="fade-up">
                    <div className="bg-white rounded-2xl border-2 border-gray-100 hover:border-[#d4af37]/50 hover:shadow-2xl hover:shadow-[#d4af37]/15 transition-all duration-500 hover:-translate-y-2 overflow-hidden">
                      <div className="relative aspect-[3/4] overflow-hidden bg-gray-50">
                        <img className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={product.name} src={displayImage} loading="lazy" />
                        <div className="absolute top-3 left-3 bg-gradient-to-r from-[#d4af37] to-[#e8c468] text-[#1a1a2e] px-3 py-1 text-[10px] font-black uppercase tracking-widest shadow-md rounded-full flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                          {vi ? 'Bán chạy' : 'Bestseller'}
                        </div>
                      </div>
                      <div className="p-4">
                        <p className="font-bold text-[#1a1a2e] text-sm truncate group-hover:text-[#d4af37] transition-colors">{translateProductName(product.name)}</p>
                        <p
                          className="text-base font-black mt-2"
                          style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #2c2c4a 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
                        >
                          {formatPrice(product.price)}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Category Sale Cards */}
        <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 lg:px-12 max-w-screen-2xl mx-auto">
          <div className="text-center mb-10 sm:mb-14" data-aos="fade-up">
            <div className="inline-flex items-center gap-2 mb-3 justify-center">
              <span className="w-10 h-[2px] bg-gradient-to-r from-transparent to-[#d4af37] rounded-full"></span>
              <span className="text-[#d4af37] uppercase text-xs tracking-[0.35em] font-bold">{vi ? 'Khám phá' : 'Browse'}</span>
              <span className="w-10 h-[2px] bg-gradient-to-l from-transparent to-[#d4af37] rounded-full"></span>
            </div>
            <h2
              className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight"
              style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #2c2c4a 50%, #1a1a2e 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
            >
              {vi ? 'Ưu đãi theo danh mục' : 'Deals by Category'}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">
            {[
              {
                cat: maleCategory,
                fallbackImg: 'https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?w=900&q=80',
                title_vi: 'Ưu đãi Nam', title_en: "Men's Sale",
                desc_vi: 'Giảm đến 40% cho các thiết kế thời trang nam tinh tế và lịch lãm.',
                desc_en: "Up to 40% off refined and polished men's essentials.",
              },
              {
                cat: femaleCategory,
                fallbackImg: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=900&q=80',
                title_vi: 'Ưu đãi Nữ', title_en: "Women's Sale",
                desc_vi: 'Tận hưởng ưu đãi lên đến 50% cho bộ sưu tập mới của mùa.',
                desc_en: 'Enjoy up to 50% off the latest seasonal collection.',
              },
              {
                cat: accessoryCategory,
                fallbackImg: 'https://images.unsplash.com/photo-1606293459339-aa5d34a7b0e1?w=900&q=80',
                title_vi: 'Ưu đãi Phụ kiện', title_en: 'Accessories Sale',
                desc_vi: 'Nâng tầm phong cách với các phụ kiện tinh tế giảm giá hấp dẫn.',
                desc_en: 'Add the finishing touch with elegant accessories on sale.',
              },
            ].map((slot, i) => (
              <Link
                key={i}
                to={slot.cat ? `/products?category=${slot.cat.id}` : '/products'}
                className="group relative h-[380px] md:h-[440px] rounded-3xl overflow-hidden block shadow-lg hover:shadow-2xl transition-all duration-500"
                data-aos="fade-up"
                data-aos-delay={i * 100}
              >
                <img className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={vi ? slot.title_vi : slot.title_en} src={slot.fallbackImg} loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e27]/90 via-[#0a0e27]/30 to-transparent"></div>
                <div className="absolute top-5 left-5 bg-gradient-to-r from-[#d4af37] to-[#e8c468] text-[#1a1a2e] px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-md">
                  {vi ? 'Giảm tới' : 'Up to'} {i === 1 ? '50%' : i === 0 ? '40%' : '30%'}
                </div>
                <div className="absolute inset-x-0 bottom-0 p-7 sm:p-8">
                  <h3 className="text-white text-2xl sm:text-3xl font-black mb-2 leading-tight">{vi ? slot.title_vi : slot.title_en}</h3>
                  <p className="text-white/80 text-sm leading-relaxed mb-5">{vi ? slot.desc_vi : slot.desc_en}</p>
                  <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#d4af37] to-[#e8c468] text-[#1a1a2e] rounded-full font-black text-xs uppercase tracking-widest group-hover:gap-3 transition-all shadow-lg shadow-[#d4af37]/30">
                    <span>{vi ? 'Khám phá ngay' : 'Explore Now'}</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Newsletter / FOMO */}
        {!user && (
          <section className="py-16 sm:py-20 px-4 sm:px-6 md:px-8 max-w-screen-xl mx-auto">
            <div
              className="relative rounded-3xl border-2 border-[#d4af37]/30 shadow-2xl shadow-[#d4af37]/15 overflow-hidden"
              data-aos="zoom-in"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] via-[#111638] to-[#1a1a2e]"></div>
              <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-[#d4af37]/10 rounded-full blur-[100px] pointer-events-none"></div>
              <div className="relative z-10 px-8 sm:px-12 md:px-16 py-12 sm:py-16 flex flex-col items-center text-center">
                <div className="w-20 h-20 mb-6 bg-gradient-to-br from-[#d4af37] to-[#e8c468] rounded-2xl flex items-center justify-center shadow-xl shadow-[#d4af37]/30">
                  <span className="material-symbols-outlined text-3xl text-[#1a1a2e]" style={{ fontVariationSettings: "'FILL' 1" }}>mail</span>
                </div>
                <h2
                  className="text-3xl sm:text-4xl lg:text-5xl font-black mb-4 leading-tight text-white"
                >
                  {vi ? 'Đừng bỏ lỡ ưu đãi sắp tới' : "Don't Miss What's Next"}
                </h2>
                <p className="text-white/70 mb-10 max-w-lg leading-relaxed">
                  {vi
                    ? 'Nhận thông báo sớm nhất về các chương trình giảm giá và mã ưu đãi độc quyền dành riêng cho bạn.'
                    : 'Be the first to know about our next flash sales and exclusive promo codes.'}
                </p>
                <form className="w-full max-w-lg flex flex-col sm:flex-row gap-3" onSubmit={handleSubscribe}>
                  <input
                    className="flex-1 bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-full px-6 py-3.5 text-white placeholder:text-white/50 focus:outline-none focus:border-[#d4af37] transition-all shadow-lg"
                    placeholder={vi ? 'Email của bạn' : 'Your email address'}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <button
                    type="submit"
                    disabled={isSubscribing}
                    className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-gradient-to-r from-[#d4af37] to-[#e8c468] text-[#1a1a2e] font-black rounded-full text-sm uppercase tracking-widest hover:shadow-2xl hover:shadow-[#d4af37]/40 hover:-translate-y-1 transition-all disabled:opacity-70"
                  >
                    <span>{isSubscribing ? (vi ? 'Đang gửi...' : 'Subscribing...') : (vi ? 'Đăng ký ngay' : 'Subscribe Now')}</span>
                    {!isSubscribing && <span className="material-symbols-outlined text-base">send</span>}
                  </button>
                </form>
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Offers;
