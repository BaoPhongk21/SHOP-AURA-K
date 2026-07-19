import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

const Footer = () => {
  const { t, language } = useLanguage();

  const socialLinks = [
    { name: 'Facebook', icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
    )},
    { name: 'Instagram', icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
    )},
    { name: 'TikTok', icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005.8 20.1a6.34 6.34 0 0010.86-4.43V8.93a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1.84-.36z"/></svg>
    )},
    { name: 'YouTube', icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
    )}
  ];

  return (
    <footer className="w-full bg-gradient-to-br from-[#0a0e27] via-[#111638] to-[#0d1130] text-white relative overflow-hidden">
      {/* Decorative gold glows */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-[#d4af37]/10 to-transparent rounded-full blur-[140px] -translate-y-1/3 translate-x-1/4 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-[#d4af37]/8 to-transparent rounded-full blur-[120px] translate-y-1/2 -translate-x-1/3 pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.05) 0%, transparent 70%)' }}></div>

      {/* Gold top border */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#d4af37]/50 to-transparent"></div>

      <div className="relative z-10 max-w-screen-2xl mx-auto px-6 sm:px-8 lg:px-12 py-16">
        {/* Brand + Tagline Row */}
        <div className="mb-12 pb-10 relative">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-[#d4af37]/30 to-transparent"></div>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h2 className="font-headline text-3xl md:text-4xl font-black tracking-tight mb-2">
                <span className="bg-gradient-to-r from-[#d4af37] via-[#e8c468] to-[#d4af37] bg-clip-text text-transparent">
                  AURA.K
                </span>
              </h2>
              <p className="text-white/60 text-sm md:text-base font-medium max-w-md leading-relaxed">
                {language === 'vi' 
                  ? 'Định nghĩa phong cách thời trang cao cấp — nơi sự tinh tế gặp gỡ bản sắc bền vững.' 
                  : 'Redefining luxury fashion — where elegance meets sustainable identity.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href="#"
                  aria-label={social.name}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 border border-[#d4af37]/20 text-white/70 hover:bg-gradient-to-br hover:from-[#d4af37] hover:to-[#e8c468] hover:text-[#1a1a2e] hover:border-[#d4af37] transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-[#d4af37]/30"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Explore Column */}
          <div>
            <h3 className="text-[11px] uppercase tracking-[0.3em] font-bold text-[#d4af37] mb-5 flex items-center gap-2">
              <span className="w-6 h-px bg-gradient-to-r from-[#d4af37] to-transparent"></span>
              {t('footer.explore')}
            </h3>
            <ul className="space-y-3">
              <li><Link to="/products" className="text-sm text-white/70 hover:text-[#d4af37] hover:translate-x-1 inline-flex items-center gap-1 transition-all duration-300">
                <span className="w-1 h-1 rounded-full bg-[#d4af37]/60"></span>
                {t('footer.collections')}
              </Link></li>
              <li><Link to="/products" className="text-sm text-white/70 hover:text-[#d4af37] hover:translate-x-1 inline-flex items-center gap-1 transition-all duration-300">
                <span className="w-1 h-1 rounded-full bg-[#d4af37]/60"></span>
                {t('footer.newArrivals')}
              </Link></li>
              <li><Link to="/products" className="text-sm text-white/70 hover:text-[#d4af37] hover:translate-x-1 inline-flex items-center gap-1 transition-all duration-300">
                <span className="w-1 h-1 rounded-full bg-[#d4af37]/60"></span>
                {t('footer.men')}
              </Link></li>
              <li><Link to="/products" className="text-sm text-white/70 hover:text-[#d4af37] hover:translate-x-1 inline-flex items-center gap-1 transition-all duration-300">
                <span className="w-1 h-1 rounded-full bg-[#d4af37]/60"></span>
                {t('footer.women')}
              </Link></li>
              <li><Link to="/brand" className="text-sm text-white/70 hover:text-[#d4af37] hover:translate-x-1 inline-flex items-center gap-1 transition-all duration-300">
                <span className="w-1 h-1 rounded-full bg-[#d4af37]/60"></span>
                {t('nav.brand')}
              </Link></li>
              <li><Link to="/offers" className="text-sm text-white/70 hover:text-[#d4af37] hover:translate-x-1 inline-flex items-center gap-1 transition-all duration-300">
                <span className="w-1 h-1 rounded-full bg-[#d4af37]/60"></span>
                {t('nav.offers')}
              </Link></li>
            </ul>
          </div>

          {/* Support Column */}
          <div>
            <h3 className="text-[11px] uppercase tracking-[0.3em] font-bold text-[#d4af37] mb-5 flex items-center gap-2">
              <span className="w-6 h-px bg-gradient-to-r from-[#d4af37] to-transparent"></span>
              {t('footer.support')}
            </h3>
            <ul className="space-y-3">
              <li><Link to="/contact" className="text-sm text-white/70 hover:text-[#d4af37] hover:translate-x-1 inline-flex items-center gap-1 transition-all duration-300">
                <span className="w-1 h-1 rounded-full bg-[#d4af37]/60"></span>
                {t('footer.contact')}
              </Link></li>
              <li><Link to="/orders" className="text-sm text-white/70 hover:text-[#d4af37] hover:translate-x-1 inline-flex items-center gap-1 transition-all duration-300">
                <span className="w-1 h-1 rounded-full bg-[#d4af37]/60"></span>
                {language === 'vi' ? 'Theo dõi đơn hàng' : 'Track Order'}
              </Link></li>
              <li><Link to="/vouchers" className="text-sm text-white/70 hover:text-[#d4af37] hover:translate-x-1 inline-flex items-center gap-1 transition-all duration-300">
                <span className="w-1 h-1 rounded-full bg-[#d4af37]/60"></span>
                {language === 'vi' ? 'Mã giảm giá' : 'Vouchers'}
              </Link></li>
              <li><a href="#" className="text-sm text-white/70 hover:text-[#d4af37] hover:translate-x-1 inline-flex items-center gap-1 transition-all duration-300">
                <span className="w-1 h-1 rounded-full bg-[#d4af37]/60"></span>
                {t('footer.stores')}
              </a></li>
              <li><a href="#" className="text-sm text-white/70 hover:text-[#d4af37] hover:translate-x-1 inline-flex items-center gap-1 transition-all duration-300">
                <span className="w-1 h-1 rounded-full bg-[#d4af37]/60"></span>
                {t('footer.privacy')}
              </a></li>
              <li><a href="#" className="text-sm text-white/70 hover:text-[#d4af37] hover:translate-x-1 inline-flex items-center gap-1 transition-all duration-300">
                <span className="w-1 h-1 rounded-full bg-[#d4af37]/60"></span>
                {t('footer.terms')}
              </a></li>
            </ul>
          </div>

          {/* Newsletter Column */}
          <div className="lg:col-span-2">
            <h3 className="text-[11px] uppercase tracking-[0.3em] font-bold text-[#d4af37] mb-5 flex items-center gap-2">
              <span className="w-6 h-px bg-gradient-to-r from-[#d4af37] to-transparent"></span>
              {language === 'vi' ? 'Liên hệ' : 'Get In Touch'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-[#d4af37]/30 transition-all duration-300">
                <span className="material-symbols-outlined text-[#d4af37] text-lg shrink-0 mt-0.5">location_on</span>
                <span className="text-sm text-white/70 leading-relaxed">
                  {language === 'vi' ? '285 CMT8, Quận 10, TP.HCM' : '285 CMT8, District 10, HCMC'}
                </span>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-[#d4af37]/30 transition-all duration-300">
                <span className="material-symbols-outlined text-[#d4af37] text-lg shrink-0 mt-0.5">call</span>
                <div className="text-sm">
                  <p className="text-white/50 text-[10px] uppercase tracking-wider font-bold mb-0.5">Hotline</p>
                  <a href="tel:19001001" className="text-white/90 hover:text-[#d4af37] font-bold transition-colors">1900 1001</a>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-[#d4af37]/30 transition-all duration-300">
                <span className="material-symbols-outlined text-[#d4af37] text-lg shrink-0 mt-0.5">mail</span>
                <div className="text-sm">
                  <p className="text-white/50 text-[10px] uppercase tracking-wider font-bold mb-0.5">Email</p>
                  <a href="mailto:contact@aurak.vn" className="text-white/90 hover:text-[#d4af37] transition-colors">contact@aurak.vn</a>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-[#d4af37]/30 transition-all duration-300">
                <span className="material-symbols-outlined text-[#d4af37] text-lg shrink-0 mt-0.5">schedule</span>
                <div className="text-sm">
                  <p className="text-white/50 text-[10px] uppercase tracking-wider font-bold mb-0.5">{language === 'vi' ? 'Giờ mở cửa' : 'Opening'}</p>
                  <span className="text-white/90">{language === 'vi' ? '09:00 - 21:00' : '09:00 - 21:00'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Partners / Sponsors */}
        <div className="pt-10 border-t border-[#d4af37]/15 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-px bg-gradient-to-r from-transparent via-[#d4af37]/50 to-transparent"></div>
          <div className="text-center mb-6">
            <span className="inline-flex items-center gap-3 text-[10px] uppercase tracking-[0.4em] font-bold text-[#d4af37]/80">
              <span className="w-8 h-px bg-gradient-to-r from-transparent to-[#d4af37]/50"></span>
              {t('footer.partners')}
              <span className="w-8 h-px bg-gradient-to-l from-transparent to-[#d4af37]/50"></span>
            </span>
          </div>
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4 text-white/80 font-headline font-semibold text-sm sm:text-base tracking-[0.25em]">
            {['NIKE', 'ADIDAS', 'ZARA', 'UNIQLO', 'H&M', 'GUCCI'].map((partner) => (
              <span
                key={partner}
                className="rounded-full border border-[#d4af37]/15 bg-gradient-to-r from-white/[0.03] to-white/[0.06] px-4 sm:px-5 py-2 transition-all duration-300 hover:-translate-y-0.5 hover:bg-gradient-to-r hover:from-[#d4af37]/10 hover:to-[#e8c468]/10 hover:border-[#d4af37]/50 hover:text-[#d4af37] cursor-default hover:shadow-lg hover:shadow-[#d4af37]/20"
              >
                {partner}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 mt-10 border-t border-[#d4af37]/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[11px] text-white/40 uppercase tracking-widest text-center md:text-left">
            {t('footer.rights')}
          </p>
          <div className="flex items-center gap-4 text-[11px] text-white/50 uppercase tracking-wider">
            <span className="inline-flex items-center gap-1.5 hover:text-[#d4af37] transition-colors cursor-default">
              <span className="material-symbols-outlined text-sm text-[#d4af37]">verified</span>
              {language === 'vi' ? 'Thanh toán an toàn' : 'Secure Payment'}
            </span>
            <span className="w-1 h-1 rounded-full bg-[#d4af37]/40"></span>
            <span className="inline-flex items-center gap-1.5 hover:text-[#d4af37] transition-colors cursor-default">
              <span className="material-symbols-outlined text-sm text-[#d4af37]">local_shipping</span>
              {language === 'vi' ? 'Giao hàng toàn quốc' : 'Nationwide Delivery'}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
