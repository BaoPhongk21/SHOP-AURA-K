import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { AuthContext } from '../../context/AuthContext';
import Footer from '../../components/Footer';
import AccountSidebar from '../../components/AccountSidebar';
import { getProvinces, getDistricts, getWards } from '../../api/provinces';
import { useLanguage } from '../../context/LanguageContext';

import { API_BASE_URL } from '../../config/api.config';

const Addresses = () => {
  const { user, logout, updateUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  // State quản lý danh sách địa chỉ
  const [addresses, setAddresses] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // API Hành chính quản lý danh sách Tỉnh/Huyện/Xã
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    street: '',
    ward: '',
    district: '',
    city: '',
    isDefault: false
  });

  // Helper: Lấy token từ localStorage
  const getToken = () => localStorage.getItem('token');

  // ===================== FETCH DANH SÁCH ĐỊA CHỈ TỪ API =====================
  const fetchAddresses = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/v1/addresses`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const data = await response.json();
      if (data.success) {
        setAddresses(data.data.map(addr => ({
          ...addr,
          isDefault: addr.is_default
        })));
      }
    } catch (error) {
      toast.error(language === 'vi' ? 'Không thể tải danh sách địa chỉ.' : 'Unable to load addresses list.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchAddresses();
  }, [user, navigate]);

  // Lấy dữ liệu Tỉnh/Thành phố ban đầu
  useEffect(() => {
    const fetchProvincesData = async () => {
      const data = await getProvinces();
      setProvinces(data);
    };
    fetchProvincesData();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success(language === 'vi' ? 'Bạn đã đăng xuất.' : 'You have logged out.');
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  // Lấy Quận/Huyện khi thay đổi Tỉnh/Thành phố
  const handleCityChange = async (e) => {
    const cityName = e.target.value;
    setFormData({ ...formData, city: cityName, district: '', ward: '' });
    
    const selectedProvince = provinces.find(p => p.name === cityName);
    if (selectedProvince) {
      const dists = await getDistricts(selectedProvince.code);
      setDistricts(dists);
    } else {
      setDistricts([]);
    }
    setWards([]);
  };

  // Lấy Phường/Xã khi thay đổi Quận/Huyện
  const handleDistrictChange = async (e) => {
    const districtName = e.target.value;
    setFormData({ ...formData, district: districtName, ward: '' });
    
    const selectedDistrict = districts.find(d => d.name === districtName);
    if (selectedDistrict) {
      const wrds = await getWards(selectedDistrict.code);
      setWards(wrds);
    } else {
      setWards([]);
    }
  };

  const openForm = async (address = null) => {
    if (address) {
      setFormData({
        name: address.name,
        phone: address.phone,
        street: address.street,
        ward: address.ward,
        district: address.district,
        city: address.city,
        isDefault: address.isDefault
      });
      setEditingId(address.id);
      
      if (address.city) {
        const selectedProvince = provinces.find(p => p.name === address.city);
        if (selectedProvince) {
          const dists = await getDistricts(selectedProvince.code);
          setDistricts(dists);
          
          if (address.district) {
            const selectedDistrict = dists.find(d => d.name === address.district);
            if (selectedDistrict) {
              const wrds = await getWards(selectedDistrict.code);
              setWards(wrds);
            }
          }
        }
      }
    } else {
      setFormData({
        name: '', phone: '', street: '', ward: '', district: '', city: '', isDefault: false
      });
      setDistricts([]);
      setWards([]);
      setEditingId(null);
    }
    setIsFormOpen(true);
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();

    const payload = {
      name: formData.name,
      phone: formData.phone,
      street: formData.street,
      ward: formData.ward,
      district: formData.district,
      city: formData.city,
      isDefault: formData.isDefault
    };

    try {
      let response;
      if (editingId) {
        response = await fetch(`${API_BASE_URL}/api/v1/addresses/${editingId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        response = await fetch(`${API_BASE_URL}/api/v1/addresses`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
          },
          body: JSON.stringify(payload)
        });
      }

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);

        if (formData.isDefault) {
          updateUser({
            address: formData.street,
            district: formData.district,
            city: formData.city,
            phone: formData.phone
          });
        }

        await fetchAddresses();
        setIsFormOpen(false);
      } else {
        toast.error(data.message || (language === 'vi' ? 'Có lỗi xảy ra.' : 'An error occurred.'));
      }
    } catch (error) {
      toast.error(language === 'vi' ? 'Lỗi kết nối server. Vui lòng thử lại.' : 'Server connection error. Please try again.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm(language === 'vi' ? 'Bạn có chắc chắn muốn xóa địa chỉ này?' : 'Are you sure you want to delete this address?')) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/addresses/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        const data = await response.json();

        if (data.success) {
          toast.success(data.message);
          await fetchAddresses();
        } else {
          toast.error(data.message || (language === 'vi' ? 'Không thể xóa địa chỉ.' : 'Failed to delete address.'));
        }
      } catch (error) {
        toast.error(language === 'vi' ? 'Lỗi kết nối server. Vui lòng thử lại.' : 'Server connection error. Please try again.');
      }
    }
  };

  if (!user) return null;

  return (
    <div className="bg-gray-50 text-gray-900 font-sans min-h-screen flex flex-col">
      <Toaster position="top-center" reverseOrder={false} />

      <main className="pt-32 pb-20 px-4 md:px-8 max-w-7xl mx-auto flex flex-col md:flex-row gap-8 lg:gap-12 flex-grow w-full">
        <AccountSidebar />

        <section className="flex-1 space-y-8">
          <header className="flex justify-between items-end">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 mb-2" style={{fontFamily: "'Playfair Display', serif"}}>
                {language === 'vi' ? 'Sổ địa chỉ' : 'Address Book'}
              </h1>
              <p className="text-gray-500 text-base">
                {language === 'vi' ? 'Quản lý các địa chỉ nhận hàng của bạn.' : 'Manage your delivery addresses.'}
              </p>
            </div>
            {!isFormOpen && (
              <button 
                onClick={() => openForm()}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-md hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined">add</span>
                {language === 'vi' ? 'Thêm địa chỉ mới' : 'Add New Address'}
              </button>
            )}
          </header>

          {isFormOpen ? (
            <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-6 border-b border-gray-100 pb-4">
                {editingId ? (language === 'vi' ? 'Cập nhật địa chỉ' : 'Update Address') : (language === 'vi' ? 'Thêm địa chỉ mới' : 'Add New Address')}
              </h2>
              <form onSubmit={handleSaveAddress} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{language === 'vi' ? 'Họ và tên' : 'Full Name'}</label>
                    <input required name="name" value={formData.name} onChange={handleInputChange} className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm" placeholder={language === 'vi' ? 'Nhập họ tên người nhận' : 'Enter recipient name'} type="text" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('checkout.phone')}</label>
                    <input required name="phone" value={formData.phone} onChange={handleInputChange} className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm" placeholder={language === 'vi' ? 'Nhập số điện thoại' : 'Enter phone number'} type="tel" />
                  </div>
                  <div className="space-y-1.5 md:col-span-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('checkout.city')}</label>
                    <select required name="city" value={formData.city} onChange={handleCityChange} className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm">
                      <option value="" disabled>{language === 'vi' ? 'Chọn Tỉnh / Thành phố...' : 'Select City...'}</option>
                      {provinces.map(p => <option key={p.code} value={p.name}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5 md:col-span-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('checkout.district')}</label>
                    <select required name="district" value={formData.district} onChange={handleDistrictChange} disabled={!formData.city} className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm disabled:opacity-50 disabled:bg-gray-100 cursor-pointer disabled:cursor-not-allowed">
                      <option value="" disabled>{language === 'vi' ? 'Chọn Quận / Huyện...' : 'Select District...'}</option>
                      {districts.map(d => <option key={d.code} value={d.name}>{d.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5 md:col-span-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('checkout.ward')}</label>
                    <select required name="ward" value={formData.ward} onChange={handleInputChange} disabled={!formData.district} className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm disabled:opacity-50 disabled:bg-gray-100 cursor-pointer disabled:cursor-not-allowed">
                      <option value="" disabled>{language === 'vi' ? 'Chọn Phường / Xã...' : 'Select Ward...'}</option>
                      {wards.map(w => <option key={w.code} value={w.name}>{w.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5 md:col-span-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('checkout.street')}</label>
                    <input required name="street" value={formData.street} onChange={handleInputChange} className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm" placeholder={language === 'vi' ? 'Số nhà, ngõ, tên đường...' : 'Street name, house number...'} type="text" />
                  </div>
                </div>
                
                <div className="flex items-center gap-2 pt-2">
                  <input 
                    type="checkbox" 
                    id="isDefault" 
                    name="isDefault"
                    checked={formData.isDefault}
                    onChange={handleInputChange}
                    className="w-5 h-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                  />
                  <label htmlFor="isDefault" className="text-gray-700 font-medium cursor-pointer text-sm">
                    {language === 'vi' ? 'Đặt làm địa chỉ mặc định' : 'Set as default address'}
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-6">
                  <button type="button" onClick={() => setIsFormOpen(false)} className="px-6 py-3 font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                    {language === 'vi' ? 'Hủy' : 'Cancel'}
                  </button>
                  <button type="submit" className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold shadow-md hover:bg-blue-700 active:scale-[0.98] transition-all">
                    {language === 'vi' ? 'Lưu địa chỉ' : 'Save Address'}
                  </button>
                </div>
              </form>
            </div>
          ) : isLoading ? (
            <div className="bg-white p-12 text-center rounded-2xl shadow-sm border border-gray-200">
              <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-500">{language === 'vi' ? 'Đang tải danh sách địa chỉ...' : 'Loading addresses list...'}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {addresses.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-2xl shadow-sm border border-gray-200">
                  <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">location_off</span>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{language === 'vi' ? 'Bạn chưa có địa chỉ nào' : 'You do not have any addresses yet'}</h3>
                  <p className="text-gray-500 mb-6">
                    {language === 'vi' ? 'Thêm địa chỉ để việc thanh toán và giao hàng được nhanh chóng hơn.' : 'Add addresses to make checkout and shipping faster.'}
                  </p>
                  <button onClick={() => openForm()} className="inline-block px-8 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-700 transition-colors">
                    {language === 'vi' ? 'Thêm địa chỉ ngay' : 'Add Address Now'}
                  </button>
                </div>
              ) : (
                addresses.map((address) => (
                  <div key={address.id} className={`bg-white p-6 rounded-2xl border ${address.isDefault ? 'border-blue-500 shadow-md ring-1 ring-blue-500/20' : 'border-gray-200 shadow-sm hover:border-gray-300'} flex flex-col sm:flex-row justify-between gap-4 transition-colors`}>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-bold text-lg text-gray-900 border-r border-gray-300 pr-3">{address.name}</h3>
                        <p className="text-gray-600 font-medium">{address.phone}</p>
                        {address.isDefault && (
                          <span className="px-3 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider rounded-full flex items-center gap-1 ml-1 border border-blue-100">
                            <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                            {language === 'vi' ? 'Mặc định' : 'Default'}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm mt-1">{address.street}</p>
                      <p className="text-gray-600 text-sm">{address.ward}, {address.district}, {address.city}</p>
                    </div>
                    <div className="flex sm:flex-col items-center sm:items-end justify-end gap-3 sm:gap-4 border-t sm:border-t-0 border-gray-100 pt-4 sm:pt-0 mt-2 sm:mt-0 min-w-[100px]">
                      <button onClick={() => openForm(address)} className="text-blue-600 font-bold hover:text-blue-800 flex items-center gap-1 text-sm transition-colors">
                        <span className="material-symbols-outlined text-sm">edit</span> {language === 'vi' ? 'Sửa' : 'Edit'}
                      </button>
                      {!address.isDefault && (
                        <button onClick={() => handleDelete(address.id)} className="text-red-500 font-bold hover:text-red-700 flex items-center gap-1 text-sm transition-colors">
                          <span className="material-symbols-outlined text-sm">delete</span> {language === 'vi' ? 'Xóa' : 'Delete'}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Addresses;