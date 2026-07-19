import { useState, useEffect, useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import toast, { Toaster } from 'react-hot-toast';
import { API_BASE_URL } from '../../config/api.config';
import AdminSidebar from './AdminSidebar';

const AdminLayout = ({ children, title = 'AURA K ADMIN', headerCenterContent }) => {
  const { logout, user } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const userRole = user?.role ? String(user.role).toLowerCase().trim() : '';
  const isAdmin = userRole === 'admin';
  const permissions = user?.permissions || {};

  // State dùng chung cho Header
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const unreadCount = notifications.filter((n) => n.unread).length;

  // Fetch thông báo khi load Layout
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const apiUrl = API_BASE_URL || '';
        const res = await fetch(`${apiUrl}/api/v1/admin/dashboard`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success && data.data && data.data.notifications) {
          const readIds = JSON.parse(localStorage.getItem('read_notifications') || '[]');
          const processedNotis = data.data.notifications.map((noti) => ({
            ...noti,
            unread: !readIds.includes(noti.id),
          }));
          setNotifications(processedNotis);
        } else {
          setNotifications([
            { id: 1, text: 'Có 5 đơn hàng mới đang chờ xác nhận', time: 'Vừa xong', unread: true, type: 'order' },
            { id: 2, text: 'Sản phẩm "Áo thun" sắp hết hàng', time: '2 giờ trước', unread: true, type: 'stock' },
          ]);
        }
      } catch (error) {
        console.error('Lỗi lấy thông báo:', error);
      }
    };

    fetchNotifications();
    const intervalId = setInterval(fetchNotifications, 60000);
    return () => clearInterval(intervalId);
  }, []);

  // Kiểm tra quyền truy cập dựa trên URL
  useEffect(() => {
    if (!user || isAdmin) return;

    const path = location.pathname;
    let hasAccess = true;
    const perms = user.permissions || {};

    if (path.startsWith('/admin/products') && !perms.products) hasAccess = false;
    if (path.startsWith('/admin/orders') && !perms.orders) hasAccess = false;
    if (path.startsWith('/admin/customers') && !perms.customers) hasAccess = false;
    if (path.startsWith('/admin/vouchers') && !perms.vouchers) hasAccess = false;
    if (path.startsWith('/admin/inventory') && !perms.inventory) hasAccess = false;
    if (path.startsWith('/admin/analytics') && !perms.reports) hasAccess = false;
    if (path.startsWith('/admin/settings') && !perms.settings) hasAccess = false;

    if (path === '/admin' || path === '/admin/') {
      if (!perms.reports) {
        if (perms.orders) { navigate('/admin/orders'); return; }
        else if (perms.products) { navigate('/admin/products'); return; }
        else if (perms.customers) { navigate('/admin/customers'); return; }
        else if (perms.vouchers) { navigate('/admin/vouchers'); return; }
        else if (perms.inventory) { navigate('/admin/inventory'); return; }
        else if (perms.settings) { navigate('/admin/settings'); return; }
        else { hasAccess = false; }
      }
    }

    if (!hasAccess) {
      toast.error('Lỗi 403: Bạn không có quyền truy cập vào khu vực này!', {
        id: '403_error',
        duration: 4000,
      });
      navigate('/');
    }
  }, [location.pathname, user, navigate, isAdmin]);

  // Xử lý Notification
  const handleNotificationClick = (notification) => {
    const readIds = JSON.parse(localStorage.getItem('read_notifications') || '[]');
    if (!readIds.includes(notification.id)) {
      readIds.push(notification.id);
      localStorage.setItem('read_notifications', JSON.stringify(readIds));
    }
    setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, unread: false } : n)));
    setShowNotifications(false);
    switch (notification.type) {
      case 'order': navigate('/admin/orders'); break;
      case 'stock': navigate('/admin/products'); break;
      case 'revenue': navigate('/admin/analytics'); break;
      default: break;
    }
  };

  const handleMarkAllAsRead = () => {
    const allIds = notifications.map((n) => n.id);
    localStorage.setItem('read_notifications', JSON.stringify(allIds));
    setNotifications(notifications.map((n) => ({ ...n, unread: false })));
  };

  return (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 min-h-screen font-body antialiased">
      <Toaster position="top-center" />
      <style>{`
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        .material-symbols-outlined.filled, [style*="FILL"]:not([style*="FILL' 0"]) {
            font-variation-settings: 'FILL' 1;
        }
        h1, h2, h3, h4, h5, h6, .font-headline { font-family: 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif; letter-spacing: -0.02em; }
        body { font-family: 'Inter', system-ui, sans-serif; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.2); }
      `}</style>

      {/* Admin Sidebar */}
      <AdminSidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        isAdmin={isAdmin}
        permissions={permissions}
        userRole={userRole}
        onLogout={logout}
      />

      {/* Top Navigation Bar */}
      <header className="fixed top-0 right-0 left-0 lg:left-72 h-16 z-40 bg-white/80 backdrop-blur-xl shadow-sm border-b border-slate-200/60 transition-colors">
        <div className="flex items-center justify-between h-full px-4 lg:px-6 gap-3">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <h2 className="text-sm lg:text-lg font-extrabold text-slate-900 tracking-tight truncate">
              {title}
            </h2>
            {headerCenterContent}
          </div>
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600 rounded-full transition-colors"
              >
                <span className="material-symbols-outlined text-xl">notifications</span>
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-rose-600 text-[10px] text-white font-bold border-2 border-white shadow-sm">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white shadow-2xl rounded-2xl border border-slate-200 z-50 overflow-hidden animate-fade-in">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50">
                    <span className="font-bold text-slate-900">Thông báo</span>
                    {unreadCount > 0 && (
                      <button
                        className="text-xs text-blue-600 hover:underline font-semibold"
                        onClick={handleMarkAllAsRead}
                      >
                        Đánh dấu đã đọc
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto custom-scrollbar">
                    {notifications.length > 0 ? (
                      notifications.map((noti) => (
                        <div
                          key={noti.id}
                          onClick={() => handleNotificationClick(noti)}
                          className={`p-4 cursor-pointer border-b border-slate-100 text-sm transition-colors hover:bg-slate-50 ${
                            noti.unread ? 'bg-blue-50/40' : ''
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {noti.unread && (
                              <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0"></span>
                            )}
                            <div className="flex-1">
                              <p className={`text-slate-800 ${noti.unread ? 'font-bold' : ''}`}>
                                {noti.text}
                              </p>
                              <span className="text-xs text-slate-500 mt-1 block">{noti.time}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-slate-400 flex flex-col items-center">
                        <span className="material-symbols-outlined text-4xl mb-2 opacity-50">
                          notifications_paused
                        </span>
                        <p className="text-sm">Không có thông báo nào.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Settings Link */}
            <Link
              to="/admin/settings"
              className="p-2.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600 rounded-full transition-colors hidden sm:flex"
              title="Cài đặt"
            >
              <span className="material-symbols-outlined text-xl">settings</span>
            </Link>

            <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block"></div>

            {/* User Profile */}
            <button
              onClick={() => toast.success(`Xin chào, ${isAdmin ? 'Quản trị viên' : 'Nhân viên'} ${user?.last_name || ''}!`)}
              className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-full hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all"
            >
              <div className="text-right hidden md:block">
                <p className="text-xs font-bold text-slate-800">
                  {user?.first_name || (isAdmin ? 'Quản trị viên' : 'Nhân viên')}
                </p>
                <p className="text-[10px] text-slate-500 font-semibold">
                  {isAdmin ? 'Quản trị viên' : 'Nhân viên'}
                </p>
              </div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
                <span className="material-symbols-outlined text-xl">person</span>
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="lg:pl-72 pt-16 min-h-screen">
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
