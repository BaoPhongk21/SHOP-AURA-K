import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSettings } from '../../components/SettingsContext';
import { getImageUrl } from '../Register/api.config';

const AdminSidebar = ({
  isOpen,
  onClose,
  isAdmin,
  permissions,
  userRole,
  onLogout,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [hovered, setHovered] = useState(null);

  // Kiểm tra active status
  const isActive = (path) => {
    if (path === '/admin') {
      return location.pathname === '/admin' || location.pathname === '/admin/';
    }
    return location.pathname.startsWith(path);
  };

  // Nhóm menu theo section để dễ quản lý
  const menuGroups = [
    {
      title: 'Tổng quan',
      items: [
        { path: '/admin', icon: 'dashboard', label: 'Tổng quan', permission: true },
      ],
    },
    {
      title: 'Kinh doanh',
      items: [
        { path: '/admin/orders', icon: 'receipt_long', label: 'Đơn hàng', permission: isAdmin || permissions.orders, badge: 'HOT' },
        { path: '/admin/products', icon: 'inventory_2', label: 'Sản phẩm', permission: isAdmin || permissions.products },
        { path: '/admin/categories', icon: 'category', label: 'Danh mục', permission: isAdmin || permissions.products },
        { path: '/admin/vouchers', icon: 'local_offer', label: 'Mã giảm giá', permission: isAdmin || permissions.vouchers },
      ],
    },
    {
      title: 'Kho vận',
      items: [
        { path: '/admin/inventory', icon: 'warehouse', label: 'Kho hàng', permission: isAdmin || permissions.inventory },
      ],
    },
    {
      title: 'Khách hàng',
      items: [
        { path: '/admin/customers', icon: 'groups', label: 'Khách hàng', permission: isAdmin || permissions.customers },
      ],
    },
    {
      title: 'Phân tích & Hệ thống',
      items: [
        { path: '/admin/analytics', icon: 'insights', label: 'Báo cáo', permission: isAdmin || permissions.reports },
        { path: '/admin/settings', icon: 'settings', label: 'Cài đặt', permission: isAdmin || permissions.settings },
      ],
    },
  ];

  const bottomItems = [
    { path: '/admin/help', icon: 'help', label: 'Trợ giúp', permission: true },
  ];

  const linkClass = (path) => {
    const active = isActive(path);
    return `w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 group ${
      active
        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/40'
        : 'text-slate-300 hover:bg-white/10 hover:text-white'
    }`;
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[55] lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen w-72 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-slate-100 flex flex-col border-r border-slate-800/50 shadow-2xl z-[60] overflow-y-auto transition-transform duration-300 custom-scrollbar lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo Section */}
        <div className="px-5 py-5 border-b border-slate-800/50 bg-slate-900/40">
          <div className="flex items-center justify-between gap-3">
            <Link to="/admin" className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center overflow-hidden border border-slate-700/50 shadow-lg shadow-blue-500/20 shrink-0">
                {settings?.logoUrl ? (
                  <img src={getImageUrl(settings.logoUrl)} alt="Logo" className="w-full h-full object-contain bg-white" />
                ) : (
                  <span className="material-symbols-outlined text-white text-xl">local_mall</span>
                )}
              </div>
              <div className="min-w-0">
                <h1 className="text-base font-black text-white uppercase tracking-wider truncate">
                  {settings?.name || 'AURA K'}
                </h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"></span>
                  Admin Panel
                </p>
              </div>
            </Link>
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors shrink-0"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>

        {/* Main Menu với Section Groups */}
        <div className="flex-1 px-3 py-5 space-y-5">
          {menuGroups.map((group, groupIdx) => {
            const visibleItems = group.items.filter((it) => it.permission);
            if (visibleItems.length === 0) return null;
            return (
              <div key={groupIdx}>
                <h3 className="px-3 mb-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  {group.title}
                </h3>
                <div className="space-y-1">
                  {visibleItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={onClose}
                      onMouseEnter={() => setHovered(item.path)}
                      onMouseLeave={() => setHovered(null)}
                      className={linkClass(item.path)}
                    >
                      <span
                        className={`material-symbols-outlined text-lg flex-shrink-0 transition-transform group-hover:scale-110 ${
                          isActive(item.path) ? '' : 'text-slate-400 group-hover:text-white'
                        }`}
                        style={isActive(item.path) ? { fontVariationSettings: "'FILL' 1" } : {}}
                      >
                        {item.icon}
                      </span>
                      <span className="truncate flex-1">{item.label}</span>
                      {item.badge && (
                        <span className="text-[8px] font-black bg-rose-500 text-white px-1.5 py-0.5 rounded-full uppercase">
                          {item.badge}
                        </span>
                      )}
                      {isActive(item.path) && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Menu */}
        <div className="px-3 py-4 border-t border-slate-800/50 bg-slate-950/50 space-y-1">
          {bottomItems
            .filter((item) => item.permission)
            .map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={linkClass(item.path)}
              >
                <span className="material-symbols-outlined text-lg flex-shrink-0">{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </Link>
            ))}

          {/* Logout Button */}
          <button
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-rose-300 hover:bg-rose-500/10 hover:text-rose-200 transition-all duration-300 group"
          >
            <span className="material-symbols-outlined text-lg flex-shrink-0 group-hover:rotate-12 transition-transform">logout</span>
            <span className="truncate">Đăng xuất</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;
