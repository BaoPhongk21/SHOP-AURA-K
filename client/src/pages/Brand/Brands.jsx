import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../components/Footer';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { useLanguage } from '../../context/LanguageContext';
import { getImageUrl } from '../Register/api.config';

const FadeInSection = ({ children }) => {
  const [isVisible, setVisible] = useState(false);
  const domRef = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (domRef.current) observer.unobserve(domRef.current);
        }
      });
    }, { threshold: 0.1 });

    if (domRef.current) observer.observe(domRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={domRef}
      className={`transition-all duration-1000 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
    >
      {children}
    </div>
  );
};

const Brand = () => {
  const { language } = useLanguage();
  const vi = language === 'vi';

  useEffect(() => {
    window.scrollTo(0, 0);
    AOS.init({ duration: 800, once: true, easing: 'ease-out-cubic', offset: 50 });
  }, []);

  const brandList = [
    { name: 'Uniqlo', src: '/images/LOGOuniqlo.png', desc_vi: 'Logo đơn giản và hiện đại cho phong cách thường nhật.', desc_en: 'A modern and minimal logo for everyday style.' },
    { name: 'Adidas', src: '/images/LOGOadidas.png', desc_vi: 'Biểu tượng ba sọc mang đến phong cách thể thao biểu tượng.', desc_en: 'The three stripes symbolises iconic sportswear.' },
    { name: 'Nike', src: '/images/LOGOnike.png', desc_vi: 'Swoosh năng động, biểu tượng của chuyển động.', desc_en: 'The dynamic swoosh symbolising motion.' },
    { name: 'Zara', src: '/images/LOGOzara.png', desc_vi: 'Logo thanh lịch, biểu trưng cho thời trang hiện đại.', desc_en: 'A chic mark representing modern fashion.' },
    { name: 'H&M', src: '/images/LOGOhm.jpg', desc_vi: 'Logo đỏ nổi bật, biểu hiệu của thời trang dễ tiếp cận.', desc_en: 'A bold red mark for accessible fashion.' },
    { name: 'Gucci', src: '/images/LOGOgucci.png', desc_vi: 'Logo cao cấp, biểu tượng của sự xa xỉ.', desc_en: 'A premium logo that represents luxury.' },
  ];

  const teamList = [
    { name: 'An Vo', role_vi: 'Chuyên gia chất liệu', role_en: 'Fabric Specialist', img: '/images/AnVo.png' },
    { name: 'Minh Le', role_vi: 'Nghệ nhân hoàn thiện', role_en: 'Finishing Artisan', img: '/images/MinhLe.png' },
    { name: 'Linh Tran', role_vi: 'Trưởng bộ phận thiết kế', role_en: 'Head of Design', img: '/images/LinhTran.png' },
  ];

  const values = [
    {
      icon: 'verified',
      title_vi: 'Chất lượng', title_en: 'Quality',
      desc_vi: 'Cam kết sử dụng những nguồn nguyên liệu thượng hạng nhất, được tuyển chọn khắt khe từ các nhà cung ứng uy tín toàn cầu.',
      desc_en: 'Committed to using the finest raw materials, rigorously selected from reputable global suppliers.',
      gradient: 'from-[#d4af37]/20 to-[#e8c468]/10',
      iconColor: 'text-[#1a1a2e]',
      iconBg: 'bg-gradient-to-br from-[#d4af37] to-[#e8c468]',
    },
    {
      icon: 'lightbulb',
      title_vi: 'Sáng tạo', title_en: 'Innovation',
      desc_vi: 'Không ngừng thử nghiệm những phom dáng mới, kết hợp giữa tính ứng dụng cao và ngôn ngữ thời trang đương đại.',
      desc_en: 'Constantly experimenting with new silhouettes, blending high utility with contemporary fashion language.',
      gradient: 'from-blue-50 to-indigo-50',
      iconColor: 'text-white',
      iconBg: 'bg-gradient-to-br from-[#1a1a2e] to-[#2c2c4a]',
    },
    {
      icon: 'nature',
      title_vi: 'Trách nhiệm', title_en: 'Responsibility',
      desc_vi: 'Hành trình thời trang xanh với quy trình sản xuất công bằng, hướng tới mục tiêu giảm thiểu rác thải thời trang.',
      desc_en: 'A green fashion journey with fair trade practices, aiming to minimize textile waste.',
      gradient: 'from-emerald-50 to-teal-50',
      iconColor: 'text-white',
      iconBg: 'bg-gradient-to-br from-emerald-600 to-teal-700',
    },
  ];

  return (
    <div className="bg-[#fafaf7] text-gray-900 antialiased min-h-screen flex flex-col">
      <style>
        {`
          @keyframes scroll {
            from { transform: translateX(0); }
            to { transform: translateX(-50%); }
          }
          .animate-scroll {
            animation: scroll 60s linear infinite;
          }
        `}
      </style>
      <main className="pt-20 flex-grow">
        {/* Hero */}
        <section className="relative h-[520px] md:h-[620px] lg:h-[700px] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img
              src="/images/bannerthuonghieu.jpg"
              alt="Brand story hero"
              className="w-full h-full object-cover scale-105 transition-transform duration-[10s] hover:scale-110"
              loading="eager"
              onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1600&q=80'; }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-transparent"></div>
          </div>
          <div className="relative z-10 text-center max-w-4xl px-6 sm:px-8" data-aos="fade-up">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#1a1a2e]/80 to-[#2c2c4a]/80 backdrop-blur-md text-[#d4af37] text-xs sm:text-sm font-bold tracking-[0.2em] uppercase mb-6 border border-[#d4af37]/30">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37] animate-pulse"></span>
              {vi ? 'Câu chuyện của chúng tôi' : 'Our Story'}
            </span>
            <h1
              className="text-5xl md:text-7xl lg:text-8xl font-black font-headline mb-6 tracking-tighter"
              style={{ background: 'linear-gradient(135deg, #ffffff 0%, #d4af37 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
            >
              Aura K
            </h1>
            <p className="text-base md:text-xl lg:text-2xl font-light text-white/90 leading-[1.6] tracking-[-0.01em] mb-10 max-w-2xl mx-auto">
              {vi
                ? 'Nơi sự tinh tế gặp gỡ bản sắc bền vững. Chúng tôi không chỉ tạo ra trang phục, chúng tôi kiến tạo phong cách sống.'
                : 'Where elegance meets sustainable identity. We do not just make garments, we curate a lifestyle.'}
            </p>
            <Link
              to="/products"
              onClick={() => window.scrollTo(0, 0)}
              className="inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-[#d4af37] to-[#e8c468] text-[#1a1a2e] font-black rounded-full text-sm uppercase tracking-widest hover:shadow-2xl hover:shadow-[#d4af37]/40 hover:-translate-y-1 transition-all duration-300"
            >
              <span>{vi ? 'Khám phá ngay' : 'Explore Now'}</span>
              <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
          </div>
        </section>

        {/* Brand Story */}
        <FadeInSection>
          <section className="py-20 sm:py-24 md:py-32 px-4 sm:px-6 md:px-8 lg:px-12 max-w-screen-2xl mx-auto">
            <div className="grid md:grid-cols-2 gap-10 lg:gap-20 items-center">
              <div className="order-2 md:order-1 relative group">
                <div className="absolute -inset-4 bg-gradient-to-br from-[#d4af37]/20 to-[#e8c468]/10 rounded-3xl transition-transform group-hover:scale-105"></div>
                <img
                  alt={vi ? 'Câu chuyện của Aura K' : 'Aura K Story'}
                  className="relative rounded-3xl w-full h-[500px] md:h-[600px] object-cover shadow-2xl shadow-[#d4af37]/15"
                  src="/images/thuonghieu.jpg"
                  loading="lazy"
                  onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200&q=80'; }}
                />
                <div className="absolute -bottom-6 -right-6 bg-gradient-to-br from-[#1a1a2e] to-[#2c2c4a] text-white rounded-2xl px-6 py-4 shadow-2xl">
                  <p className="text-[#d4af37] text-[10px] uppercase tracking-widest font-black mb-1">{vi ? 'Thành lập' : 'Since'}</p>
                  <p className="text-2xl font-black">2026</p>
                </div>
              </div>
              <div className="order-1 md:order-2 space-y-6">
                <div className="flex items-center gap-3">
                  <span className="w-12 h-[2px] bg-gradient-to-r from-[#d4af37] to-[#e8c468] rounded-full"></span>
                  <span className="text-[#d4af37] uppercase text-xs tracking-[0.35em] font-bold">{vi ? 'Câu chuyện thương hiệu' : 'Brand Story'}</span>
                </div>
                <h2
                  className="text-3xl sm:text-4xl md:text-5xl font-black font-headline leading-tight tracking-tight"
                  style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #2c2c4a 50%, #1a1a2e 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
                >
                  {vi ? 'Tinh tế trong từng điểm chạm' : 'Exquisite in every detail'}
                </h2>
                <div className="space-y-4 text-gray-600 leading-[1.7] tracking-[-0.01em] text-base sm:text-lg">
                  <p>
                    {vi
                      ? 'Khởi nguồn từ niềm đam mê với vẻ đẹp tối giản, Aura K ra đời với sứ mệnh định nghĩa lại sự sang trọng trong thời đại mới: Sang trọng không cần phô trương, mà nằm ở chất liệu và sự bền bỉ.'
                      : 'Originating from a passion for minimalist aesthetics, Aura K redefines luxury in the modern era: Luxury needs no pretense; it lives in materials and longevity.'}
                  </p>
                  <p>
                    {vi
                      ? 'Mỗi thiết kế tại Aura K là sự kết tinh của tư duy hiện đại và kỹ nghệ thủ công tỉ mỉ. Chúng tôi ưu tiên các loại sợi tự nhiên, quy trình sản xuất ít tác động đến môi trường để đảm bảo rằng vẻ đẹp bạn mang trên mình cũng chính là sự trân trọng đối với hành tinh.'
                      : 'Each Aura K design is the crystallization of modern thinking and meticulous craftsmanship. We prioritize natural fibers and low-impact production so what you wear also honors our planet.'}
                  </p>
                </div>
                <div className="pt-4 relative pl-6 border-l-2 border-[#d4af37]">
                  <p className="italic font-medium text-base sm:text-lg" style={{ color: '#1a1a2e' }}>
                    {vi ? '"Chúng tôi tin rằng sự bền vững chính là hình thái cao nhất của sự xa xỉ."' : '"We believe sustainability is the ultimate form of luxury."'}
                  </p>
                </div>
              </div>
            </div>
          </section>
        </FadeInSection>

        {/* Brands We Carry */}
        <FadeInSection>
          <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 lg:px-12 max-w-screen-2xl mx-auto">
            <div className="text-center mb-12 sm:mb-16" data-aos="fade-up">
              <div className="inline-flex items-center gap-2 mb-3 justify-center">
                <span className="w-10 h-[2px] bg-gradient-to-r from-transparent to-[#d4af37] rounded-full"></span>
                <span className="text-[#d4af37] uppercase text-xs tracking-[0.35em] font-bold">{vi ? 'Đối tác' : 'Partners'}</span>
                <span className="w-10 h-[2px] bg-gradient-to-l from-transparent to-[#d4af37] rounded-full"></span>
              </div>
              <h2
                className="text-3xl sm:text-4xl md:text-5xl font-black mb-3 font-headline tracking-tight"
                style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #2c2c4a 50%, #1a1a2e 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
              >
                {vi ? 'Thương hiệu tiêu biểu' : 'Brands We Carry'}
              </h2>
              <p className="text-gray-500 text-base sm:text-lg max-w-2xl mx-auto font-medium">
                {vi
                  ? 'Logo và biểu tượng định danh từ những đối tác hàng đầu, thể hiện phong cách và độ tin cậy.'
                  : 'Logos and brand marks from leading partners, reflecting style and trusted quality.'}
              </p>
            </div>
            <div className="w-full overflow-hidden" style={{ maskImage: 'linear-gradient(to right, transparent, black 20px, black calc(100% - 20px), transparent)' }}>
              <div className="flex w-max animate-scroll hover:[animation-play-state:paused]">
                {[...brandList, ...brandList].map((brand, idx) => (
                  <div key={`${brand.name}-${idx}`} className="px-3 w-80 sm:w-96 shrink-0">
                    <Link
                      to={`/products?brand=${encodeURIComponent(brand.name)}`}
                      className="group bg-white rounded-3xl border-2 border-gray-100 hover:border-[#d4af37]/50 shadow-sm hover:shadow-2xl hover:shadow-[#d4af37]/15 transition-all duration-500 hover:-translate-y-2 overflow-hidden block h-full"
                    >
                      <div className="h-44 sm:h-48 bg-gradient-to-br from-[#fafaf7] via-white to-[#fffbf0] flex items-center justify-center p-6 relative overflow-hidden">
                        <div className="absolute top-3 right-3 bg-[#d4af37]/15 text-[#d4af37] px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                          {vi ? 'Xem' : 'View'}
                        </div>
                        <img
                          alt={`${brand.name} logo`}
                          className="max-h-full max-w-[80%] object-contain transition-transform duration-500 group-hover:scale-110"
                          src={getImageUrl(brand.src)}
                          loading="lazy"
                          onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(brand.name)}&background=1a1a2e&color=d4af37&size=200&bold=true&font-size=0.4`; }}
                        />
                      </div>
                      <div className="p-6">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="w-6 h-[2px] bg-gradient-to-r from-[#d4af37] to-[#e8c468] rounded-full"></span>
                          <span className="text-[10px] uppercase tracking-widest text-[#d4af37] font-black">{vi ? 'Đối tác' : 'Partner'}</span>
                        </div>
                        <h4 className="text-xl font-black text-[#1a1a2e] mb-2 group-hover:text-[#d4af37] transition-colors">{brand.name}</h4>
                        <p className="text-sm text-gray-500 leading-relaxed">{vi ? brand.desc_vi : brand.desc_en}</p>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </FadeInSection>

        {/* Core Values */}
        <FadeInSection>
          <section className="py-20 sm:py-24 md:py-28 px-4 sm:px-6 md:px-8 lg:px-12 bg-gradient-to-br from-[#fafaf7] via-white to-[#fffbf0] relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-[1px] bg-gradient-to-r from-transparent via-[#d4af37] to-transparent"></div>
            <div className="max-w-screen-2xl mx-auto">
              <div className="text-center mb-16 sm:mb-20" data-aos="fade-up">
                <div className="inline-flex items-center gap-2 mb-3 justify-center">
                  <span className="w-10 h-[2px] bg-gradient-to-r from-transparent to-[#d4af37] rounded-full"></span>
                  <span className="text-[#d4af37] uppercase text-xs tracking-[0.35em] font-bold">{vi ? 'Triết lý' : 'Philosophy'}</span>
                  <span className="w-10 h-[2px] bg-gradient-to-l from-transparent to-[#d4af37] rounded-full"></span>
                </div>
                <h2
                  className="text-3xl sm:text-4xl md:text-5xl font-black font-headline tracking-tight mb-4"
                  style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #2c2c4a 50%, #1a1a2e 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
                >
                  {vi ? 'Giá trị cốt lõi' : 'Core Values'}
                </h2>
                <p className="text-gray-500 text-base sm:text-lg max-w-xl mx-auto">
                  {vi ? 'Nền tảng vững chắc tạo nên sự khác biệt của Aura K' : 'The solid foundation that defines Aura K'}
                </p>
              </div>
              <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
                {values.map((v, i) => (
                  <div
                    key={i}
                    data-aos="fade-up"
                    data-aos-delay={i * 100}
                    className={`group relative bg-gradient-to-br ${v.gradient} p-10 lg:p-12 rounded-3xl border-2 border-transparent hover:border-[#d4af37]/40 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-[#d4af37]/15 overflow-hidden`}
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#d4af37]/10 to-transparent rounded-bl-[4rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className={`w-16 h-16 ${v.iconBg} rounded-2xl flex items-center justify-center mb-8 shadow-lg group-hover:scale-110 transition-transform duration-500`}>
                      <span className={`material-symbols-outlined ${v.iconColor} text-3xl`} style={{ fontVariationSettings: "'FILL' 1" }}>{v.icon}</span>
                    </div>
                    <h3 className="text-2xl font-black font-headline mb-4 text-[#1a1a2e]">
                      {vi ? v.title_vi : v.title_en}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {vi ? v.desc_vi : v.desc_en}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </FadeInSection>

        {/* Featured Collections */}
        <FadeInSection>
          <section className="py-20 sm:py-24 md:py-28 px-4 sm:px-6 md:px-8 lg:px-12 max-w-screen-2xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 sm:mb-16 gap-6" data-aos="fade-up">
              <div>
                <span className="inline-flex items-center gap-3 mb-3">
                  <span className="w-12 h-[2px] bg-gradient-to-r from-[#d4af37] to-[#e8c468] rounded-full"></span>
                  <span className="text-[#d4af37] uppercase text-xs tracking-[0.35em] font-bold">{vi ? 'Xu hướng mùa mới' : 'This season\'s edit'}</span>
                </span>
                <h2
                  className="text-3xl sm:text-4xl md:text-5xl font-black font-headline tracking-tight"
                  style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #2c2c4a 50%, #1a1a2e 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
                >
                  {vi ? 'Bộ sưu tập đặc trưng' : 'Signature Collections'}
                </h2>
              </div>
              <Link to="/products" onClick={() => window.scrollTo(0, 0)} className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white border-2 border-[#d4af37]/30 text-[#1a1a2e] font-bold text-sm hover:bg-gradient-to-r hover:from-[#d4af37] hover:to-[#e8c468] hover:text-white hover:border-[#d4af37] hover:shadow-lg hover:shadow-[#d4af37]/30 transition-all duration-300 hover:-translate-y-1 group">
                <span className="uppercase tracking-widest text-xs">{vi ? 'Khám phá bộ sưu tập' : 'Explore the edit'}</span>
                <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </Link>
            </div>
            <div className="grid md:grid-cols-2 gap-6 lg:gap-10">
              {[
                {
                  src: '/images/BSTTHUDONG.jpg',
                  title_vi: 'BST Thu Đông', title_en: 'Autumn-Winter Collection',
                  desc_vi: 'Áo khoác nhẹ, phom dáng thanh lịch và chất liệu giữ nhiệt tinh tế cho những ngày chuyển mùa.',
                  desc_en: 'Light layers, clean silhouettes, and refined warmth for the season ahead.',
                },
                {
                  src: '/images/BSTDISAN.jpg',
                  title_vi: 'BST Di sản', title_en: 'Heritage Collection',
                  desc_vi: 'Những trang phục trường tồn với thời gian, mang dấu ấn tối giản và giá trị bền vững.',
                  desc_en: 'Timeless pieces designed to last, with minimalist details and sustainable value.',
                },
              ].map((c, i) => (
                <Link
                  key={i}
                  to="/products"
                  onClick={() => window.scrollTo(0, 0)}
                  className="group cursor-pointer block"
                  data-aos="fade-up"
                  data-aos-delay={i * 100}
                >
                  <div className="relative overflow-hidden rounded-3xl aspect-[4/5] mb-6 shadow-lg hover:shadow-2xl transition-all duration-500 bg-gradient-to-br from-[#fafaf7] to-[#fffbf0] border-2 border-transparent group-hover:border-[#d4af37]/40">
                    <img
                      alt={vi ? c.title_vi : c.title_en}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      src={getImageUrl(c.src)}
                      loading="lazy"
                      onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=900&q=80'; }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="absolute bottom-5 right-5 bg-gradient-to-r from-[#d4af37] to-[#e8c468] text-[#1a1a2e] rounded-full p-3 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0 shadow-lg">
                      <span className="material-symbols-outlined">arrow_forward</span>
                    </div>
                  </div>
                  <h3
                    className="text-2xl sm:text-3xl font-black font-headline mb-3"
                    style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #2c2c4a 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
                  >
                    {vi ? c.title_vi : c.title_en}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">{vi ? c.desc_vi : c.desc_en}</p>
                </Link>
              ))}
            </div>
          </section>
        </FadeInSection>

        {/* Runway / Campaign Video Reel */}
        <FadeInSection>
          <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 lg:px-12 max-w-screen-2xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-center">
              {/* Vertical video */}
              <div className="relative max-w-md mx-auto md:mx-0" data-aos="fade-right">
                <div className="absolute -top-3 -left-3 w-12 h-12 border-t-2 border-l-2 border-[#d4af37] rounded-tl-xl z-30 pointer-events-none"></div>
                <div className="absolute -bottom-3 -right-3 w-12 h-12 border-b-2 border-r-2 border-[#d4af37] rounded-br-xl z-30 pointer-events-none"></div>
                <div className="relative aspect-[9/16] max-h-[640px] rounded-2xl overflow-hidden border-2 border-[#d4af37]/30 shadow-2xl shadow-[#d4af37]/15 bg-black">
                  <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    poster="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&q=80"
                    className="w-full h-full object-cover"
                  >
                    <source src="/videos/thuonghieu.mp4" type="video/mp4" />
                  </video>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none"></div>
                  <div className="absolute top-5 left-5 right-5 flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                    <span className="text-[10px] uppercase tracking-[0.3em] font-black text-[#d4af37]">{vi ? 'Sàn diễn' : 'Runway'}</span>
                  </div>
                  <div className="absolute bottom-6 left-6 right-6">
                    <p className="text-[#d4af37] text-[10px] uppercase tracking-[0.35em] font-bold mb-1">{vi ? 'Bộ sưu tập' : 'Collection'}</p>
                    <h3 className="text-white text-2xl sm:text-3xl font-black leading-tight">
                      {vi ? 'Thu Đông 2026' : 'FW 2026'}
                    </h3>
                    <p className="text-white/70 text-xs mt-1">{vi ? 'BST Di sản & Thu Đông — số lượng giới hạn' : 'Heritage & Fall-Winter — strictly limited'}</p>
                  </div>
                </div>
              </div>

              {/* Text content */}
              <div className="space-y-6" data-aos="fade-left">
                <div className="flex items-center gap-3">
                  <span className="w-12 h-[2px] bg-gradient-to-r from-[#d4af37] to-[#e8c468] rounded-full"></span>
                  <span className="text-[#d4af37] uppercase text-xs tracking-[0.35em] font-bold">{vi ? 'Reel & Lookbook' : 'Reel & Lookbook'}</span>
                </div>
                <h2
                  className="text-3xl sm:text-4xl md:text-5xl font-black font-headline tracking-tight leading-tight"
                  style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #2c2c4a 50%, #1a1a2e 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
                >
                  {vi ? 'Mỗi khuôn hình — Một câu chuyện' : 'Every Frame Tells A Story'}
                </h2>
                <p className="text-gray-600 text-base sm:text-lg leading-relaxed">
                  {vi
                    ? 'Đắm chìm trong những thước phim đầy cảm hứng ghi lại hành trình thiết kế, từ phác thảo ban đầu, chọn vải, thử form đến khoảnh khắc trình diễn trên sàn catwalk.'
                    : 'Immerse yourself in cinematic footage capturing the design journey — from initial sketches and fabric selection to that defining moment on the runway.'}
                </p>
                <ul className="space-y-3">
                  {[
                    vi ? 'Quy trình thiết kế thủ công' : 'Hand-crafted design process',
                    vi ? 'Vật liệu organic & bền vững' : 'Organic & sustainable materials',
                    vi ? 'Sàn diễn runway hậu trường' : 'Backstage runway moments',
                  ].map((line, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="mt-1 flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-[#d4af37] to-[#e8c468] flex items-center justify-center">
                        <span className="material-symbols-outlined text-[#1a1a2e] text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                      </span>
                      <span className="text-gray-700 text-sm sm:text-base font-medium">{line}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-3 pt-2">
                  <Link to="/products" onClick={() => window.scrollTo(0, 0)} className="inline-flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-[#1a1a2e] to-[#2c2c4a] text-[#d4af37] font-black rounded-full text-sm uppercase tracking-widest hover:from-[#d4af37] hover:to-[#e8c468] hover:text-[#1a1a2e] transition-all duration-300 hover:-translate-y-1 shadow-lg group">
                    <span>{vi ? 'Xem bộ sưu tập' : 'View Collection'}</span>
                    <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform">arrow_forward</span>
                  </Link>
                  <Link to="/offers" className="inline-flex items-center gap-2 px-7 py-3.5 bg-white border-2 border-[#d4af37]/30 text-[#1a1a2e] font-bold rounded-full text-sm uppercase tracking-widest hover:bg-[#fffbf0] hover:border-[#d4af37] transition-all duration-300 hover:-translate-y-1">
                    <span>{vi ? 'Ưu đãi thương hiệu' : 'Brand Offers'}</span>
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </FadeInSection>

        {/* Our Makers / Team */}
        <FadeInSection>
          <section className="py-20 sm:py-24 md:py-28 px-4 sm:px-6 md:px-8 lg:px-12 bg-gradient-to-br from-[#0a0e27] via-[#111640] to-[#0d1130] text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#d4af37]/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-[#d4af37]/8 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/3 pointer-events-none"></div>
            <div className="max-w-screen-2xl mx-auto relative z-10">
              <div className="text-center mb-12 sm:mb-16" data-aos="fade-up">
                <div className="inline-flex items-center gap-2 mb-3 justify-center">
                  <span className="w-10 h-[2px] bg-gradient-to-r from-transparent to-[#d4af37] rounded-full"></span>
                  <span className="text-[#d4af37] uppercase text-xs tracking-[0.35em] font-bold">{vi ? 'Đội ngũ' : 'The Makers'}</span>
                  <span className="w-10 h-[2px] bg-gradient-to-l from-transparent to-[#d4af37] rounded-full"></span>
                </div>
                <h2
                  className="text-3xl sm:text-4xl md:text-5xl font-black mb-3 font-headline tracking-tight"
                >
                  {vi ? 'Đội ngũ của chúng tôi' : 'Our Makers'}
                </h2>
                <p className="text-white/60 text-base sm:text-lg max-w-2xl mx-auto">
                  {vi
                    ? 'Những con người tạo nên từng sản phẩm, từ nhà thiết kế đến nghệ nhân hoàn thiện.'
                    : 'People behind every piece — from designers to artisans.'}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
                {teamList.map((m, i) => (
                  <div
                    key={i}
                    data-aos="fade-up"
                    data-aos-delay={i * 100}
                    className="group relative bg-white/[0.04] backdrop-blur-sm border-2 border-white/10 rounded-3xl p-6 text-center hover:border-[#d4af37]/50 hover:bg-white/[0.07] hover:shadow-2xl hover:shadow-[#d4af37]/15 transition-all duration-500 hover:-translate-y-2 overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#d4af37]/15 to-transparent rounded-bl-[3rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="w-32 h-32 mx-auto rounded-full overflow-hidden mb-5 border-2 border-[#d4af37]/30 group-hover:border-[#d4af37] group-hover:scale-105 transition-all duration-500 shadow-lg shadow-[#d4af37]/10">
                      <img
                        alt={m.name}
                        className="w-full h-full object-cover"
                        src={getImageUrl(m.img)}
                        loading="lazy"
                        onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=1a1a2e&color=d4af37&size=200&bold=true&font-size=0.4`; }}
                      />
                    </div>
                    <h4 className="font-black text-lg text-white mb-1">{m.name}</h4>
                    <p className="text-xs text-[#d4af37] uppercase tracking-widest font-bold mb-4">
                      {vi ? m.role_vi : m.role_en}
                    </p>
                    <div className="h-px bg-gradient-to-r from-transparent via-[#d4af37]/30 to-transparent mb-4"></div>
                    <p className="text-sm text-white/70 italic">
                      {vi
                        ? '"Niềm tin vào tay nghề và vật liệu bền vững."'
                        : '"Committed to craft and sustainable materials."'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </FadeInSection>
      </main>

      <Footer />
    </div>
  );
};

export default Brand;
