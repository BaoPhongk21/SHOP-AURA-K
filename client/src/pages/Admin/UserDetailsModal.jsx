import React, { useState } from 'react';

const UserDetailsModal = ({ isOpen, onClose, user, onSendReminder }) => {
  if (!isOpen || !user) return null;

  const [showReminderMenu, setShowReminderMenu] = useState(false);

  const handleReminderClick = (type) => {
    if (onSendReminder) {
      onSendReminder(user.id, type);
    }
    setShowReminderMenu(false);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Chưa cập nhật';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin': return <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">Admin</span>;
      case 'staff': return <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs font-bold">Nhân viên</span>;
      default: return <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-bold">Khách hàng</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      {/* Modal Container */}
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">person_search</span>
            Hồ sơ tài khoản
          </h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Basic Info Section */}
          <div className="flex flex-col md:flex-row items-center gap-6 mb-8">
            <div className="w-24 h-24 rounded-full bg-slate-200 overflow-hidden border-4 border-white shadow-md shrink-0">
              <img 
                src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.first_name || 'U'}&background=0D8ABC&color=fff`} 
                alt="Avatar" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="text-center md:text-left flex-1">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-1">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                  {user.last_name || ''} {user.first_name || ''}
                </h2>
                {getRoleBadge(user.role)}
                {user.is_active === false || user.is_active === 0 ? (
                  <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">Bị khóa</span>
                ) : (
                  <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold">Hoạt động</span>
                )}
              </div>
              <p className="text-slate-500 flex items-center justify-center md:justify-start gap-1">
                <span className="material-symbols-outlined text-[16px]">mail</span> {user.email || 'Chưa cập nhật email'}
              </p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl text-center border border-blue-100 dark:border-blue-800/30">
              <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-1">Tổng đơn hàng</p>
              <p className="text-2xl font-bold text-blue-800 dark:text-blue-300">{user.total_orders || 0}</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl text-center border border-emerald-100 dark:border-emerald-800/30">
              <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium mb-1">Tổng chi tiêu</p>
              <p className="text-xl font-bold text-emerald-800 dark:text-emerald-300">{formatCurrency(user.total_spent)}</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl text-center border border-amber-100 dark:border-amber-800/30">
              <p className="text-sm text-amber-600 dark:text-amber-400 font-medium mb-1">Điểm tích lũy</p>
              <p className="text-2xl font-bold text-amber-800 dark:text-amber-300">{user.loyalty_points || 0}</p>
            </div>
          </div>

          {/* Detail List */}
          <div className="space-y-4 text-sm bg-slate-50 dark:bg-slate-800/50 p-5 rounded-xl">
            <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
              <span className="text-slate-500 font-medium">Số điện thoại:</span>
              <span className="text-slate-800 dark:text-slate-200 font-semibold">{user.phone || 'Chưa cung cấp'}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
              <span className="text-slate-500 font-medium">Trạng thái SĐT:</span>
              {user.phone_verified ? (
                <span className="text-emerald-600 font-semibold flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">verified</span> Đã xác thực</span>
              ) : (
                <span className="text-amber-600 font-semibold flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">warning</span> Chưa xác thực</span>
              )}
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Ngày tham gia:</span>
              <span className="text-slate-800 dark:text-slate-200 font-semibold">{formatDate(user.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 px-6 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
          <div className="relative">
            <button 
              onClick={() => setShowReminderMenu(!showReminderMenu)}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">security</span>
              Gửi nhắc nhở bảo mật
            </button>
            
            {/* Dropdown Menu */}
            {showReminderMenu && (
              <div className="absolute bottom-full left-0 mb-2 w-64 bg-white shadow-xl border border-slate-100 rounded-xl overflow-hidden z-10 animate-fade-in-up">
                <button onClick={() => handleReminderClick('verify_phone')} className="w-full text-left px-4 py-3 hover:bg-slate-50 text-sm border-b font-medium text-slate-700">📱 Nhắc nhở xác thực SĐT</button>
                <button onClick={() => handleReminderClick('password_change_recommendation')} className="w-full text-left px-4 py-3 hover:bg-slate-50 text-sm border-b font-medium text-slate-700">🔒 Khuyến nghị đổi mật khẩu</button>
                <button onClick={() => handleReminderClick('account_locked')} className="w-full text-left px-4 py-3 hover:bg-red-50 text-sm text-red-600 font-medium">⛔ Gửi thông báo khóa tài khoản</button>
              </div>
            )}
          </div>
          
          <button onClick={onClose} className="px-5 py-2 text-slate-500 hover:text-slate-800 font-bold text-sm transition-colors">Đóng</button>
        </div>
      </div>
    </div>
  );
};

export default UserDetailsModal;