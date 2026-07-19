import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const AccountSidebar = () => {
  const { user, logout } = useContext(AuthContext);
  const { t, language } = useLanguage();
  const location = useLocation();
  const currentPath = location.pathname;

  // Hàm hỗ trợ để tự động đổi class CSS nếu đường dẫn trùng với URL hiện tại
  const getLinkClass = (path) => {
    const isActive = currentPath === path;
    return isActive
      ? "flex items-center gap-3 px-4 py-3 text-primary font-bold bg-white rounded-md shadow-sm transition-transform duration-200 active:scale-98"
      : "flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:text-primary hover:translate-x-1 transition-transform duration-200";
  };

  // Hàm hỗ trợ in đậm Icon (fill icon) khi active
  const getIconStyle = (path) => {
    return currentPath === path ? { fontVariationSettings: "'FILL' 1" } : {};
  };

  return (
    <aside className="flex flex-col w-full md:w-64 min-h-fit p-6 gap-4 bg-surface-container-lowest rounded-md shadow-sm border border-outline-variant/10">
      <div className="flex flex-col items-center mb-8 gap-3">
        <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-primary-fixed bg-surface-container-highest">
          <img
            alt="User profile picture"
            className="w-full h-full object-cover"
            src={user?.avatar_url || "https://lh3.googleusercontent.com/aida-public/AB6AXuDUuzCBs7zYnVh2TgG5jQRjnX4oU6ENsaUWp64nviD4Vknp_skOEPHBjpSFVG4-p0o7DwYMb1J6DtwHi064E2IegXhTFhnPUvSNJPbNtV__5TALB0TUWM_DMdNEUR0C3GoJ0xr0BL2gBtWOYNaHx8dX8czbPRDT7-fjS8VTA-BVDnHXr6gIGCA7EfFyCwBkZYRw0RJfN2G4HftkQE5kNSSeI64xP97Vauxz_Y6MfK0UiWqsgNt5XVHqFIETtPJAngYJLUbR6XmTD4s"} 
          />
        </div>
        <div className="text-center">
          <h3 className="font-headline font-bold text-lg text-primary uppercase">
            {user?.first_name 
              ? (language === 'vi' ? `${user.last_name || ''} ${user.first_name}`.trim() : `${user.first_name} ${user.last_name || ''}`.trim()) 
              : user?.username || (language === 'vi' ? 'Khách hàng' : 'Customer')
            }
          </h3>
          <p className="text-xs text-on-surface-variant font-medium uppercase tracking-widest mt-1">
             {user?.role === 'admin' 
               ? (language === 'vi' ? 'Quản trị viên' : 'Admin') 
               : user?.role === 'staff' 
                 ? (language === 'vi' ? 'Nhân viên' : 'Staff') 
                 : (language === 'vi' ? 'Thành viên' : 'Member')
             }
          </p>
        </div>
      </div>
      
      <nav className="flex flex-col gap-2">
        <Link className={getLinkClass('/account')} to="/account">
          <span className="material-symbols-outlined" style={getIconStyle('/account')}>person</span>
          <span>{t('account.profile')}</span>
        </Link>
        <Link className={getLinkClass('/orders')} to="/orders">
          <span className="material-symbols-outlined" style={getIconStyle('/orders')}>package</span>
          <span>{language === 'vi' ? 'Đơn hàng' : 'Orders'}</span>
        </Link>
        <Link className={getLinkClass('/addresses')} to="/addresses">
          <span className="material-symbols-outlined" style={getIconStyle('/addresses')}>location_on</span>
          <span>{language === 'vi' ? 'Địa chỉ' : 'Addresses'}</span>
        </Link>
        <Link className={getLinkClass('/vouchers')} to="/vouchers">
          <span className="material-symbols-outlined" style={getIconStyle('/vouchers')}>confirmation_number</span>
          <span>{language === 'vi' ? 'Kho Voucher' : 'Vouchers'}</span>
        </Link>
        
        <div className="h-px bg-surface-container-high my-4"></div>
        <button onClick={logout} className="flex w-full items-center gap-3 px-4 py-3 text-on-surface-variant hover:text-error hover:translate-x-1 transition-transform duration-200">
          <span className="material-symbols-outlined">logout</span>
          <span>{language === 'vi' ? 'Đăng xuất' : 'Logout'}</span>
        </button>
      </nav>
    </aside>
  );
};

export default AccountSidebar;