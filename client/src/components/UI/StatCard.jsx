import React from 'react';

// ============================================================
// StatCard - Thẻ thống kê hiện đại với gradient và hiệu ứng
// ============================================================
const colorSchemes = {
  blue: {
    gradient: 'from-blue-500 to-blue-700',
    light: 'from-blue-50 to-blue-100',
    text: 'text-blue-700',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    ring: 'ring-blue-500/20',
  },
  emerald: {
    gradient: 'from-emerald-500 to-emerald-700',
    light: 'from-emerald-50 to-emerald-100',
    text: 'text-emerald-700',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    ring: 'ring-emerald-500/20',
  },
  amber: {
    gradient: 'from-amber-500 to-orange-600',
    light: 'from-amber-50 to-orange-100',
    text: 'text-amber-700',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    ring: 'ring-amber-500/20',
  },
  purple: {
    gradient: 'from-purple-500 to-purple-700',
    light: 'from-purple-50 to-purple-100',
    text: 'text-purple-700',
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    ring: 'ring-purple-500/20',
  },
  rose: {
    gradient: 'from-rose-500 to-pink-600',
    light: 'from-rose-50 to-pink-100',
    text: 'text-rose-700',
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-600',
    ring: 'ring-rose-500/20',
  },
  cyan: {
    gradient: 'from-cyan-500 to-cyan-700',
    light: 'from-cyan-50 to-cyan-100',
    text: 'text-cyan-700',
    iconBg: 'bg-cyan-100',
    iconColor: 'text-cyan-600',
    ring: 'ring-cyan-500/20',
  },
  slate: {
    gradient: 'from-slate-500 to-slate-700',
    light: 'from-slate-50 to-slate-100',
    text: 'text-slate-700',
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-600',
    ring: 'ring-slate-500/20',
  },
};

const StatCard = ({
  title,
  value,
  icon,
  color = 'blue',
  trend,
  trendUp = true,
  subtitle,
  variant = 'modern', // 'modern' | 'gradient' | 'minimal'
  loading = false,
}) => {
  const scheme = colorSchemes[color] || colorSchemes.blue;

  if (variant === 'gradient') {
    return (
      <div className={`bg-gradient-to-br ${scheme.gradient} p-6 rounded-2xl shadow-lg relative overflow-hidden text-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group`}>
        <div className="absolute -right-8 -bottom-8 opacity-10 group-hover:opacity-20 transition-opacity">
          <span className="material-symbols-outlined text-[120px]">{icon}</span>
        </div>
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
              <span className="material-symbols-outlined text-2xl">{icon}</span>
            </div>
            {trend !== undefined && (
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${trendUp ? 'bg-white/20 text-white' : 'bg-white/20 text-white'}`}>
                <span className="material-symbols-outlined text-[12px]">{trendUp ? 'trending_up' : 'trending_down'}</span>
                {trend}
              </span>
            )}
          </div>
          <p className="text-sm font-medium opacity-90 uppercase tracking-wider">{title}</p>
          <h3 className="text-3xl font-black mt-1 font-headline">
            {loading ? <span className="inline-block w-12 h-8 bg-white/20 rounded animate-pulse"></span> : value}
          </h3>
          {subtitle && <p className="text-xs opacity-80 mt-2">{subtitle}</p>}
        </div>
      </div>
    );
  }

  if (variant === 'minimal') {
    return (
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
        <div className="flex justify-between items-start mb-3">
          <div className={`p-2 rounded-xl ${scheme.iconBg} ${scheme.iconColor} group-hover:scale-110 transition-transform`}>
            <span className="material-symbols-outlined text-xl">{icon}</span>
          </div>
          {trend !== undefined && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${trendUp ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
              <span className="material-symbols-outlined text-[10px]">{trendUp ? 'arrow_upward' : 'arrow_downward'}</span>
              {trend}
            </span>
          )}
        </div>
        <p className="text-xs font-semibold text-slate-500 mb-1">{title}</p>
        <h3 className={`text-2xl font-extrabold ${scheme.text} font-headline tracking-tight`}>
          {loading ? <span className="inline-block w-16 h-6 bg-slate-200 rounded animate-pulse"></span> : value}
        </h3>
        {subtitle && <p className="text-[10px] text-slate-400 mt-2 font-medium">{subtitle}</p>}
      </div>
    );
  }

  // Default: modern variant
  return (
    <div className={`bg-gradient-to-br ${scheme.light} p-6 rounded-2xl shadow-sm border border-white/60 relative overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group`}>
      <div className="absolute -right-6 -bottom-6 opacity-5 group-hover:opacity-10 transition-opacity">
        <span className={`material-symbols-outlined text-[140px] ${scheme.iconColor}`}>{icon}</span>
      </div>
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4">
          <div className={`p-3 ${scheme.iconBg} rounded-xl shadow-sm`}>
            <span className={`material-symbols-outlined text-2xl ${scheme.iconColor}`}>{icon}</span>
          </div>
          {trend !== undefined && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${trendUp ? 'text-emerald-700 bg-emerald-100' : 'text-rose-700 bg-rose-100'}`}>
              <span className="material-symbols-outlined text-[10px]">{trendUp ? 'trending_up' : 'trending_down'}</span>
              {trend}
            </span>
          )}
        </div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{title}</p>
        <h3 className={`text-3xl font-black mt-1 ${scheme.text} font-headline tracking-tight`}>
          {loading ? <span className="inline-block w-20 h-8 bg-slate-200/60 rounded animate-pulse"></span> : value}
        </h3>
        {subtitle && <p className="text-xs text-slate-500 mt-2 font-medium">{subtitle}</p>}
      </div>
    </div>
  );
};

