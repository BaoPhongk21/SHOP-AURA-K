import React, { useState, useContext, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { AuthContext } from '../../context/AuthContext';
import Footer from '../../components/Footer';
import AccountSidebar from '../../components/AccountSidebar';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { useLanguage } from '../../context/LanguageContext';

import { API_BASE_URL } from '../../config/api.config';
import { getImageUrl } from '../Register/api.config';

const Account = () => {
  const { user, logout, updateUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  const names = (user?.name || '').split(' ');
  const defaultLastName = names.length > 1 ? names[0] : '';
  const defaultFirstName = names.length > 1 ? names.slice(1).join(' ') : (names[0] || '');

  // State cho thông tin cá nhân
  const [profileData, setProfileData] = useState({
    firstName: user?.first_name || defaultFirstName,
    lastName: user?.last_name || defaultLastName,
    email: user?.email || '',
    phone: user?.phone || '',
    dob: user?.date_of_birth ? new Date(user.date_of_birth).toISOString().split('T')[0] : '', // Định dạng YYYY-MM-DD cho input type="date"
  });

  // State cho quản lý mật khẩu
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // State cho tính năng ẩn/hiện mật khẩu
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  // State cho Avatar
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    AOS.init({ duration: 800, once: true, easing: 'ease-out-cubic', offset: 50 });
  }, []);

  // Cập nhật profileData khi user từ AuthContext thay đổi
  useEffect(() => {
    if (user) {
      const uNames = (user.name || '').split(' ');
      const uLastName = uNames.length > 1 ? uNames[0] : '';
      const uFirstName = uNames.length > 1 ? uNames.slice(1).join(' ') : (uNames[0] || '');

      setProfileData({
        firstName: user.first_name || uFirstName,
        lastName: user.last_name || uLastName,
        email: user.email || '',
        phone: user.phone || '',
        dob: user.date_of_birth ? new Date(user.date_of_birth).toISOString().split('T')[0] : '', // Định dạng YYYY-MM-DD
      });
    }
  }, [user]);

  // Fetch dữ liệu user mới nhất khi vào trang
  useEffect(() => {
    const fetchLatestUserData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        if (result.success && result.data && result.data.user) {
          updateUser(result.data.user);
        }
      } catch (e) {
        console.error('Lỗi khi tải thông tin user mới nhất:', e);
      }
    };
    fetchLatestUserData();
  }, []);

  // Nếu chưa đăng nhập, chuyển hướng về trang login
  useEffect(() => {
    if (!user) {
      navigate('/login');
      toast.error(language === 'vi' ? 'Vui lòng đăng nhập để truy cập trang tài khoản.' : 'Please log in to access the account page.');
    }
  }, [user, navigate, language]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData({ ...profileData, [name]: value });
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData({ ...passwordData, [name]: value });
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // Giới hạn 2MB
        toast.error(language === 'vi' ? 'Kích thước ảnh không được vượt quá 2MB' : 'Image size must not exceed 2MB');
        return;
      }
      setAvatarFile(file);
      // Tạo URL để preview ảnh ngay lập tức
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  // Hàm xác nhận cập nhật riêng cho Ảnh đại diện
  const handleConfirmAvatarUpdate = async () => {
    if (!avatarFile) return;
    setIsUploadingAvatar(true);
    
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('avatar', avatarFile);

      const response = await fetch(`${API_BASE_URL}/api/v1/users/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });
      
      const result = await response.json();
      if (response.ok && result.success) {
        toast.success(language === 'vi' ? 'Cập nhật ảnh đại diện thành công!' : 'Profile picture updated successfully!');
        if (result.data && result.data.user) {
          // Replace toàn bộ user với thông tin mới nhất từ API để Header tự cập nhật avatar/...
          updateUser(result.data.user, { replace: true });
        }
        setAvatarFile(null);
        setAvatarPreview(null);
      } else {
        toast.error(result.message || (language === 'vi' ? 'Cập nhật ảnh thất bại.' : 'Image update failed.'));
      }
    } catch (error) {
      toast.error(language === 'vi' ? 'Lỗi khi cập nhật ảnh đại diện.' : 'Error updating profile picture.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();

    // Kiểm tra xem các trường quan trọng đã được nhập chưa
    if (!profileData.firstName.trim() || !profileData.lastName.trim() || !profileData.phone.trim()) {
      toast.error(
        language === 'vi' 
          ? 'Vui lòng nhập đầy đủ thông tin cơ bản (Họ, Tên, Số điện thoại).' 
          : 'Please enter all basic information (First Name, Last Name, Phone Number).'
      );
      return;
    }

    setIsSavingProfile(true);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error(language === 'vi' ? 'Bạn chưa đăng nhập.' : 'You are not logged in.');
        navigate('/login');
        return;
      }

      const formData = new FormData();
      formData.append('firstName', profileData.firstName);
      formData.append('lastName', profileData.lastName);
      formData.append('phone', profileData.phone);
      formData.append('date_of_birth', profileData.dob);

      const response = await fetch(`${API_BASE_URL}/api/v1/users/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });
      const result = await response.json();
      if (response.ok && result.success) {
        toast.success(language === 'vi' ? 'Cập nhật thông tin thành công!' : 'Profile updated successfully!');
        if (result.data && result.data.user) {
          // Replace toàn bộ user với thông tin mới nhất từ API
          updateUser(result.data.user, { replace: true });
        }
      } else {
        toast.error(result.message || (language === 'vi' ? 'Cập nhật thông tin thất bại.' : 'Profile update failed.'));
      }
    } catch (error) {
      toast.error(language === 'vi' ? 'Lỗi khi cập nhật thông tin.' : 'Error updating profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (!passwordData.currentPassword.trim() || !passwordData.newPassword.trim() || !passwordData.confirmNewPassword.trim()) {
      toast.error(language === 'vi' ? 'Vui lòng nhập đầy đủ thông tin mật khẩu.' : 'Please fill in all password fields.');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      toast.error(language === 'vi' ? 'Mật khẩu mới và xác nhận mật khẩu không khớp.' : 'New password and confirm password do not match.');
      return;
    }
    if (passwordData.newPassword.length <= 8) {
      toast.error(language === 'vi' ? 'Mật khẩu mới phải dài hơn 8 ký tự.' : 'New password must be longer than 8 characters.');
      return;
    }

    setIsChangingPassword(true);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error(language === 'vi' ? 'Bạn chưa đăng nhập.' : 'You are not logged in.');
        navigate('/login');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        toast.success(language === 'vi' ? 'Thay đổi mật khẩu thành công!' : 'Password changed successfully!');
        if (result.token) {
          localStorage.setItem('token', result.token);
        }
      } else {
        toast.error(result.message || (language === 'vi' ? 'Thay đổi mật khẩu thất bại.' : 'Password change failed.'));
      }
      // Reset form sau khi hoàn tất (cả thành công lẫn thất bại)
      setPasswordData({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
    } catch (error) {
      toast.error(language === 'vi' ? 'Lỗi khi thay đổi mật khẩu.' : 'Error changing password.');
      setPasswordData({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (!user) {
    return null;
  }

  const userFullName = user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || (language === 'vi' ? 'Người dùng Aura K' : 'Aura K Customer');
  const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(userFullName)}&background=e0f2fe&color=003178&size=128`;
  const userAvatar = user.avatar_url ? getImageUrl(user.avatar_url) : fallbackAvatar;
  const totalOrders = user.total_orders !== undefined ? user.total_orders : 0;
  const loyaltyPoints = user.loyalty_points !== undefined ? user.loyalty_points : 0;
  const memberSince = user.created_at ? new Date(user.created_at).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', { month: 'long', year: 'numeric' }) : (language === 'vi' ? 'Tháng 1, 2026' : 'January 2026');
  const fullAddress = user ? [user.address, user.district, user.city].filter(Boolean).join(', ') : '';

  const getCustomerRankInfo = () => {
    const ranks = [
      { key: 'bronze', name: language === 'vi' ? 'Hạng Đồng' : 'Bronze Class', icon: 'workspace_premium', classes: 'bg-orange-100 text-orange-700', min: 0, next: 5000000 },
      { key: 'silver', name: language === 'vi' ? 'Hạng Bạc' : 'Silver Class', icon: 'military_tech', classes: 'bg-slate-200 text-slate-700', min: 5000000, next: 20000000 },
      { key: 'gold', name: language === 'vi' ? 'Hạng Vàng' : 'Gold Class', icon: 'stars', classes: 'bg-amber-100 text-amber-700', min: 20000000, next: 50000000 },
      { key: 'diamond', name: language === 'vi' ? 'Hạng Kim cương' : 'Diamond Class', icon: 'diamond', classes: 'bg-cyan-100 text-cyan-700', min: 50000000, next: null }
    ];

    const currentKey = user.rank || 'bronze';
    const totalSpent = Number(user.total_spending || 0);
    
    let currentRank = ranks.find(r => r.key === currentKey) || ranks[0];
    
    let progress = 100;
    let needed = 0;
    let nextName = null;

    if (currentRank.next !== null) {
      const range = currentRank.next - currentRank.min;
      const progressInRange = totalSpent - currentRank.min;
      progress = Math.max(0, Math.min((progressInRange / range) * 100, 100));
      
      needed = currentRank.next - totalSpent;
      const nextRankObj = ranks.find(r => r.min === currentRank.next);
      nextName = nextRankObj ? nextRankObj.name : null;
    }

    return { ...currentRank, progress, needed, nextName };
  };

  const userRank = getCustomerRankInfo();

  return (
    <div className="bg-gray-50 text-gray-900 font-sans min-h-screen flex flex-col">
      <Toaster position="top-center" reverseOrder={false} />

      <main className="pt-32 pb-20 px-4 md:px-8 max-w-7xl mx-auto flex flex-col md:flex-row gap-8 lg:gap-12 flex-grow w-full">
        <AccountSidebar />

        <section className="flex-1 space-y-10" data-aos="fade-left">
          <header>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 mb-2" style={{fontFamily: "'Playfair Display', serif"}}>{t('account.profile')}</h1>
            <p className="text-gray-500 text-base">{t('account.profileSub')}</p>
          </header>

          {/* Profile Summary Card */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-200" data-aos="fade-up" data-aos-delay="100">
            <div className="flex flex-col sm:flex-row items-center gap-8">
              <div className="flex flex-col items-center">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current && fileInputRef.current.click()}>
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border border-gray-200 shadow-sm transition-transform group-hover:scale-[1.02] relative">
                    <img
                      alt="Profile avatar"
                      className="w-full h-full object-cover"
                      src={avatarPreview || userAvatar}
                      onError={(e) => { e.target.onerror = null; e.target.src = fallbackAvatar; }}
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="material-symbols-outlined text-white text-2xl drop-shadow-md">photo_camera</span>
                    </div>
                  </div>
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/jpg"
                    ref={fileInputRef}
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>
                {avatarFile && (
                  <div className="mt-4 flex gap-2 w-full justify-center">
                    <button
                      type="button"
                      onClick={handleConfirmAvatarUpdate}
                      disabled={isUploadingAvatar}
                      className="bg-blue-600 text-white text-xs font-bold py-2 px-4 rounded-full shadow hover:bg-blue-700 disabled:opacity-70 transition-all flex items-center gap-1"
                    >
                    {isUploadingAvatar ? (
                      <>
                        <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                        {language === 'vi' ? 'Đang lưu...' : 'Saving...'}
                      </>
                    ) : (
                      language === 'vi' ? 'Xác nhận' : 'Confirm'
                    )}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAvatarFile(null); setAvatarPreview(null); }}
                      disabled={isUploadingAvatar}
                      className="bg-gray-100 text-gray-600 text-xs font-bold py-2 px-4 rounded-full hover:bg-gray-200 disabled:opacity-70 transition-all"
                    >
                      {language === 'vi' ? 'Hủy' : 'Cancel'}
                    </button>
                  </div>
                )}
              </div>
              <div className="text-center sm:text-left flex-1 w-full">
                <div className="flex flex-col sm:flex-row items-center gap-3 mb-2">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900" style={{fontFamily: "'Playfair Display', serif"}}>{userFullName}</h2>
                  <span className={`px-3 py-1 text-[11px] font-bold rounded-full flex items-center gap-1 border ${
                    userRank.key === 'bronze' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                    userRank.key === 'silver' ? 'bg-slate-100 text-slate-700 border-slate-300' :
                    userRank.key === 'gold' ? 'bg-amber-50 text-amber-700 border-amber-300' :
                    'bg-cyan-50 text-cyan-700 border-cyan-200'
                  }`}>
                    <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>{userRank.icon}</span>
                    {userRank.name}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-5">
                  {language === 'vi' ? `Thành viên từ: ${memberSince}` : `Member since: ${memberSince}`}
                </p>
                
                {/* Progress Bar */}
                <div className="mb-6 w-full max-w-md mx-auto sm:mx-0">
                  <div className="flex justify-between items-end text-xs mb-2">
                    <span className="font-semibold text-gray-700">
                      {language === 'vi' ? `Đã chi: ` : `Spent: `} 
                      <span className="font-bold text-blue-700">{Number(user.total_spending || 0).toLocaleString('vi-VN')}đ</span>
                    </span>
                    {userRank.nextName ? (
                       <span className="text-gray-500 text-[11px]">
                         {language === 'vi' ? 'Cần thêm ' : 'Need '}<strong className="text-blue-600">{userRank.needed.toLocaleString('vi-VN')}đ</strong>{language === 'vi' ? ' để lên ' : ' to reach '}<strong className="text-gray-800">{userRank.nextName}</strong>
                       </span>
                    ) : (
                       <span className="text-green-600 font-bold">{language === 'vi' ? 'Đã đạt hạng cao nhất! 🎉' : 'Highest Rank reached! 🎉'}</span>
                    )}
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden border border-gray-200">
                    <div className="bg-blue-600 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${userRank.progress}%` }}></div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                  <div className="bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl shadow-sm min-w-[120px]">
                    <span className="block text-[10px] uppercase tracking-widest font-bold mb-1 text-gray-500">{language === 'vi' ? 'Đơn hàng' : 'Orders'}</span>
                    <span className="text-blue-700 font-bold text-base">
                      {totalOrders}
                    </span>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl shadow-sm min-w-[120px]">
                    <span className="block text-[10px] uppercase tracking-widest font-bold mb-1 text-gray-500">{language === 'vi' ? 'Điểm thưởng' : 'Points'}</span>
                    <span className="text-blue-700 font-bold text-base">{loyaltyPoints.toLocaleString('vi-VN')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Edit Information Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" data-aos="fade-up" data-aos-delay="200">
            
            {/* Basic Info */}
            <form onSubmit={handleSaveProfile} className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-6 pb-4 border-b border-gray-100">
                <span className="material-symbols-outlined text-blue-600 text-xl">badge</span>
                {language === 'vi' ? 'Thông tin cá nhân' : 'Personal Information'}
              </h3>
              
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">{t('checkout.lastName')}</label>
                    <input
                      name="lastName"
                      value={profileData.lastName}
                      onChange={handleProfileChange}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                      type="text"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">{t('checkout.firstName')}</label>
                    <input
                      name="firstName"
                      value={profileData.firstName}
                      onChange={handleProfileChange}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                      type="text"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
                  <input
                    value={profileData.email}
                    className="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 text-gray-500 outline-none cursor-not-allowed text-sm"
                    type="email"
                    disabled
                  />
                  <p className="text-[10px] text-gray-400 mt-1.5">{language === 'vi' ? '* Không thể thay đổi email đã đăng ký' : '* Registered email cannot be changed'}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">{t('checkout.phone')}</label>
                    <input
                      name="phone"
                      value={profileData.phone}
                      onChange={handleProfileChange}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                      type="text"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">{language === 'vi' ? 'Ngày sinh' : 'Birthday'}</label>
                    <input
                      name="dob"
                      value={profileData.dob}
                      onChange={handleProfileChange}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                      type="date"
                    />
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">{t('checkout.shippingAddress')}</label>
                    <Link to="/addresses" className="text-[11px] text-blue-600 font-bold hover:underline">
                      {language === 'vi' ? 'Chỉnh sửa sổ địa chỉ' : 'Edit address book'}
                    </Link>
                  </div>
                  <input
                    value={fullAddress || (language === 'vi' ? 'Chưa thiết lập địa chỉ mặc định' : 'No default address')}
                    className="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 text-gray-500 outline-none cursor-not-allowed text-sm"
                    type="text"
                    disabled
                  />
                </div>
              </div>

              <div className="mt-8">
                <button type="submit" disabled={isSavingProfile} className="w-full sm:w-auto bg-blue-600 text-white px-8 py-3.5 rounded-xl font-bold shadow-md hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait">
                  {isSavingProfile ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      {language === 'vi' ? 'Đang lưu...' : 'Saving...'}
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[20px]">save</span>
                      {language === 'vi' ? 'Cập nhật thông tin' : 'Update Profile'}
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Password Management */}
            <form onSubmit={handleChangePassword} className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-200 h-fit">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-6 pb-4 border-b border-gray-100">
                <span className="material-symbols-outlined text-blue-600 text-xl">lock</span>
                {language === 'vi' ? 'Đổi mật khẩu' : 'Change Password'}
              </h3>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">{language === 'vi' ? 'Mật khẩu hiện tại' : 'Current Password'}</label>
                  <div className="relative">
                    <input
                      name="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 pr-12 py-3 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                      placeholder="••••••••"
                      type={showCurrentPassword ? "text" : "password"}
                      required
                    />
                    <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                      <span className="material-symbols-outlined text-[20px]">{showCurrentPassword ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">{language === 'vi' ? 'Mật khẩu mới' : 'New Password'}</label>
                  <div className="relative">
                    <input
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 pr-12 py-3 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                      placeholder={language === 'vi' ? 'Tối thiểu 8 ký tự' : 'Minimum 8 characters'}
                      type={showNewPassword ? "text" : "password"}
                      required
                    />
                    <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                      <span className="material-symbols-outlined text-[20px]">{showNewPassword ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">{language === 'vi' ? 'Xác nhận mật khẩu' : 'Confirm Password'}</label>
                  <div className="relative">
                    <input
                      name="confirmNewPassword"
                      value={passwordData.confirmNewPassword}
                      onChange={handlePasswordChange}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 pr-12 py-3 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                      placeholder={language === 'vi' ? 'Nhập lại mật khẩu mới' : 'Re-enter new password'}
                      type={showConfirmNewPassword ? "text" : "password"}
                      required
                    />
                    <button type="button" onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                      <span className="material-symbols-outlined text-[20px]">{showConfirmNewPassword ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 items-start">
                  <span className="material-symbols-outlined text-blue-500 mt-0.5 text-lg shrink-0">shield</span>
                  <p className="text-xs text-blue-800 font-medium leading-relaxed">
                    {language === 'vi' 
                      ? 'Để đảm bảo an toàn, mật khẩu phải có ít nhất 8 ký tự và không được trùng với mật khẩu cũ.' 
                      : 'For security, password must be at least 8 characters long and different from the old one.'}
                  </p>
                </div>
              </div>

              <div className="mt-8">
                <button type="submit" disabled={isChangingPassword} className="w-full sm:w-auto bg-gray-900 text-white px-8 py-3.5 rounded-xl font-bold shadow-md hover:bg-gray-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait">
                  {isChangingPassword ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      {language === 'vi' ? 'Đang đổi...' : 'Changing...'}
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[20px]">lock_reset</span>
                      {language === 'vi' ? 'Đổi mật khẩu' : 'Change Password'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Account;