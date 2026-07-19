import React from 'react';

// ============================================================
// Card - Component card dùng chung cho toàn bộ Admin
// ============================================================
const Card = ({
  children,
  hover = false,
  className = '',
  padding = true,
  bordered = true,
  ...props
}) => {
  const baseStyles = 'bg-white rounded-2xl transition-all duration-300';
  const borderStyles = bordered ? 'border border-slate-200/80' : '';
  const paddingStyles = padding ? 'p-6' : '';
  const hoverStyles = hover
    ? 'hover:shadow-xl hover:-translate-y-1 hover:border-blue-300 cursor-pointer'
    : 'shadow-sm';

  return (
    <div className={`${baseStyles} ${borderStyles} ${paddingStyles} ${hoverStyles} ${className}`} {...props}>
      {children}
    </div>
  );
};

// ============================================================
// PageHeader - Tiêu đề trang admin với breadcrumbs
// ============================================================
export const PageHeader = ({
  title,
  subtitle,
  breadcrumbs = [],
  actions,
  icon,
  gradient = 'from-blue-600 to-indigo-700',
}) => {
  return (
    <div className="mb-6">
      {breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-2 font-semibold">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              <span className={idx === breadcrumbs.length - 1 ? 'text-blue-600' : ''}>{crumb}</span>
              {idx < breadcrumbs.length - 1 && (
                <span className="material-symbols-outlined text-[12px]">chevron_right</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {icon && (
            <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg shadow-blue-500/20`}>
              <span className="material-symbols-outlined text-2xl">{icon}</span>
            </div>
          )}
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{title}</h2>
            {subtitle && <p className="text-sm text-slate-500 mt-1 font-medium">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
      </div>
    </div>
  );
};

// ============================================================
// Loading - Component loading đẹp mắt
// ============================================================
export const Loading = ({ text = 'Đang tải...', size = 'md' }) => {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <div className={`${sizes[size]} relative`}>
        <div className="absolute inset-0 rounded-full border-4 border-slate-200"></div>
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 animate-spin"></div>
      </div>
      {text && <p className="text-sm text-slate-500 font-medium">{text}</p>}
    </div>
  );
};

// ============================================================
// EmptyState - Trạng thái rỗng
// ============================================================
export const EmptyState = ({ icon = 'inbox', title = 'Không có dữ liệu', description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
    <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400">
      <span className="material-symbols-outlined text-5xl">{icon}</span>
    </div>
    <div>
      <h3 className="text-base font-bold text-slate-700">{title}</h3>
      {description && <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">{description}</p>}
    </div>
    {action && <div className="mt-3">{action}</div>}
  </div>
);

// ============================================================
// Modal - Modal hiện đại (cải tiến)
// ============================================================
export const Modal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  size = 'md', // sm, md, lg, xl, full
  footer,
  icon,
  iconBg = 'from-blue-500 to-blue-700',
  closeOnOutsideClick = true,
}) => {
  if (!isOpen) return null;
  const sizeMap = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    full: 'max-w-[95vw] h-[90vh]',
  };
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && closeOnOutsideClick) onClose();
      }}
    >
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${sizeMap[size]} ${size === 'full' ? '' : 'max-h-[90vh]'} overflow-hidden flex flex-col animate-scale-in`}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              {icon && (
                <div className={`p-2 rounded-xl bg-gradient-to-br ${iconBg} text-white shadow-md`}>
                  <span className="material-symbols-outlined text-lg">{icon}</span>
                </div>
              )}
              <div>
                <h3 className="font-bold text-lg text-slate-900">{title}</h3>
                {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-full text-slate-500 hover:text-slate-900 transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto custom-scrollbar">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================
// Button - Nút bấm hiện đại
// ============================================================
export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading = false,
  className = '',
  ...props
}) => {
  const variants = {
    primary: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50',
    secondary: 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300',
    danger: 'bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white shadow-lg shadow-rose-500/30',
    success: 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/30',
    warning: 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/30',
    ghost: 'text-slate-700 hover:bg-slate-100',
    dark: 'bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/20',
  };
  const sizes = {
    xs: 'px-2.5 py-1 text-xs',
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-bold rounded-xl transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
      ) : (
        <>
          {icon && <span className="material-symbols-outlined text-base">{icon}</span>}
          {children}
          {iconRight && <span className="material-symbols-outlined text-base">{iconRight}</span>}
        </>
      )}
    </button>
  );
};

// ============================================================
// Input - Input hiện đại với icon & validation
// ============================================================
export const Input = React.forwardRef(({
  type = 'text',
  placeholder,
  value,
  onChange,
  icon,
  iconRight,
  label,
  required = false,
  error,
  helper,
  className = '',
  ...props
}, ref) => {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-sm font-bold text-slate-700 mb-1.5">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-lg pointer-events-none">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          type={type}
          placeholder={placeholder}
          value={value || ''}
          onChange={onChange}
          className={`w-full bg-white border ${error ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-500' : 'border-slate-200 focus:ring-blue-500/20 focus:border-blue-500'} rounded-xl ${icon ? 'pl-10' : 'pl-4'} ${iconRight ? 'pr-10' : 'pr-4'} py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-all outline-none focus:ring-2 disabled:bg-slate-50 disabled:cursor-not-allowed font-medium`}
          {...props}
        />
        {iconRight && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-lg pointer-events-none">
            {iconRight}
          </span>
        )}
      </div>
      {error && <p className="text-xs text-rose-500 mt-1 font-medium">{error}</p>}
      {helper && !error && <p className="text-xs text-slate-500 mt-1">{helper}</p>}
    </div>
  );
});
Input.displayName = 'Input';

// ============================================================
// Select - Select với icon
// ============================================================
export const Select = React.forwardRef(({
  value,
  onChange,
  options = [],
  icon,
  label,
  required = false,
  placeholder,
  className = '',
  ...props
}, ref) => {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-sm font-bold text-slate-700 mb-1.5">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-lg pointer-events-none">
            {icon}
          </span>
        )}
        <select
          ref={ref}
          value={value || ''}
          onChange={onChange}
          className={`w-full bg-white border border-slate-200 rounded-xl ${icon ? 'pl-10' : 'pl-4'} pr-10 py-2.5 text-sm text-slate-900 transition-all outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer appearance-none font-medium`}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt, idx) => (
            <option key={idx} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-lg">
          expand_more
        </span>
      </div>
    </div>
  );
});
Select.displayName = 'Select';