// ============================================================
// Badge - Nhãn trạng thái với nhiều màu sắc
// ============================================================
const badgeSchemes = {
  success: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  warning: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  danger: { bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-500' },
  info: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
  slate: { bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-500' },
};

export const Badge = ({ children, color = 'info', icon, dot = false, size = 'md', className = '' }) => {
  const scheme = badgeSchemes[color] || badgeSchemes.info;
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : size === 'lg' ? 'px-3 py-1.5 text-sm' : 'px-2.5 py-1 text-xs';
  return (
    <span className={`inline-flex items-center gap-1.5 font-bold rounded-full ${scheme.bg} ${scheme.text} ${sizeClass} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${scheme.dot}`}></span>}
      {icon && <span className="material-symbols-outlined text-sm">{icon}</span>}
      {children}
    </span>
  );
};

// ============================================================
// StatusPill - Nhãn trạng thái theo ngữ nghĩa đơn hàng
// ============================================================
export const OrderStatusPill = ({ status }) => {
  const map = {
    pending: { color: 'warning', label: 'Chờ xác nhận', icon: 'schedule' },
    processing: { color: 'info', label: 'Đang xử lý', icon: 'autorenew' },
    shipped: { color: 'purple', label: 'Đang giao', icon: 'local_shipping' },
    delivered: { color: 'info', label: 'Đã giao', icon: 'inventory_2' },
    completed: { color: 'success', label: 'Hoàn tất', icon: 'check_circle' },
    cancelled: { color: 'danger', label: 'Đã hủy', icon: 'cancel' },
    at_risk: { color: 'danger', label: 'Rủi ro', icon: 'warning' },
  };
  const cfg = map[status] || { color: 'slate', label: status, icon: 'help' };
  return <Badge color={cfg.color} icon={cfg.icon} dot>{cfg.label}</Badge>;
};

// ============================================================
// PaymentStatusPill - Nhãn trạng thái thanh toán
// ============================================================
export const PaymentStatusPill = ({ status }) => {
  const normalized = (status || '').toLowerCase();
  if (normalized.includes('đã thanh toán') || normalized.includes('đã tt') || normalized === 'paid') {
    return <Badge color="success" icon="check_circle" dot>Đã thanh toán</Badge>;
  }
  if (normalized.includes('đang đợi')) {
    return <Badge color="warning" icon="hourglass_top" dot>Đang đợi</Badge>;
  }
  if (normalized.includes('thất bại') || normalized.includes('failed')) {
    return <Badge color="danger" icon="error" dot>Thất bại</Badge>;
  }
  return <Badge color="warning" icon="hourglass_empty" dot>Chờ thanh toán</Badge>;
};

// ============================================================
// StockStatusPill - Nhãn trạng thái tồn kho
// ============================================================
export const StockStatusPill = ({ quantity, thresholdLow = 5, thresholdHigh = 999999 }) => {
  if (quantity === 0) return <Badge color="slate" icon="block">Hết hàng</Badge>;
  if (quantity <= thresholdLow) return <Badge color="danger" icon="priority_high" dot>Sắp hết</Badge>;
  if (quantity < thresholdHigh) return <Badge color="warning" icon="warning" dot>Còn ít</Badge>;
  return <Badge color="success" icon="check_circle" dot>Còn hàng</Badge>;
};

export default StatCard;
