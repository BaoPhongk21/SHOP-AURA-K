import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Footer from '../../components/Footer';
import toast, { Toaster } from 'react-hot-toast';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { useLanguage } from '../../context/LanguageContext';
import { getImageUrl } from '../Register/api.config';
import { API_BASE_URL } from '../../config/api.config';
import { useSettings } from '../../components/SettingsContext'; // Import useSettings
import { AuthContext } from '../../context/AuthContext';
import { CartContext } from '../../context/CartContext';

/**
 * Thành phần Video an toàn, tránh lỗi AbortError khi play/pause quá nhanh
 */
const SafeVideoPlayer = ({ src, className }) => {
  const videoRef = React.useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video && src) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Bắt lỗi play() request was interrupted
        });
      }
    }
  }, [src]);

  return <video ref={videoRef} src={src} className={className} muted loop playsInline />;
};

const Home = () => {
  const { t, language, formatPrice, translateCategoryName, translateProductName } = useLanguage();
  const [products, setProducts] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [categories, setCategories] = useState([]);
  const { user } = useContext(AuthContext);
  const [emailInput, setEmailInput] = useState('');
  const navigate = useNavigate();
  const { settings } = useSettings(); // Sử dụng trực tiếp settings từ context
  const { addToCart } = useContext(CartContext);

  const DEFAULT_BANNER = "https://lh3.googleusercontent.com/aida-public/AB6AXuBDWLjCnuYNeQbCJYWB9crZCvwOgafyhwndQKl7s-7wjEAtCin7iepds6BMIhxiSemliJZrbV38-sTzDpfv-_guh8wDFQdrWNKSQdEATtsSZ5Nv7aVzScIVfKWbB0uW2y1qu3r7UH8ScYa1BOm5XYHteCTnZzUuwhe7fMdCl1DZ8apTotie2_AwtK3AU0aZRK0iqfCKPMSyv1WlW99xuPPtHKAguKzqqaWHEO9OTxREH5owymJdUFItNMsL2ECMComiu2WAr_qTI7U";
  const [pageBanners, setPageBanners] = useState([]);

  useEffect(() => {
    window.scrollTo(0, 0);
    AOS.init({ duration: 800, once: true, easing: 'ease-out-cubic', offset: 50 });
  }, []);

  // Fetch banner từ API quản lý banner (ưu tiên banner từ DB, fallback về settings)
  useEffect(() => {
    const fetchPageBanners = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/admin/banners/page/home`);
        const data = await res.json();
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          setPageBanners(data.data);
        }
      } catch (e) {
        console.error('Lỗi lấy banner trang chủ:', e);
      }
    };
    fetchPageBanners();
  }, []);

  // Fetch tất cả dữ liệu cùng lúc bằng Promise.all để giảm thời gian load
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [resProducts, resCategories] = await Promise.all([
          fetch(`${API_BASE_URL}/api/v1/products?limit=12&sort=-sold`),
          fetch(`${API_BASE_URL}/api/v1/categories`)
        ]);

        // Xử lý products
        const dataProducts = await resProducts.json();
        if (dataProducts.success) {
          const list = dataProducts.data || [];
          // 4 sản phẩm mới nhất cho "New Arrivals"
          setProducts(list.slice(0, 4));
          // Top best-sellers (sắp xếp theo sold/orders)
          const sortedBySold = [...list].sort((a, b) => {
            const sa = Number(a.total_sold || a.sold || a.sold_count || a.units_sold || 0);
            const sb = Number(b.total_sold || b.sold || b.sold_count || b.units_sold || 0);
            return sb - sa;
          });
          setBestSellers(sortedBySold.slice(0, 8));
        }

        // Xử lý categories (KHÔNG cần gọi API riêng cho từng danh mục để lấy ảnh)
        // vì bên dưới đã dùng fallbackImage theo tên danh mục rồi
        const dataCategories = await resCategories.json();
        if (dataCategories.success) {
          setCategories(dataCategories.data.slice(0, 4));
        }
      } catch (error) {
        console.error('Lỗi kết nối tới Backend:', error);
      }
    };
    fetchAllData();
  }, []);

  const handleSubscribeClick = async (e) => {
    e.preventDefault(); // Ngăn trình duyệt load lại trang

    if (!emailInput.trim()) {
      toast.error(language === 'vi' ? 'Vui lòng nhập địa chỉ email của bạn!' : 'Please enter your email address!');
      return;
    }

    try {
      // Gọi API kiểm tra email xem đã tồn tại trong database chưa
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/check-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput }),
      });

      const result = await response.json();

      if (result.exists) {
        // Nếu email ĐÃ TỒN TẠI -> Chuyển qua trang Login & điền sẵn email
        toast.error(language === 'vi' ? 'Email này đã có tài khoản. Vui lòng đăng nhập!' : 'This email is already registered. Please log in!');
        setTimeout(() => navigate('/login', { state: { identifier: emailInput } }), 1500);
      } else {
        // Nếu email CHƯA TỒN TẠI -> Chuyển qua trang Đăng ký & điền sẵn email
        toast.success(language === 'vi' ? 'Tuyệt vời! Đang chuyển hướng đến trang đăng ký...' : 'Wonderful! Redirecting to registration page...');
        setTimeout(() => navigate('/register', { state: { email: emailInput } }), 1500);
      }
    } catch (error) {
      console.error("Lỗi khi kiểm tra email:", error);
      toast.error(language === 'vi' ? 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.' : 'Unable to connect to the server. Please try again later.');
      setTimeout(() => navigate('/register', { state: { email: emailInput } }), 1500);
    }
  };

  // Ưu tiên: banner từ API quản lý banner -> settings.bannerUrl -> DEFAULT_BANNER
  const heroBannerUrl = (pageBanners.length > 0 && getImageUrl(pageBanners[0].image_url))
    || getImageUrl(settings?.bannerUrl)
    || DEFAULT_BANNER;
  const heroBannerLink = pageBanners[0]?.link_url || null;

  const isNewProduct = (product) => {
    if (!product) return false;

    const isExplicitlyNew = product?.is_new;
    if ([true, 'true', 1, '1'].includes(isExplicitlyNew)) return true;
    if ([false, 'false', 0, '0'].includes(isExplicitlyNew)) return false;

    const createdAt = product.created_at || product.createdAt || product.created_at_string;
    if (!createdAt) return false;

    const createdTs = new Date(createdAt).getTime();
    if (Number.isNaN(createdTs)) return false;

    const NEW_PRODUCT_DAYS = 30;
    return Date.now() - createdTs <= NEW_PRODUCT_DAYS * 24 * 60 * 60 * 1000;
  };

  // Brands will be sourced from backend when available.
  // We attempt to fetch a dedicated /brands endpoint first, then fall back to deriving brands from products.
  const [brandData, setBrandData] = useState({ premium: [], mainstream: [], fallback: [], hasTierInfo: false });

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/brands`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            const premium = (json.data || []).filter(b => ['premium', 'luxury'].includes(String(b.tier || '').toLowerCase()));
            const mainstream = (json.data || []).filter(b => ['mainstream', 'mass', 'street'].includes(String(b.tier || '').toLowerCase()));
            setBrandData({ premium, mainstream, fallback: [], hasTierInfo: premium.length > 0 || mainstream.length > 0 });
            return;
          }
        }

        const resProd = await fetch(`${API_BASE_URL}/api/v1/products?limit=200`);
        if (resProd.ok) {
          const jsonP = await resProd.json();
          const productsList = jsonP.success ? jsonP.data : (jsonP.data || []);
          const seen = new Set();
          const fallback = (productsList || []).reduce((acc, p) => {
            const rawName = p.brand || p.brand_name || p.brandName || '';
            const name = String(rawName || '').trim();
            if (!name) return acc;

            const key = name.toLowerCase();
            if (seen.has(key)) return acc;

            seen.add(key);
            acc.push({
              name,
              description: p.brand_description || p.description || '',
              logo: p.brand_logo || p.logo || p.image || null,
            });
            return acc;
          }, []);

          setBrandData({ premium: [], mainstream: [], fallback, hasTierInfo: false });
        } else {
          setBrandData({ premium: [], mainstream: [], fallback: [], hasTierInfo: false });
        }
      } catch (err) {
        console.error('Error fetching brands:', err);
        setBrandData({ premium: [], mainstream: [], fallback: [], hasTierInfo: false });
      }
    };
    fetchBrands();
  }, []);



  return (
    <div className="bg-[#fafaf7] text-gray-900 antialiased">
      <style>
        {`
          @keyframes scroll {
            from { transform: translateX(0); }
            to { transform: translateX(-25%); }
          }
          .animate-scroll {
            animation: scroll 240s linear infinite;
          }
        `}
      </style>
      <Toaster position="top-center" toastOptions={{
        style: {
          background: 'linear-gradient(135deg, #1a1a2e 0%, #2c2c4a 100%)',
          color: '#d4af37',
          fontWeight: '600',
          borderRadius: '12px',
          padding: '16px',
          border: '1px solid rgba(212,175,55,0.3)',
        },
      }} />
      <main className="pt-20">
        {/* Hero Section - Enhanced */}
        <section className="relative h-[500px] md:h-[650px] lg:h-[750px] w-full flex items-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            {heroBannerLink ? (
              <a href={heroBannerLink} target={heroBannerLink.startsWith('http') ? '_blank' : '_self'} rel="noopener noreferrer" className="block w-full h-full">
                {/\.(mp4|webm|ogg|mov)$/i.test(heroBannerUrl) ? (
                  <SafeVideoPlayer key={heroBannerUrl} src={heroBannerUrl} className="w-full h-full object-cover scale-105" />
                ) : (
                  <img
                    className="w-full h-full object-cover scale-105 transition-transform duration-[10s] hover:scale-110"
                    alt="Modern high-end luxury boutique interior"
                    src={heroBannerUrl}
                    loading="eager"
                    onError={(e) => {
                      if (e.target.src !== DEFAULT_BANNER) {
                        e.target.onerror = null;
                        e.target.src = DEFAULT_BANNER;
                      }
                    }}
                  />
                )}
              </a>
            ) : (
              <>
                {/\.(mp4|webm|ogg|mov)$/i.test(heroBannerUrl) ? (
                  <SafeVideoPlayer key={heroBannerUrl} src={heroBannerUrl} className="w-full h-full object-cover scale-105" />
                ) : (
                  <img
                    className="w-full h-full object-cover scale-105 transition-transform duration-[10s] hover:scale-110"
                    alt="Modern high-end luxury boutique interior"
                    src={heroBannerUrl}
                    loading="eager"
                    onError={(e) => {
                      console.error("❌ Lỗi tải banner.");
                      if (e.target.src !== DEFAULT_BANNER) {
                        e.target.onerror = null;
                        e.target.src = DEFAULT_BANNER;
                      }
                    }}
                  />
                )}
              </>
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-transparent pointer-events-none"></div>
          </div>
          <div className="relative z-10 px-4 sm:px-6 md:px-12 lg:px-20 w-full max-w-[1440px] mx-auto" data-aos="fade-right" data-aos-duration="1000">
            <div
              className="max-w-2xl lg:max-w-3xl p-6 sm:p-8 md:p-10 lg:p-14 rounded-[2rem] border-2 border-[#d4af37]/30 shadow-2xl shadow-[#d4af37]/10 hover:shadow-[#d4af37]/25 transition-all duration-700 animate-float relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 251, 240, 0.92) 100%)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
            >
              {/* Gold corner accents */}
              <div className="absolute top-0 left-0 w-10 h-10 border-t-2 border-l-2 border-[#d4af37] rounded-tl-[2rem] pointer-events-none"></div>
              <div className="absolute bottom-0 right-0 w-10 h-10 border-b-2 border-r-2 border-[#d4af37] rounded-br-[2rem] pointer-events-none"></div>

              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#1a1a2e] to-[#2c2c4a] text-[#d4af37] text-xs sm:text-sm font-bold tracking-[0.2em] uppercase mb-6 sm:mb-8 shadow-md animate-fade-in border border-[#d4af37]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37] animate-pulse shadow-[0_0_8px_rgba(212,175,55,0.8)]"></span>
                {settings?.heroSubtitle || t('home.heroSub')}
              </span>
              <h1
                className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-black mb-4 sm:mb-6 leading-[1.1] tracking-tight animate-fade-in-up"
                style={{
                  background: 'linear-gradient(135deg, #1a1a2e 0%, #2c2c4a 50%, #1a1a2e 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {settings?.heroTitle || t('home.heroTitle')}
              </h1>
              <p
                className="text-sm sm:text-base md:text-lg lg:text-xl mb-8 sm:mb-10 lg:mb-12 max-w-xl leading-relaxed font-medium animate-fade-in-up text-[#4a4a6a]"
                style={{ animationDelay: '0.2s' }}
              >
                {settings?.heroDescription || t('home.heroDesc')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                <Link to="/products" className="inline-flex items-center justify-center px-8 md:px-10 py-4 bg-gradient-to-r from-[#1a1a2e] to-[#2c2c4a] text-[#d4af37] text-sm sm:text-base font-bold rounded-full hover:from-[#d4af37] hover:to-[#e8c468] hover:text-[#1a1a2e] transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl hover:shadow-[#d4af37]/40 border border-[#d4af37]/30 group">
                  <span>{settings?.heroButtonText || t('home.heroBtn')}</span>
                  <span className="material-symbols-outlined ml-2 text-lg sm:text-xl group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </Link>
                <Link to="/brand" className="inline-flex items-center justify-center px-8 md:px-10 py-4 bg-white text-[#1a1a2e] border-2 border-[#1a1a2e]/20 text-sm sm:text-base font-bold rounded-full hover:bg-[#1a1a2e] hover:text-[#d4af37] hover:border-[#1a1a2e] transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl group">
                  <span>{t('nav.brand')}</span>
                  <span className="material-symbols-outlined ml-2 text-lg sm:text-xl group-hover:translate-x-1 transition-transform">diamond</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Trust Bar - immediate trust signals */}
        <section className="relative bg-white border-b border-[#d4af37]/10 shadow-sm overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[#fffbf0]/30 via-white to-[#fffbf0]/30 pointer-events-none"></div>
          <div className="relative max-w-screen-2xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-5 sm:py-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {[
                { icon: 'workspace_premium', title_vi: 'Hàng chính hãng 100%', title_en: '100% Authentic', desc_vi: 'Cam kết nguồn gốc rõ ràng', desc_en: 'Verified origin & quality' },
                { icon: 'local_shipping', title_vi: 'Freeship 24h nội thành', title_en: 'Free 24h Delivery', desc_vi: 'Đơn từ 500K toàn quốc', desc_en: 'Orders from $20 nationwide' },
                { icon: 'currency_exchange', title_vi: 'Đổi trả trong 30 ngày', title_en: '30-Day Returns', desc_vi: 'Miễn phí đổi size & màu', desc_en: 'Free size & color swaps' },
                { icon: 'support_agent', title_vi: 'Hỗ trợ 24/7', title_en: '24/7 Support', desc_vi: 'Tư vấn phong cách mọi lúc', desc_en: 'Stylist help anytime' },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 sm:gap-4 px-2 sm:px-4 py-2 group cursor-default"
                  data-aos="fade-up"
                  data-aos-delay={idx * 80}
                >
                  <div className="w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-xl bg-gradient-to-br from-[#1a1a2e] to-[#2c2c4a] flex items-center justify-center group-hover:from-[#d4af37] group-hover:to-[#e8c468] transition-all duration-500 border border-[#d4af37]/20 shadow-sm">
                    <span className="material-symbols-outlined text-[#d4af37] group-hover:text-[#1a1a2e] text-xl sm:text-2xl transition-colors duration-500">{item.icon}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-extrabold text-[#1a1a2e] text-xs sm:text-sm leading-tight">
                      {language === 'vi' ? item.title_vi : item.title_en}
                    </p>
                    <p className="text-[10px] sm:text-xs text-gray-500 font-medium mt-0.5">
                      {language === 'vi' ? item.desc_vi : item.desc_en}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Category Grid - Enhanced with better responsive */}
        <section className="py-12 sm:py-16 md:py-20 lg:py-24 px-4 sm:px-6 md:px-8 lg:px-12 max-w-screen-2xl mx-auto">
          {/* Gold accent */}
          <div className="flex items-center gap-3 mb-4 sm:mb-6" data-aos="fade-right">
            <span className="w-12 h-[2px] bg-gradient-to-r from-[#d4af37] to-[#e8c468] rounded-full"></span>
            <span className="text-[#d4af37] uppercase text-xs tracking-[0.35em] font-bold">{language === 'vi' ? 'Khám phá' : 'Explore'}</span>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 sm:mb-12 md:mb-16 gap-4">
            <div data-aos="fade-right" className="w-full md:w-auto">
              <h2
                className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-2 sm:mb-3"
                style={{
                  background: 'linear-gradient(135deg, #1a1a2e 0%, #2c2c4a 50%, #1a1a2e 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {t('home.categoriesTitle')}
              </h2>
              <p className="text-gray-500 text-base sm:text-lg font-medium">{t('home.categoriesSub')}</p>
            </div>
            <Link to="/products" className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 rounded-full bg-white border-2 border-[#d4af37]/30 text-[#1a1a2e] font-bold text-sm sm:text-base hover:bg-gradient-to-r hover:from-[#d4af37] hover:to-[#e8c468] hover:text-white hover:border-[#d4af37] hover:shadow-lg hover:shadow-[#d4af37]/30 transition-all duration-300 hover:-translate-y-1 group" data-aos="fade-left">
              <span className="font-bold">{t('home.viewAllCategories')}</span>
              <span className="material-symbols-outlined text-lg sm:text-xl group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 grid-rows-[auto] md:grid-rows-2 gap-4 sm:gap-6 lg:h-[600px]">
            {categories.map((cat, index) => {
              const dbImageUrl = cat.imageUrl || cat.image || cat.image_url;
              const categoryImage = dbImageUrl ? getImageUrl(dbImageUrl) : null;

              let fallbackImage = "/images/thuonghieu.jpg";
              let fallbackSubtitle = "";
              const catNameStr = cat.name.toLowerCase();

              if (catNameStr.includes('quần') || catNameStr.includes('pants') || catNameStr.includes('jeans')) {
                fallbackImage = "/images/quandai.jpg";
                fallbackSubtitle = t('home.fallbackSubtitle.pants');
              } else if (catNameStr.includes('áo') || catNameStr.includes('hoodie') || catNameStr.includes('shirt') || catNameStr.includes('jacket')) {
                fallbackImage = "/images/aovahoodi.jpg";
                fallbackSubtitle = t('home.fallbackSubtitle.jackets');
              } else if (catNameStr.includes('váy') || catNameStr.includes('đầm') || catNameStr.includes('dress')) {
                fallbackImage = "/images/vayvadam.jpg";
                fallbackSubtitle = t('home.fallbackSubtitle.dresses');
              } else if (catNameStr.includes('phụ kiện') || catNameStr.includes('accessories') || catNameStr.includes('bag') || catNameStr.includes('belt')) {
                fallbackImage = "/images/thuonghieu.jpg";
                fallbackSubtitle = t('home.fallbackSubtitle.accessories');
              }

              const displayCatImage = categoryImage || fallbackImage;

              // Bento Box Grid Logic:
              // Index 0: Large (2x2) on Desktop
              // Index 1: Tall (1x2) on Desktop
              // Index 2, 3: Small (1x1) on Desktop
              let gridClasses = "h-64 sm:h-80 md:h-full";
              if (index === 0) gridClasses = "md:col-span-2 md:row-span-2 h-72 sm:h-96 md:h-full";
              else if (index === 1) gridClasses = "md:col-span-1 md:row-span-2 h-64 sm:h-80 md:h-full";
              else gridClasses = "md:col-span-1 md:row-span-1 h-64 sm:h-72 md:h-full";

              const titleClass = index === 0 ? "text-3xl sm:text-4xl lg:text-5xl" : "text-xl sm:text-2xl";

              return (
                <Link to="/products" state={{ categoryId: cat.id }} key={cat.id || index} className={`${gridClasses} relative group overflow-hidden rounded-3xl block hover-lift shadow-lg shadow-[#1a1a2e]/10 hover:shadow-2xl hover:shadow-[#d4af37]/20 transition-all duration-500 border-2 border-[#d4af37]/15 hover:border-[#d4af37]/50`} data-aos="fade-up" data-aos-delay={index * 100}>
                  <div className="absolute inset-0 bg-[#1a1a2e] opacity-0 group-hover:opacity-20 transition-opacity duration-500 z-10"></div>
                  <img className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt={translateCategoryName(cat.name)} src={displayCatImage} loading="lazy" onError={(e) => { e.target.onerror = null; e.target.src = fallbackImage; }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex flex-col justify-end p-6 sm:p-8 transition-all duration-500 z-20">
                    <div className="transform transition-transform duration-500 group-hover:-translate-y-2">
                      <h3 className={`text-white font-black ${titleClass} mb-1 tracking-tight`}>{translateCategoryName(cat.name)}</h3>
                      {fallbackSubtitle && <p className="text-white/80 text-sm sm:text-base font-medium mb-3">{fallbackSubtitle}</p>}
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#d4af37] to-[#e8c468] text-[#1a1a2e] rounded-full text-xs sm:text-sm font-black opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-4 group-hover:translate-y-0 shadow-lg shadow-[#d4af37]/40">
                        <span>{t('home.explore')}</span>
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Brand Showcase - Premium Logo Strip (Marquee) */}
        <section className="py-16 sm:py-20 md:py-24 lg:py-28 px-4 sm:px-6 md:px-8 lg:px-12 max-w-screen-2xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 sm:mb-14 gap-4">
            <div data-aos="fade-right" className="max-w-2xl">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-12 h-[2px] bg-gradient-to-r from-[#d4af37] to-[#e8c468] rounded-full"></span>
                <span className="text-[#d4af37] uppercase text-xs tracking-[0.35em] font-bold">{t('home.premiumLabel')}</span>
              </div>
              <h2
                className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-3"
                style={{
                  background: 'linear-gradient(135deg, #1a1a2e 0%, #2c2c4a 50%, #1a1a2e 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {t('home.premiumBrandsTitle')}
              </h2>
              <p className="text-gray-500 text-base sm:text-lg font-medium leading-relaxed">{t('home.premiumBrandsSub')}</p>
            </div>
            <Link to="/brand" className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 rounded-full bg-white border-2 border-[#d4af37]/30 text-[#1a1a2e] font-bold text-sm sm:text-base hover:bg-gradient-to-r hover:from-[#d4af37] hover:to-[#e8c468] hover:text-white hover:border-[#d4af37] hover:shadow-lg hover:shadow-[#d4af37]/30 transition-all duration-300 hover:-translate-y-1 group" data-aos="fade-left">
              <span className="font-bold uppercase tracking-widest text-xs sm:text-sm">{language === 'vi' ? 'Xem tất cả thương hiệu' : 'View All Brands'}</span>
              <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </Link>
          </div>

          {(() => {
            const LOGO_MAP = {
              'gucci': { logo: '/images/LOGOgucci.png', tier: 'couture', tagline: { vi: 'Sang trọng vượt thời gian', en: 'Timeless luxury' } },
              'adidas': { logo: '/images/LOGOadidas.png', tier: 'sport', tagline: { vi: 'Năng động hiện đại', en: 'Modern sporty' } },
              'h&m': { logo: '/images/LOGOhm.jpg', tier: 'street', tagline: { vi: 'Phong cách bình dân', en: 'Accessible style' } },
              'hm': { logo: '/images/LOGOhm.jpg', tier: 'street', tagline: { vi: 'Phong cách bình dân', en: 'Accessible style' } },
              'nike': { logo: '/images/LOGOnike.png', tier: 'sport', tagline: { vi: 'Đẳng cấp thể thao', en: 'Athletic excellence' } },
              'uniqlo': { logo: '/images/LOGOuniqlo.png', tier: 'minimal', tagline: { vi: 'Tối giản tinh tế', en: 'Minimal & refined' } },
              'zara': { logo: '/images/LOGOzara.png', tier: 'street', tagline: { vi: 'Xu hướng thời thượng', en: 'Trendy chic' } },
            };

            const allBrands = brandData.hasTierInfo
              ? [...(brandData.premium || []), ...(brandData.mainstream || [])]
              : (brandData.fallback || []);

            const enriched = allBrands.map((b) => {
              const key = String(b.name || '').toLowerCase().trim();
              const info = LOGO_MAP[key] || {};
              const tierKey = (b.tier || info.tier || 'street').toLowerCase();
              return {
                name: b.name,
                logo: b.logo_url || b.logo || info.logo || null,
                tier: tierKey,
                tagline: info.tagline || { vi: 'Thương hiệu nổi bật', en: 'Featured label' },
                description: b.description || '',
              };
            });

            if (enriched.length === 0) {
              return (
                <div className="p-10 text-center text-sm text-gray-400 rounded-2xl border border-dashed border-gray-200 bg-white/60">
                  {t('home.noBrandData')}
                </div>
              );
            }

            const renderCard = (brand) => {
              const tierBadge = {
                couture: { label: language === 'vi' ? 'Couture' : 'Couture', classes: 'bg-amber-50 text-amber-700 border-amber-200' },
                luxury: { label: language === 'vi' ? 'Luxury' : 'Luxury', classes: 'bg-amber-50 text-amber-700 border-amber-200' },
                sport: { label: language === 'vi' ? 'Sport' : 'Sport', classes: 'bg-blue-50 text-blue-700 border-blue-200' },
                street: { label: language === 'vi' ? 'Street' : 'Street', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                minimal: { label: language === 'vi' ? 'Minimal' : 'Minimal', classes: 'bg-slate-50 text-slate-700 border-slate-200' },
              }[brand.tier] || { label: language === 'vi' ? 'Premium' : 'Premium', classes: 'bg-amber-50 text-amber-700 border-amber-200' };

              return (
                <Link
                  to={`/products?brand=${encodeURIComponent(brand.name)}`}
                  key={brand.name}
                  className="group relative w-[300px] sm:w-[320px] shrink-0"
                >
                  <div className="h-full bg-white rounded-2xl border-2 border-gray-100 hover:border-[#d4af37]/50 hover:shadow-2xl hover:shadow-[#d4af37]/15 transition-all duration-500 hover:-translate-y-2 overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#d4af37]/10 to-transparent rounded-bl-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="p-6 sm:p-7 flex flex-col items-center text-center h-full">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] uppercase tracking-[0.2em] font-bold border ${tierBadge.classes} mb-5`}>
                        {tierBadge.label}
                      </span>
                      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-[#fafaf7] to-white border border-gray-100 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-500 shadow-sm group-hover:shadow-md">
                        {brand.logo ? (
                          <img src={brand.logo} alt={brand.name} className="w-full h-full object-contain p-3" loading="lazy" />
                        ) : (
                          <span className="text-3xl font-black text-[#1a1a2e]">{String(brand.name || '?').charAt(0)}</span>
                        )}
                      </div>
                      <h3 className="font-extrabold text-[#1a1a2e] text-lg sm:text-xl mb-1">{brand.name}</h3>
                      <p className="text-xs sm:text-sm text-gray-500 font-medium">{brand.tagline[language] || brand.tagline.vi}</p>
                      <div className="mt-auto pt-4 inline-flex items-center gap-1.5 text-[#1a1a2e] group-hover:text-[#d4af37] transition-colors text-[11px] uppercase tracking-[0.2em] font-bold">
                        <span>{t('home.brandExplore')}</span>
                        <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            };

            // Nhân mảng 4 lần để tạo hiệu ứng marquee dài hơn, ít lặp lại hơn
            const longList = enriched.length > 0 ? [...enriched, ...enriched, ...enriched, ...enriched] : [];

            return (
              <div className="relative" data-aos="fade-up">
                <div className="w-full overflow-hidden" style={{ maskImage: 'linear-gradient(to right, transparent, black 20px, black calc(100% - 20px), transparent)' }}>
                  <div className="flex w-max animate-scroll hover:[animation-play-state:paused]">
                    {longList.map((brand, index) => (
                      <div key={`${brand.name}-${index}`} className="px-4">
                        {renderCard(brand)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </section>

        {/* Lookbook / Featured Collections - Pull users deeper into content */}
        <section className="py-16 sm:py-20 md:py-24 lg:py-28 px-4 sm:px-6 md:px-8 lg:px-12 max-w-screen-2xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 sm:mb-14 gap-4" data-aos="fade-right">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="w-12 h-[2px] bg-gradient-to-r from-[#d4af37] to-[#e8c468] rounded-full"></span>
                <span className="text-[#d4af37] uppercase text-xs tracking-[0.35em] font-bold">{language === 'vi' ? 'Cảm hứng' : 'Lookbook'}</span>
              </div>
              <h2
                className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-3"
                style={{
                  background: 'linear-gradient(135deg, #1a1a2e 0%, #2c2c4a 50%, #1a1a2e 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {language === 'vi' ? 'Bộ sưu tập được yêu thích' : 'Featured Collections'}
              </h2>
              <p className="text-gray-500 text-base sm:text-lg font-medium">
                {language === 'vi' ? 'Những câu chuyện thời trang qua từng bộ sưu tập theo mùa' : 'Style stories crafted through every seasonal edit'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {/* Card 1 */}
            <Link to="/products" className="group relative rounded-3xl overflow-hidden h-[320px] sm:h-[400px] md:h-[450px] block shadow-lg hover:shadow-2xl transition-all duration-500" data-aos="fade-up">
              <img src="/images/BSTTHUDONG.jpg" alt="Thu Đông" className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" loading="lazy" onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&q=80'; }} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent"></div>
              <div className="absolute inset-0 p-8 sm:p-10 flex flex-col justify-end">
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#d4af37]/90 text-[#1a1a2e] text-[10px] uppercase tracking-[0.25em] font-black w-fit mb-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1a1a2e]"></span>
                  {language === 'vi' ? 'Bộ sưu tập' : 'Collection'} 01
                </span>
                <h3 className="text-white text-2xl sm:text-3xl lg:text-4xl font-black mb-2 leading-tight">
                  {language === 'vi' ? 'Thu Đông 2026' : 'Fall / Winter 2026'}
                </h3>
                <p className="text-white/80 text-sm sm:text-base font-medium mb-5 max-w-md">
                  {language === 'vi' ? 'Hơi thở đương đại trong từng lớp vải — gam màu trầm ấm và đường cắt tinh tế.' : 'A modern take on seasonal layering — warm tones with refined tailoring.'}
                </p>
                <div className="inline-flex items-center gap-2 text-[#d4af37] font-bold text-sm uppercase tracking-widest group-hover:gap-3 transition-all">
                  <span>{language === 'vi' ? 'Khám phá ngay' : 'Explore Now'}</span>
                  <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </div>
              </div>
            </Link>

            {/* Card 2 */}
            <Link to="/products" className="group relative rounded-3xl overflow-hidden h-[320px] sm:h-[400px] md:h-[450px] block shadow-lg hover:shadow-2xl transition-all duration-500" data-aos="fade-up" data-aos-delay="100">
              <img src="/images/BSTDISAN.jpg" alt="Di sản" className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" loading="lazy" onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200&q=80'; }} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent"></div>
              <div className="absolute inset-0 p-8 sm:p-10 flex flex-col justify-end">
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#d4af37]/90 text-[#1a1a2e] text-[10px] uppercase tracking-[0.25em] font-black w-fit mb-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1a1a2e]"></span>
                  {language === 'vi' ? 'Bộ sưu tập' : 'Collection'} 02
                </span>
                <h3 className="text-white text-2xl sm:text-3xl lg:text-4xl font-black mb-2 leading-tight">
                  {language === 'vi' ? 'Di sản & Á Đông' : 'Heritage & East Meets West'}
                </h3>
                <p className="text-white/80 text-sm sm:text-base font-medium mb-5 max-w-md">
                  {language === 'vi' ? 'Hơi thở truyền thống được tái hiện qua chất liệu và họa tiết đương đại.' : 'Traditional motifs reinterpreted through contemporary fabrics and silhouettes.'}
                </p>
                <div className="inline-flex items-center gap-2 text-[#d4af37] font-bold text-sm uppercase tracking-widest group-hover:gap-3 transition-all">
                  <span>{language === 'vi' ? 'Khám phá ngay' : 'Explore Now'}</span>
                  <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </div>
              </div>
            </Link>
          </div>
        </section>

        {/* Why Choose Us - Removed here, replaced by inline promises below */}


        {/* New Arrivals - Enhanced Minimalist */}
        <section className="py-16 sm:py-20 md:py-24 bg-gradient-to-br from-[#fafaf7] via-white to-[#fffbf0] relative overflow-hidden">
          {/* Decorative gold line at top */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-[1px] bg-gradient-to-r from-transparent via-[#d4af37] to-transparent"></div>
          <div className="px-4 sm:px-6 md:px-8 lg:px-12 max-w-screen-2xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-end mb-12 sm:mb-16 gap-6" data-aos="fade-up">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-12 h-[2px] bg-gradient-to-r from-[#d4af37] to-[#e8c468] rounded-full"></span>
                  <span className="text-[#d4af37] uppercase text-xs tracking-[0.35em] font-bold">{language === 'vi' ? 'Mới về' : 'Just Arrived'}</span>
                </div>
                <h2
                  className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-4"
                  style={{
                    background: 'linear-gradient(135deg, #1a1a2e 0%, #2c2c4a 50%, #1a1a2e 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {t('home.newArrivalsTitle')}
                </h2>
                <p className="text-gray-500 text-base sm:text-lg max-w-xl font-medium">{t('home.newArrivalsSub')}</p>
              </div>
              <Link to="/products" className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 rounded-full bg-white border-2 border-[#d4af37]/30 text-[#1a1a2e] font-bold text-sm sm:text-base hover:bg-gradient-to-r hover:from-[#d4af37] hover:to-[#e8c468] hover:text-white hover:border-[#d4af37] hover:shadow-lg hover:shadow-[#d4af37]/30 transition-all duration-300 hover:-translate-y-1 group">
                <span className="uppercase tracking-widest text-sm">{t('home.viewAll') || 'View All'}</span>
                <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
              {products.map((product, index) => {
                const displayImage = getImageUrl(product.imageUrl || product.image || product.image_url) || "https://via.placeholder.com/300x400?text=No+Image";

                return (
                  <div key={product.id || index} className="h-full" data-aos="fade-up" data-aos-delay={index * 100}>
                    <Link to={`/product/${product.id || index}`} className="group block h-full">
                      <div className="bg-white hover-lift relative h-full flex flex-col transition-all duration-500 rounded-2xl p-2 hover:bg-gradient-to-br hover:from-[#fffbf0]/40 hover:to-white">
                        <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-gray-50 border-2 border-gray-100 group-hover:border-[#d4af37]/40 transition-colors">
                          <img className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105" alt={product.name} src={displayImage} loading="lazy" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                          {/* Quick Actions */}
                          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 w-[90%] z-10">
                            <button
                              type="button"
                              aria-label={`Thêm ${translateProductName(product.name)} vào giỏ hàng`}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                addToCart({ ...product, quantity: 1 });
                              }}
                              className="flex-1 bg-gradient-to-r from-[#1a1a2e] to-[#2c2c4a] text-[#d4af37] py-3 rounded-xl font-bold text-sm shadow-lg hover:from-[#d4af37] hover:to-[#e8c468] hover:text-[#1a1a2e] transition-all duration-300 flex items-center justify-center gap-2 border border-[#d4af37]/30"
                            >
                              <span className="material-symbols-outlined text-lg">shopping_cart</span>
                              <span>{t('products.addToCart')}</span>
                            </button>
                          </div>

                          {isNewProduct(product) && (
                            <div className="absolute top-4 left-4 bg-gradient-to-r from-[#d4af37] to-[#e8c468] text-[#1a1a2e] px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] shadow-md rounded-sm">
                              {t('products.newBadge')}
                            </div>
                          )}
                        </div>
                        <div className="pt-4 pb-2 flex flex-col flex-1 px-1">
                          <p className="text-[10px] uppercase tracking-widest text-[#d4af37] font-bold mb-1">
                            {product.brand && product.brand !== 'No Brand' ? product.brand : 'Aura K'}
                          </p>
                          <h3 className="font-bold text-[#1a1a2e] mb-3 truncate text-base group-hover:text-[#1a1a2e] transition-colors">{translateProductName(product.name)}</h3>
                          <div className="flex flex-col mt-auto gap-2">
                            <p
                              className="text-lg font-black"
                              style={{
                                background: 'linear-gradient(135deg, #1a1a2e 0%, #2c2c4a 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                              }}
                            >{formatPrice(product.price)}</p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-0.5">
                                {Array.from({ length: 5 }, (_, i) => {
                                  const ratingValue = Number(product.rating || product.average_rating || product.avg_rating || product.stars || 4.8);
                                  const active = i < Math.round(ratingValue);
                                  return (
                                    <span
                                      key={i}
                                      className={`material-symbols-outlined text-[14px] ${active ? 'text-[#d4af37]' : 'text-gray-200'}`}
                                      style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
                                    >
                                      star
                                    </span>
                                  );
                                })}
                              </div>
                              <span className="text-[11px] uppercase tracking-[0.18em] text-gray-400 font-bold">
                                {(Number(product.total_sold || product.sold || product.sold_count || product.units_sold || 120)).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US')} {t('common.sold')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Best Sellers - Horizontal scroll carousel */}
        {bestSellers.length > 0 && (
          <section className="py-12 sm:py-16 md:py-20 bg-gradient-to-br from-[#fffbf0]/60 via-white to-[#fafaf7] relative overflow-hidden">
            <div className="px-4 sm:px-6 md:px-8 lg:px-12 max-w-screen-2xl mx-auto">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 sm:mb-12 gap-4" data-aos="fade-up">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="w-12 h-[2px] bg-gradient-to-r from-[#d4af37] to-[#e8c468] rounded-full"></span>
                    <span className="text-[#d4af37] uppercase text-xs tracking-[0.35em] font-bold flex items-center gap-2">
                      <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                      {language === 'vi' ? 'Bán chạy nhất' : 'Top Sellers'}
                    </span>
                  </div>
                  <h2
                    className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-3"
                    style={{
                      background: 'linear-gradient(135deg, #1a1a2e 0%, #2c2c4a 50%, #1a1a2e 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    {language === 'vi' ? 'Được yêu thích nhất tuần qua' : 'Most loved this week'}
                  </h2>
                  <p className="text-gray-500 text-base sm:text-lg font-medium">
                    {language === 'vi' ? 'Những sản phẩm được khách hàng lựa chọn và đánh giá cao nhất' : 'Top-rated pieces our customers cannot stop wearing'}
                  </p>
                </div>
                <Link to="/products" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white border-2 border-[#d4af37]/30 text-[#1a1a2e] font-bold text-sm hover:bg-gradient-to-r hover:from-[#d4af37] hover:to-[#e8c468] hover:text-white hover:border-[#d4af37] hover:shadow-lg hover:shadow-[#d4af37]/30 transition-all duration-300 hover:-translate-y-1 group">
                  <span className="uppercase tracking-widest text-xs">{t('home.viewAll') || 'View All'}</span>
                  <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </Link>
              </div>

              <div className="relative -mx-4 sm:-mx-6 md:-mx-8 lg:-mx-12 px-4 sm:px-6 md:px-8 lg:px-12 overflow-x-auto pb-6 snap-x snap-mandatory scroll-smooth" style={{ scrollbarWidth: 'thin', scrollbarColor: '#d4af37 transparent' }}>
                <div className="flex gap-5 sm:gap-6">
                  {bestSellers.map((product, index) => {
                    const displayImage = getImageUrl(product.imageUrl || product.image || product.image_url) || "https://via.placeholder.com/300x400?text=No+Image";
                    const sold = Number(product.total_sold || product.sold || product.sold_count || product.units_sold || 0);
                    return (
                      <div key={`best-${product.id || index}`} className="shrink-0 w-[240px] sm:w-[260px] snap-start" data-aos="fade-up" data-aos-delay={index * 80}>
                        <Link to={`/product/${product.id || index}`} className="group block h-full">
                          <div className="bg-white relative h-full flex flex-col transition-all duration-500 rounded-2xl p-2 hover:bg-gradient-to-br hover:from-[#fffbf0]/40 hover:to-white hover:-translate-y-2 hover:shadow-2xl hover:shadow-[#d4af37]/15">
                            <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-gray-50 border-2 border-gray-100 group-hover:border-[#d4af37]/40 transition-colors">
                              <img className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105" alt={product.name} src={displayImage} loading="lazy" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                              <div className="absolute top-3 left-3 bg-gradient-to-r from-[#d4af37] to-[#e8c468] text-[#1a1a2e] px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] shadow-md rounded-full flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                                #{index + 1}
                              </div>
                              {sold > 0 && (
                                <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
                                  {sold.toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US')} {language === 'vi' ? 'đã bán' : 'sold'}
                                </div>
                              )}
                            </div>
                            <div className="pt-4 pb-2 flex flex-col flex-1 px-1">
                              <p className="text-[10px] uppercase tracking-widest text-[#d4af37] font-bold mb-1 truncate">
                                {product.brand && product.brand !== 'No Brand' ? product.brand : 'Aura K'}
                              </p>
                              <h3 className="font-bold text-[#1a1a2e] mb-2 truncate text-sm group-hover:text-[#1a1a2e] transition-colors">{translateProductName(product.name)}</h3>
                              <p className="text-base font-black mt-auto" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #2c2c4a 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                                {formatPrice(product.price)}
                              </p>
                            </div>
                          </div>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Why Choose Us - Stats + Reasons Strip */}
        <section className="py-16 sm:py-20 md:py-24 bg-gradient-to-br from-[#0a0e27] via-[#111640] to-[#0d1130] text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#d4af37]/10 rounded-full blur-[140px] -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#d4af37]/8 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/3 pointer-events-none"></div>

          <div className="px-4 sm:px-6 md:px-8 lg:px-12 max-w-screen-2xl mx-auto relative z-10">
            <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16" data-aos="fade-up">
              <div className="inline-flex items-center gap-2 mb-4 justify-center">
                <span className="w-10 h-[2px] bg-gradient-to-r from-transparent to-[#d4af37] rounded-full"></span>
                <span className="text-[#d4af37] uppercase text-xs tracking-[0.35em] font-bold">{language === 'vi' ? 'Vì sao chọn Aura K' : 'Why Aura K'}</span>
                <span className="w-10 h-[2px] bg-gradient-to-l from-transparent to-[#d4af37] rounded-full"></span>
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-4 leading-tight">
                {language === 'vi' ? 'Hơn cả một cửa hàng — đó là ' : 'More than a store — a '}
                <span style={{ background: 'linear-gradient(135deg, #d4af37 0%, #e8c468 50%, #d4af37 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  {language === 'vi' ? 'trải nghiệm' : 'curated experience'}
                </span>
              </h2>
              <p className="text-white/60 text-base sm:text-lg font-medium leading-relaxed">
                {language === 'vi'
                  ? 'Chúng tôi tuyển chọn từng sản phẩm, chăm chút từng đơn hàng và đồng hành cùng bạn trên hành trình khẳng định phong cách.'
                  : 'We curate each piece, polish every order, and stand beside you as you define your signature style.'}
              </p>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8 mb-12 sm:mb-16" data-aos="fade-up" data-aos-delay="100">
              {[
                { num: '120K+', label_vi: 'Khách hàng thân thiết', label_en: 'Happy customers' },
                { num: '4.9/5', label_vi: 'Đánh giá trung bình', label_en: 'Average rating' },
                { num: '250+', label_vi: 'Thương hiệu đối tác', label_en: 'Partner brands' },
                { num: '24h', label_vi: 'Giao hàng nội thành', label_en: 'Inner-city delivery' },
              ].map((stat, idx) => (
                <div key={idx} className="text-center p-6 sm:p-8 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm hover:border-[#d4af37]/40 hover:bg-white/[0.06] transition-all duration-500">
                  <div className="text-3xl sm:text-4xl md:text-5xl font-black mb-2" style={{ background: 'linear-gradient(135deg, #d4af37 0%, #e8c468 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                    {stat.num}
                  </div>
                  <div className="text-white/70 text-xs sm:text-sm font-bold uppercase tracking-widest">
                    {language === 'vi' ? stat.label_vi : stat.label_en}
                  </div>
                </div>
              ))}
            </div>

            {/* Reasons grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8" data-aos="fade-up" data-aos-delay="200">
              <FeatureItem icon="verified_user" title={t('home.feature1Title')} description={t('home.feature1Desc')} delay="0" dark />
              <FeatureItem icon="local_shipping" title={t('home.feature2Title')} description={t('home.feature2Desc')} delay="150" dark />
              <FeatureItem icon="auto_awesome" title={t('home.feature3Title')} description={t('home.feature3Desc')} delay="300" dark />
            </div>
          </div>
        </section>

        {/* Testimonials - Social proof */}
        <section className="py-16 sm:py-20 md:py-24 lg:py-28 px-4 sm:px-6 md:px-8 lg:px-12 max-w-screen-2xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 sm:mb-14 gap-4" data-aos="fade-right">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-12 h-[2px] bg-gradient-to-r from-[#d4af37] to-[#e8c468] rounded-full"></span>
                <span className="text-[#d4af37] uppercase text-xs tracking-[0.35em] font-bold">{language === 'vi' ? 'Cảm nhận khách hàng' : 'Voices of Aura K'}</span>
              </div>
              <h2
                className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-3"
                style={{
                  background: 'linear-gradient(135deg, #1a1a2e 0%, #2c2c4a 50%, #1a1a2e 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {language === 'vi' ? 'Câu chuyện từ khách hàng' : 'Real stories, real style'}
              </h2>
              <p className="text-gray-500 text-base sm:text-lg font-medium leading-relaxed">
                {language === 'vi'
                  ? 'Hơn 120.000 khách hàng đã tin tưởng Aura K — đây là những chia sẻ chân thực nhất.'
                  : 'Trusted by 120K+ customers — here is what they have to say about us.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {[
              {
                name: 'An Vo',
                avatar: '/images/AnVo.png',
                role_vi: 'Fashionista • TP. HCM',
                role_en: 'Fashionista • HCMC',
                quote_vi: 'Chất lượng vải thực sự khác biệt — form dáng chuẩn và đóng gói sang trọng. Mỗi đơn hàng đều như một món quà.',
                quote_en: 'The fabric quality is genuinely different — perfect tailoring and luxury packaging. Each order feels like a gift.',
              },
              {
                name: 'Linh Tran',
                avatar: '/images/LinhTran.png',
                role_vi: 'Content Creator • Hà Nội',
                role_en: 'Content Creator • Hanoi',
                quote_vi: 'Aura K là nơi tôi tìm thấy phong cách của riêng mình — đa dạng, cập nhật và luôn chỉn chu trong từng chi tiết.',
                quote_en: 'Aura K is where I found my own style — diverse, on-trend and polished in every detail.',
              },
              {
                name: 'Minh Le',
                avatar: '/images/MinhLe.png',
                role_vi: 'Doanh nhân • Đà Nẵng',
                role_en: 'Entrepreneur • Da Nang',
                quote_vi: 'Dịch vụ chăm sóc khách hàng cực kỳ chuyên nghiệp. Tư vấn size chuẩn, đổi trả dễ dàng và giao hàng nhanh chóng.',
                quote_en: 'Top-tier customer service. Accurate size advice, easy returns and lightning-fast delivery.',
              },
            ].map((test, idx) => (
              <div
                key={idx}
                className="bg-white p-7 sm:p-8 rounded-3xl border-2 border-gray-100 hover:border-[#d4af37]/40 hover:shadow-2xl hover:shadow-[#d4af37]/15 transition-all duration-500 hover:-translate-y-2 relative overflow-hidden group"
                data-aos="fade-up"
                data-aos-delay={idx * 100}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#d4af37]/10 to-transparent rounded-bl-[3rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <span className="material-symbols-outlined text-[#d4af37] text-4xl mb-4" style={{ fontVariationSettings: "'FILL' 1" }}>format_quote</span>
                <p className="text-gray-700 text-sm sm:text-base leading-relaxed mb-6 font-medium">
                  "{language === 'vi' ? test.quote_vi : test.quote_en}"
                </p>
                <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden bg-gradient-to-br from-[#1a1a2e] to-[#2c2c4a] flex items-center justify-center shrink-0 border-2 border-[#d4af37]/20">
                    <img
                      src={test.avatar}
                      alt={test.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; e.target.parentElement.innerHTML = `<span class="text-white text-lg font-black">${test.name.charAt(0)}</span>`; }}
                    />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-extrabold text-[#1a1a2e] text-sm sm:text-base truncate">{test.name}</h4>
                    <p className="text-xs text-gray-500 font-medium truncate">{language === 'vi' ? test.role_vi : test.role_en}</p>
                  </div>
                  <div className="ml-auto flex gap-0.5 shrink-0">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className="material-symbols-outlined text-[#d4af37] text-base" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Instagram Feed / Community Gallery */}
        <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 lg:px-12 max-w-screen-2xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12" data-aos="fade-up">
            <div className="inline-flex items-center gap-2 mb-3 justify-center">
              <span className="w-10 h-[2px] bg-gradient-to-r from-transparent to-[#d4af37] rounded-full"></span>
              <span className="text-[#d4af37] uppercase text-xs tracking-[0.35em] font-bold">@aurak.fashion</span>
              <span className="w-10 h-[2px] bg-gradient-to-l from-transparent to-[#d4af37] rounded-full"></span>
            </div>
            <h2
              className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-3"
              style={{
                background: 'linear-gradient(135deg, #1a1a2e 0%, #2c2c4a 50%, #1a1a2e 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {language === 'vi' ? 'Cộng đồng Aura K' : 'The Aura K Community'}
            </h2>
            <p className="text-gray-500 text-base sm:text-lg font-medium">
              {language === 'vi' ? 'Khám phá phong cách từ hàng nghìn khách hàng — gắn thẻ #AuraKVibes để có cơ hội lên feed chính thức.' : 'Discover how our community styles their Aura K pieces — tag #AuraKVibes for a chance to be featured.'}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {[
              { src: '/images/BSTTHUDONG.jpg', alt_vi: 'BST Thu Đông' },
              { src: '/images/BSTDISAN.jpg', alt_vi: 'BST Di sản' },
              { src: '/images/AnVo.png', alt_vi: 'An Vo' },
              { src: '/images/LinhTran.png', alt_vi: 'Linh Tran' },
              { src: '/images/MinhLe.png', alt_vi: 'Minh Le' },
              { src: '/images/BSTTHUDONG.jpg', alt_vi: 'BST Thu Đông 02' },
            ].map((item, idx) => (
              <a
                key={idx}
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="group relative aspect-square overflow-hidden rounded-2xl border-2 border-transparent hover:border-[#d4af37]/60 transition-all duration-500"
                data-aos="zoom-in"
                data-aos-delay={idx * 80}
              >
                <img
                  src={item.src}
                  alt={item.alt_vi}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  loading="lazy"
                  onError={(e) => { e.target.onerror = null; e.target.src = `https://picsum.photos/seed/aurak${idx}/400/400`; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col items-center justify-center gap-2 text-white">
                  <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                  <span className="text-xs font-bold uppercase tracking-widest">{language === 'vi' ? 'Yêu thích' : 'Liked'}</span>
                </div>
                <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-sm text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
                </div>
              </a>
            ))}
          </div>

          <div className="text-center mt-8" data-aos="fade-up">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white border-2 border-[#d4af37]/30 text-[#1a1a2e] font-bold text-sm hover:bg-gradient-to-r hover:from-[#d4af37] hover:to-[#e8c468] hover:text-white hover:border-[#d4af37] hover:shadow-lg hover:shadow-[#d4af37]/30 transition-all duration-300 hover:-translate-y-1 group"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
              <span>{language === 'vi' ? 'Theo dõi trên Instagram' : 'Follow on Instagram'}</span>
            </a>
          </div>
        </section>

        {/* Newsletter / Community Section - Luxury Split Layout */}
        <section className="py-16 sm:py-24 bg-gradient-to-br from-[#fafaf7] via-white to-[#fffbf0]">
          <div className="px-4 sm:px-6 md:px-8 lg:px-12 max-w-screen-xl mx-auto">
            <div className="flex flex-col lg:flex-row bg-gradient-to-br from-white via-[#fffbf0] to-[#fef3d3]/40 rounded-[2rem] overflow-hidden border-2 border-[#d4af37]/20 shadow-2xl shadow-[#d4af37]/10 relative">
              <div className="lg:w-1/2 min-h-[300px] lg:min-h-full relative overflow-hidden hidden md:block">
                <img src="/images/bannerthuonghieu.jpg" alt="Newsletter lifestyle" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e]/40 via-[#1a1a2e]/20 to-transparent"></div>
                {/* Decorative gold accent */}
                <div className="absolute top-8 left-8 bg-gradient-to-r from-[#1a1a2e] to-[#2c2c4a] backdrop-blur-md px-4 py-2 rounded-full border border-[#d4af37]/30">
                  <span className="text-[#d4af37] text-xs font-bold uppercase tracking-[0.2em]">{language === 'vi' ? 'Độc quyền' : 'Exclusive'}</span>
                </div>
              </div>
              <div className="lg:w-1/2 p-8 sm:p-12 md:p-16 flex flex-col justify-center text-center lg:text-left relative" data-aos="fade-up">
                <div className="inline-flex items-center gap-2 mb-4 mx-auto lg:mx-0">
                  <span className="w-12 h-[2px] bg-gradient-to-r from-[#d4af37] to-[#e8c468]"></span>
                  <span className="text-[#d4af37] uppercase text-xs tracking-[0.35em] font-bold">Newsletter</span>
                </div>
                <div className="w-16 h-16 sm:w-20 sm:h-20 mb-4 sm:mb-6 bg-gradient-to-br from-[#1a1a2e] to-[#2c2c4a] rounded-2xl flex items-center justify-center mx-auto lg:mx-0 border-2 border-[#d4af37]/40 shadow-lg shadow-[#d4af37]/20">
                  <span className="material-symbols-outlined text-3xl sm:text-4xl text-[#d4af37]">mail</span>
                </div>
                <h2
                  className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight mb-4"
                  style={{
                    background: 'linear-gradient(135deg, #1a1a2e 0%, #2c2c4a 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {t('home.newsletterTitle')}
                </h2>
                <p className="text-gray-600 mb-8 sm:mb-10 leading-relaxed text-base font-medium max-w-md mx-auto lg:mx-0">{t('home.newsletterDesc')}</p>

                {!user ? (
                  <form className="flex flex-col gap-4" onSubmit={handleSubscribeClick}>
                    <input
                      className="w-full bg-white border-2 border-gray-200 text-[#1a1a2e] placeholder:text-gray-400 focus:border-[#d4af37] focus:ring-4 focus:ring-[#d4af37]/10 rounded-xl py-4 px-6 outline-none transition-all text-sm font-medium shadow-sm"
                      placeholder={t('home.newsletterPlaceholder')}
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      required
                    />
                    <button type="submit" className="w-full bg-gradient-to-r from-[#1a1a2e] to-[#2c2c4a] text-[#d4af37] py-4 font-bold rounded-xl hover:from-[#d4af37] hover:to-[#e8c468] hover:text-[#1a1a2e] transition-all duration-300 transform hover:-translate-y-1 shadow-lg hover:shadow-[#d4af37]/40 text-sm tracking-widest uppercase border border-[#d4af37]/30">
                      {t('home.newsletterBtn')}
                    </button>
                  </form>
                ) : (
                  <div className="bg-gradient-to-br from-white to-[#fffbf0] py-5 px-6 rounded-xl border-2 border-[#d4af37]/30 shadow-md">
                    <div className="w-12 h-12 mx-auto lg:mx-0 bg-gradient-to-br from-[#1a1a2e] to-[#2c2c4a] rounded-xl flex items-center justify-center mb-3 border border-[#d4af37]/40">
                      <span className="material-symbols-outlined text-[#d4af37] text-2xl">verified</span>
                    </div>
                    <p className="text-[#1a1a2e] font-bold text-sm">
                      {language === 'vi'
                        ? 'Cảm ơn bạn đã trở thành một phần của Aura K!'
                        : 'Thank you for becoming a part of Aura K!'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

const FeatureItem = ({ icon, title, description, delay, dark = false }) => {
  const containerClass = dark
    ? 'flex flex-col items-start p-6 sm:p-8 bg-white/[0.04] border-2 border-white/10 rounded-2xl hover:border-[#d4af37]/40 hover:bg-white/[0.07] hover:shadow-2xl hover:shadow-[#d4af37]/15 transition-all duration-500 group hover:-translate-y-1 relative overflow-hidden'
    : 'flex flex-col items-start p-6 sm:p-8 bg-white border-2 border-gray-100 rounded-2xl hover:border-[#d4af37]/40 hover:shadow-xl hover:shadow-[#d4af37]/10 transition-all duration-300 group hover:-translate-y-1 relative overflow-hidden';

  const iconBoxClass = dark
    ? 'w-12 h-12 bg-white/5 text-[#d4af37] rounded-xl flex items-center justify-center mb-5 group-hover:bg-gradient-to-br group-hover:from-[#d4af37] group-hover:to-[#e8c468] group-hover:text-[#1a1a2e] transition-all duration-300 border border-[#d4af37]/20 group-hover:border-[#d4af37]/50 group-hover:scale-110'
    : 'w-12 h-12 bg-gradient-to-br from-[#fffbf0] to-[#fef3d3] text-[#1a1a2e] rounded-xl flex items-center justify-center mb-5 group-hover:bg-gradient-to-br group-hover:from-[#1a1a2e] group-hover:to-[#2c2c4a] group-hover:text-[#d4af37] transition-all duration-300 border border-[#d4af37]/20 group-hover:border-[#d4af37]/50 group-hover:scale-110';

  const titleClass = dark ? 'text-lg font-bold mb-2 text-white' : 'text-lg font-bold mb-2 text-[#1a1a2e]';
  const descClass = dark ? 'text-white/60 leading-relaxed text-sm font-medium' : 'text-gray-500 leading-relaxed text-sm font-medium';

  return (
    <div className={containerClass} data-aos="fade-up" data-aos-delay={delay}>
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#d4af37]/5 to-transparent rounded-bl-[3rem] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      <div className={iconBoxClass}>
        <span className="material-symbols-outlined text-2xl">{icon}</span>
      </div>
      <h3 className={titleClass}>{title}</h3>
      <p className={descClass}>{description}</p>
    </div>
  );
};

export default Home;