// ============================================================
// Pagination - Phân trang
// ============================================================
export const Pagination = ({ currentPage, totalPages, onPageChange, totalItems, itemsPerPage = 10 }) => {
  if (totalPages <= 1) return null;
  const start = (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage * itemsPerPage, totalItems);
  return (
    <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
      <p className="text-xs text-slate-500 font-medium">
        Hiển thị <span className="font-bold text-slate-700">{totalItems > 0 ? start : 0}</span>-
        <span className="font-bold text-slate-700">{end}</span> trên tổng{' '}
        <span className="font-bold text-slate-700">{totalItems}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent text-slate-600 transition-colors"
        >
          <span className="material-symbols-outlined text-sm">chevron_left</span>
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
          .map((p, i, arr) => (
            <React.Fragment key={p}>
              {i > 0 && p - arr[i - 1] > 1 && (
                <span className="w-9 h-9 flex items-center justify-center text-slate-400 text-xs">...</span>
              )}
              <button
                onClick={() => onPageChange(p)}
                className={`w-9 h-9 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${
                  currentPage === p
                    ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30'
                    : 'border border-slate-200 hover:bg-white text-slate-600'
                }`}
              >
                {p}
              </button>
            </React.Fragment>
          ))}
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent text-slate-600 transition-colors"
        >
          <span className="material-symbols-outlined text-sm">chevron_right</span>
        </button>
      </div>
    </div>
  );
};

// Hỗ trợ cả default và named export để tương thích với cả hai kiểu import
export default Card;
export { Card };

// Re-export các component từ StatCard.jsx để các trang admin có thể import tập trung từ Card.jsx
import StatCardDefault, {
  Badge,
  OrderStatusPill,
  PaymentStatusPill,
  StockStatusPill,
} from './StatCard';

export const StatCard = StatCardDefault;
export {
  Badge,
  OrderStatusPill,
  PaymentStatusPill,
  StockStatusPill,
};
