import React, { useContext, useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom'; // Import useLocation
import toast, { Toaster } from 'react-hot-toast';
import { CartContext } from '../../context/CartContext';
import Footer from '../../components/Footer';
import { AuthContext } from '../../context/AuthContext'; // Import AuthContext
import { getProvinces, getDistricts, getWards } from '../../api/provinces';
import { useLanguage } from '../../context/LanguageContext';
import { getImageUrl } from '../Register/api.config';

import { API_BASE_URL } from '../../config/api.config';

const Checkout = () => {
  const { cartItems, clearCart, removeVoucher, appliedVoucher, availableVouchers } = useContext(CartContext);
  const { t, language, formatPrice, translateProductName, translateColorName } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation(); // Lấy đối tượng location hiện tại

  // Tính toán trước tiền giảm Flash Sale để làm sạch dữ liệu Voucher truyền từ Giỏ hàng sang
  const flashSaleDiscountValue = cartItems.reduce((acc, item) => {
    const original = item.originalPrice || item.price;
    return item.isFlashSale ? acc + (original - item.price) * item.quantity : acc;
  }, 0);

  // `couponCode` chỉ đọc từ props/state truyền sang, không cần setter.
  // Dùng useRef để tránh warning về việc destructure thiếu setter khi strict mode.
  const couponCodeRef = useRef(location.state?.appliedCouponCode || appliedVoucher || '');
  const couponCode = couponCodeRef.current;
  const [discount, setDiscount] = useState(location.state?.discountAmount || 0);
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useContext(AuthContext); // Lấy thông tin người dùng từ AuthContext
  const [shippingFee, setShippingFee] = useState(45000);
  const [adminShippingFee, setAdminShippingFee] = useState(25000); // State lưu phí vận chuyển từ Admin
  const [shippingMethod, setShippingMethod] = useState('standard'); // State lưu phương thức giao hàng
  const [systemSettings, setSystemSettings] = useState({
    paymentCodActive: true,
    paymentVcbActive: true,
    paymentMomoActive: true
  });

  const [formData, setFormData] = useState({
    email: user?.email || '',
    fullName: user ? `${user.last_name || ''} ${user.first_name || ''}`.trim() : '',
    address: user?.address || '',
    city: user?.city || 'Hà Nội',
    district: user?.district || '',
    ward: user?.ward || '',
    phone: user?.phone || '',
    notes: '',
    paymentMethod: 'cod',
  });

  const [errors, setErrors] = useState({});
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);


  const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

  // BẢN VÁ: Tính toán lại discount nếu bị mất state hoặc tổng tiền thay đổi
  useEffect(() => {
    if (couponCode && availableVouchers.length > 0) {
      const voucher = availableVouchers.find(v => v.code.toUpperCase() === couponCode.toUpperCase());
      if (voucher) {
        if (subtotal >= (voucher.min_order_value || 0)) {
          const amount = voucher.type === 'percent'
            ? (subtotal * voucher.value) / 100
            : voucher.type === 'freeship'
              ? shippingFee
              : voucher.value;
          setDiscount(amount);
        } else {
          setDiscount(0);
        }
      }
    }
  }, [subtotal, couponCode, availableVouchers, shippingFee]);

  // Tính tổng số tiền tiết kiệm được từ Flash Sale
  const flashSaleDiscount = flashSaleDiscountValue;

  // BẢN VÁ: Đảm bảo tổng tiền không bao giờ âm ở giao diện
  const total = Math.max(0, subtotal + shippingFee - discount);

  // Lấy danh sách Tỉnh/Thành phố từ API
  useEffect(() => {
    const fetchProvincesData = async () => {
      const data = await getProvinces();
      setProvinces(data);
    };
    fetchProvincesData();
  }, []);

  // BẢN VÁ: Tự động đồng bộ formData khi dữ liệu user từ AuthContext thay đổi
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        email: prev.email || user.email || '',
        fullName: prev.fullName || `${user.last_name || ''} ${user.first_name || ''}`.trim() || '',
        address: prev.address || user.address || '',
        city: prev.city || user.city || 'Hà Nội',
        district: prev.district || user.district || '',
        ward: prev.ward || user.ward || '',
        phone: prev.phone || user.phone || '',
      }));
    }
  }, [user]);

  // HỢP NHẤT LOGIC: Tải địa chỉ và điền mặc định sau khi đã có danh sách Tỉnh/Thành
  useEffect(() => {
    if (!user || provinces.length === 0) return;

    const fetchSavedAddresses = async () => {
      try {
        setIsLoadingAddresses(true);
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/v1/addresses`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.success) {
          setSavedAddresses(data.data);

          // Ưu tiên điền địa chỉ mặc định nếu chưa chọn địa chỉ nào
          if (!selectedAddressId) {
            const defaultAddr = data.data.find(addr => addr.is_default);
            if (defaultAddr) {
              setSelectedAddressId(defaultAddr.id);
              fillFormWithAddress(defaultAddr);
            }
          }
        }
      } catch (error) {
        console.error('Lỗi khi tải địa chỉ:', error);
      } finally {
        setIsLoadingAddresses(false);
      }
    };

    fetchSavedAddresses();
  }, [user, provinces]); // Chỉ chạy khi có user và provinces đã sẵn sàng

  const fillFormWithAddress = async (address) => {
    setFormData(prev => ({
      ...prev,
      fullName: address.name,
      phone: address.phone,
      address: address.street,
      city: address.city,
      district: address.district,
      ward: address.ward,
    }));

    // Đảm bảo tải danh sách Quận/Huyện và Phường/Xã để dropdown hiển thị đúng text
    const selectedProvince = provinces.find(p =>
      p.name === address.city || p.name.includes(address.city) || address.city.includes(p.name)
    );

    if (selectedProvince) {
      const dists = await getDistricts(selectedProvince.code);
      setDistricts(dists);
      const selectedDistrict = dists.find(d => d.name === address.district || address.district.includes(d.name));
      if (selectedDistrict) {
        const wrds = await getWards(selectedDistrict.code);
        setWards(wrds);
      }
    }
  };

  const handleAddressSelect = (e) => {
    const addressId = e.target.value;
    setSelectedAddressId(addressId);
    if (addressId === 'new') {
      setFormData(prev => ({
        ...prev,
        fullName: user ? `${user.last_name || ''} ${user.first_name || ''}`.trim() : '',
        phone: user?.phone || '',
        address: '',
        city: '',
        district: '',
        ward: '',
      }));
      setDistricts([]);
      setWards([]);
    } else {
      // BẢN VÁ: Đảm bảo provinces đã tải trước khi điền form từ địa chỉ đã lưu
      if (provinces.length > 0) {
        const address = savedAddresses.find(addr => addr.id === parseInt(addressId));
        if (address) fillFormWithAddress(address);
      } else {
        toast.error(
          language === 'vi'
            ? 'Đang tải dữ liệu địa chỉ, vui lòng thử lại sau.'
            : 'Loading address data, please try again later.'
        );
      }
    }
  };

  // Lấy cài đặt hệ thống từ server (bao gồm trạng thái các phương thức thanh toán)
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        // Chỉ gọi API công khai để lấy cấu hình cửa hàng (Tên, QR Code, phí ship)
        // Tránh gọi vào /admin/settings để không bị lỗi 401 đối với khách hàng
        const response = await fetch(`${API_BASE_URL}/api/v1/settings`, { headers });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            // Bóc tách storeConfig vì dữ liệu settings nằm trong đó
            const fetchedConfig = result.data.storeConfig || result.data;

            // Normalize boolean từ DB (có thể là 0/1 thay vì true/false)
            const normalizeBool = (val) => val === true || val === 1 || String(val) === 'true';

            const paymentCodActive = normalizeBool(fetchedConfig.paymentCodActive ?? fetchedConfig.payment_cod_active ?? true);
            const paymentVcbActive = normalizeBool(fetchedConfig.paymentVcbActive ?? fetchedConfig.payment_vcb_active ?? true);
            const paymentMomoActive = normalizeBool(fetchedConfig.paymentMomoActive ?? fetchedConfig.payment_momo_active ?? true);

            // Lấy phí ship từ cấu hình Admin
            if (fetchedConfig.shippingFee !== undefined && fetchedConfig.shippingFee !== '') {
              setAdminShippingFee(Number(fetchedConfig.shippingFee));
            }

            setSystemSettings({ paymentCodActive, paymentVcbActive, paymentMomoActive });

            // Tự động chuyển phương thức thanh toán khác nếu phương thức mặc định bị bảo trì
            setFormData(prev => {
              let currentMethod = prev.paymentMethod;
              if (currentMethod === 'cod' && !paymentCodActive) {
                currentMethod = paymentMomoActive ? 'credit_card' : (paymentVcbActive ? 'bank_transfer' : '');
              } else if (currentMethod === 'credit_card' && !paymentMomoActive) {
                currentMethod = paymentCodActive ? 'cod' : (paymentVcbActive ? 'bank_transfer' : '');
              } else if (currentMethod === 'bank_transfer' && !paymentVcbActive) {
                currentMethod = paymentCodActive ? 'cod' : (paymentMomoActive ? 'credit_card' : '');
              }
              return { ...prev, paymentMethod: currentMethod };
            });
          }
        } else {
          console.error("Không thể tải cấu hình từ server, HTTP Status:", response.status);
        }
      } catch (error) {
        console.error('Lỗi khi tải cấu hình hệ thống:', error);
      }
    };
    fetchSettings();
  }, []);

  const handleCityChange = async (e) => {
    const cityName = e.target.value;
    setFormData(prev => ({ ...prev, city: cityName, district: '', ward: '' }));
    setWards([]);

    const selectedProvince = provinces.find(p => p.name === cityName);
    if (selectedProvince) {
      const dists = await getDistricts(selectedProvince.code);
      setDistricts(dists);
    } else {
      setDistricts([]);
    }
  };

  const handleDistrictChange = async (e) => {
    const districtName = e.target.value;
    setFormData(prev => ({ ...prev, district: districtName, ward: '' }));

    const selectedDistrict = districts.find(d => d.name === districtName);
    if (selectedDistrict) {
      const wrds = await getWards(selectedDistrict.code);
      setWards(wrds);
    } else {
      setWards([]);
    }
  };

  // Tự động tính phí vận chuyển
  useEffect(() => {
    const innerCities = ["Hà Nội", "TP. Hồ Chí Minh", "Đà Nẵng"];
    let baseFee = adminShippingFee;

    // Cộng thêm 20k nếu ở Tỉnh/Thành phố khác
    if (!innerCities.includes(formData.city)) {
      baseFee += 20000;
    }

    // Cộng thêm phí nếu khách chọn Giao hàng nhanh
    if (shippingMethod === 'fast') {
      setShippingFee(baseFee + 20000);
    } else {
      setShippingFee(baseFee);
    }
  }, [formData.city, adminShippingFee, shippingMethod]);


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Xóa lỗi khi người dùng bắt đầu nhập
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email) newErrors.email = language === 'vi' ? 'Email là bắt buộc' : 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = language === 'vi' ? 'Email không hợp lệ' : 'Invalid email';
    if (!formData.fullName) newErrors.fullName = language === 'vi' ? 'Họ và tên là bắt buộc' : 'Full name is required';
    if (!formData.city) newErrors.city = language === 'vi' ? 'Tỉnh/Thành phố là bắt buộc' : 'Province/City is required';
    if (!formData.address) newErrors.address = language === 'vi' ? 'Địa chỉ là bắt buộc' : 'Street address is required';
    if (districts.length > 0 && !formData.district) newErrors.district = language === 'vi' ? 'Vui lòng chọn Quận/Huyện.' : 'Please select District.';
    if (!formData.ward) newErrors.ward = language === 'vi' ? 'Phường/Xã là bắt buộc' : 'Ward is required';
    if (!formData.phone) newErrors.phone = language === 'vi' ? 'Số điện thoại là bắt buộc' : 'Phone is required';
    else if (!/(84|0[3|5|7|8|9])+([0-9]{8})\b/.test(formData.phone)) newErrors.phone = language === 'vi' ? 'Số điện thoại không hợp lệ' : 'Invalid phone number';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePlaceOrder = async () => {
    if (!validateForm()) {
      toast.error(language === 'vi' ? 'Vui lòng điền đầy đủ thông tin giao hàng.' : 'Please fill in all shipping details.');
      return;
    }

    if (cartItems.length === 0) {
      toast.error(language === 'vi' ? 'Giỏ hàng của bạn đang trống!' : 'Your cart is empty!');
      navigate('/products');
      return;
    }

    if (!formData.paymentMethod) {
      toast.error(
        language === 'vi'
          ? 'Hệ thống thanh toán đang bảo trì. Vui lòng thử lại sau.'
          : 'Payment system is under maintenance. Please try again later.'
      );
      return;
    }

    // Kiểm tra xem người dùng đã đăng nhập chưa
    if (!user) {
      toast.error(language === 'vi' ? 'Vui lòng đăng nhập để hoàn tất đơn hàng.' : 'Please log in to complete your order.');
      navigate('/login', { state: { from: location } }); // Chuyển hướng đến trang đăng nhập và lưu lại đường dẫn hiện tại
      return;
    }

    setIsProcessing(true);
    const orderData = {
      customerInfo: {
        name: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        address: `${formData.address}, ${formData.ward}, ${formData.district}, ${formData.city}`,
      },
      items: cartItems.map(item => ({
        product_id: item.id,
        quantity: item.quantity,
        price: item.price,
        size: item.size,
      })),
      paymentMethod: formData.paymentMethod,
      notes: formData.notes,
      subtotal,
      shippingFee,
      discount,
      total,
      couponCode: couponCode ? couponCode : null, // Gửi mã về Backend để lưu log & trừ kho
    };

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/v1/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, // Gửi token xác thực
        },
        body: JSON.stringify(orderData),
      });

      const result = await response.json();

      // Tính tổng số tiền khách hàng tiết kiệm được
      const totalSaved = flashSaleDiscount + discount;

      if (result.success && result.paymentUrl) {
        // Nếu là thanh toán VNPay, backend sẽ trả về paymentUrl
        clearCart();
        if (removeVoucher) removeVoucher();
        // Chuyển hướng người dùng đến cổng thanh toán VNPay
        window.location.href = result.paymentUrl;
      } else if (result.success && result.orderId) {
        // Nếu là thanh toán COD, chuyển khoản, ví điện tử, backend trả về orderId
        toast.success(language === 'vi' ? 'Đặt hàng thành công!' : 'Order placed successfully!');
        clearCart();
        if (removeVoucher) removeVoucher();
        // Chuyển đến trang thành công với orderId để hiển thị nút hủy
        navigate('/order-success', {
          state: {
            orderId: result.orderId,
            totalSaved: totalSaved > 0 ? totalSaved : 0,
            paymentMethod: formData.paymentMethod
          }
        });
      } else {
        throw new Error(result.message || (language === 'vi' ? 'Đã có lỗi xảy ra khi đặt hàng.' : 'An error occurred while ordering.'));
      }
    } catch (error) {
      toast.error(error.message || (language === 'vi' ? 'Không thể kết nối đến server.' : 'Unable to connect to server.'));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-gray-50 text-gray-900 font-sans min-h-screen flex flex-col">
      <Toaster position="top-center" reverseOrder={false} />
      <main className="pt-20 md:pt-28 pb-12 md:pb-20 px-4 md:px-8 max-w-7xl mx-auto flex-grow w-full">

        {/* Header */}
        <div className="mb-8 md:mb-10">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 mb-2" style={{fontFamily: "'Playfair Display', serif"}}>
            {t('checkout.title')}
          </h1>
          <nav className="flex items-center text-sm text-gray-500 space-x-2">
            <Link to="/cart" className="hover:text-blue-600 transition-colors font-medium">{t('cart.title')}</Link>
            <span className="text-gray-400">›</span>
            <span className="text-blue-700 font-semibold">{t('checkout.shippingInfo')}</span>
            <span className="text-gray-400">›</span>
            <span className="text-gray-400">{t('checkout.complete')}</span>
          </nav>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">

          {/* ===== Left Column: Form ===== */}
          <div className="lg:col-span-7 space-y-6">

            {/* Contact Info */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600 text-xl">email</span>
                  {t('checkout.contactInfo')}
                </h2>
                <span className="text-sm text-gray-500">
                  {t('checkout.alreadyHaveAccount')}{' '}
                  <Link to="/login" className="text-blue-600 font-semibold hover:underline">{t('loginRegister.loginTitle')}</Link>
                </span>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
                <input
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  type="email"
                  placeholder="email@example.com"
                  className={`w-full bg-gray-50 border rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 outline-none transition-all text-sm ${errors.email ? 'border-red-400 focus:ring-2 focus:ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'}`}
                />
                {errors.email && <p className="text-red-500 text-xs font-semibold mt-1.5">{errors.email}</p>}
              </div>
            </div>

            {/* Shipping Address */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600 text-xl">location_on</span>
                  {t('checkout.shippingAddress')}
                </h2>
                {user && savedAddresses.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500 uppercase shrink-0">
                      {language === 'vi' ? 'Địa chỉ lưu:' : 'Saved:'}
                    </span>
                    <select
                      value={selectedAddressId}
                      onChange={handleAddressSelect}
                      className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="new">{language === 'vi' ? '+ Thêm địa chỉ mới' : '+ Add new address'}</option>
                      {savedAddresses.map(addr => (
                        <option key={addr.id} value={addr.id}>
                          {addr.is_default ? (language === 'vi' ? '[Mặc định] ' : '[Default] ') : ''}{addr.name} - {addr.city}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Full Name */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">{t('checkout.fullName')}</label>
                  <input
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    type="text"
                    placeholder={t('checkout.fullNamePlaceholder')}
                    className={`w-full bg-gray-50 border rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 outline-none transition-all text-sm ${errors.fullName ? 'border-red-400 focus:ring-2 focus:ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'}`}
                  />
                  {errors.fullName && <p className="text-red-500 text-xs font-semibold mt-1.5">{errors.fullName}</p>}
                </div>

                {/* City */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">{t('checkout.city')}</label>
                  <select
                    name="city"
                    value={formData.city}
                    onChange={handleCityChange}
                    className={`w-full bg-gray-50 border rounded-xl px-4 py-3 text-gray-900 outline-none transition-all text-sm ${errors.city ? 'border-red-400 focus:ring-2 focus:ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'}`}
                  >
                    <option value="" disabled>{language === 'vi' ? 'Chọn Tỉnh / Thành phố...' : 'Select City...'}</option>
                    {provinces.map(p => (
                      <option key={p.code} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                  {errors.city && <p className="text-red-500 text-xs font-semibold mt-1.5">{errors.city}</p>}
                </div>

                {/* District */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">{t('checkout.district')}</label>
                  <select
                    name="district"
                    value={formData.district}
                    onChange={handleDistrictChange}
                    disabled={!formData.city}
                    className={`w-full bg-gray-50 border rounded-xl px-4 py-3 text-gray-900 outline-none transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed ${errors.district ? 'border-red-400 focus:ring-2 focus:ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'}`}
                  >
                    <option value="" disabled>{language === 'vi' ? 'Chọn Quận / Huyện...' : 'Select District...'}</option>
                    {districts.map(d => (
                      <option key={d.code} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                  {errors.district && <p className="text-red-500 text-xs font-semibold mt-1.5">{errors.district}</p>}
                </div>

                {/* Ward */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">{t('checkout.ward')}</label>
                  <select
                    name="ward"
                    value={formData.ward}
                    onChange={handleChange}
                    disabled={!formData.district}
                    className={`w-full bg-gray-50 border rounded-xl px-4 py-3 text-gray-900 outline-none transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed ${errors.ward ? 'border-red-400 focus:ring-2 focus:ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'}`}
                  >
                    <option value="" disabled>{language === 'vi' ? 'Chọn Phường / Xã...' : 'Select Ward...'}</option>
                    {wards.map(w => (
                      <option key={w.code} value={w.name}>{w.name}</option>
                    ))}
                  </select>
                  {errors.ward && <p className="text-red-500 text-xs font-semibold mt-1.5">{errors.ward}</p>}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">{t('checkout.phone')}</label>
                  <input
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    type="tel"
                    placeholder="0901 234 567"
                    className={`w-full bg-gray-50 border rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 outline-none transition-all text-sm ${errors.phone ? 'border-red-400 focus:ring-2 focus:ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'}`}
                  />
                  {errors.phone && <p className="text-red-500 text-xs font-semibold mt-1.5">{errors.phone}</p>}
                </div>

                {/* Street */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">{t('checkout.street')}</label>
                  <input
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    type="text"
                    placeholder={language === 'vi' ? 'Số nhà, ngõ, tên đường...' : 'House number, street name...'}
                    className={`w-full bg-gray-50 border rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 outline-none transition-all text-sm ${errors.address ? 'border-red-400 focus:ring-2 focus:ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'}`}
                  />
                  {errors.address && <p className="text-red-500 text-xs font-semibold mt-1.5">{errors.address}</p>}
                </div>
              </div>
            </div>

            {/* Order Notes */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-5">
                <span className="material-symbols-outlined text-blue-600 text-xl">edit_note</span>
                {language === 'vi' ? 'Ghi chú đơn hàng' : 'Order Notes'}
              </h2>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="3"
                placeholder={language === 'vi' ? 'Ghi chú về đơn hàng, ví dụ: thời gian hay chỉ dẫn địa điểm giao hàng chi tiết hơn.' : 'Notes about your order, e.g. special delivery instructions.'}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm resize-none"
              />
            </div>

            {/* Payment Methods */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined text-blue-600 text-xl">payments</span>
                {t('checkout.paymentMethod')}
              </h2>
              <div className="space-y-3">

                {/* COD */}
                <label className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  formData.paymentMethod === 'cod'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-gray-50 hover:border-blue-300'
                } ${!systemSettings.paymentCodActive ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <input
                    disabled={!systemSettings.paymentCodActive}
                    value="cod"
                    checked={formData.paymentMethod === 'cod'}
                    onChange={handleChange}
                    name="paymentMethod"
                    type="radio"
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="material-symbols-outlined text-2xl text-blue-600">local_shipping</span>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 text-sm">{t('checkout.cod')}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{t('checkout.codDesc')}</p>
                  </div>
                  {!systemSettings.paymentCodActive && (
                    <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded-md border border-red-200">
                      {language === 'vi' ? 'Bảo trì' : 'Maintenance'}
                    </span>
                  )}
                </label>

                {/* MoMo / Online */}
                <label className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  formData.paymentMethod === 'credit_card'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-gray-50 hover:border-blue-300'
                } ${!systemSettings.paymentMomoActive ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <input
                    disabled={!systemSettings.paymentMomoActive}
                    value="credit_card"
                    checked={formData.paymentMethod === 'credit_card'}
                    onChange={handleChange}
                    name="paymentMethod"
                    type="radio"
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="material-symbols-outlined text-2xl text-pink-500">account_balance_wallet</span>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 text-sm">{t('checkout.onlinePayment')}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{t('checkout.onlinePaymentDesc')}</p>
                  </div>
                  {!systemSettings.paymentMomoActive && (
                    <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded-md border border-red-200">
                      {language === 'vi' ? 'Bảo trì' : 'Maintenance'}
                    </span>
                  )}
                </label>

                {/* Bank Transfer */}
                <label className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  formData.paymentMethod === 'bank_transfer'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-gray-50 hover:border-blue-300'
                } ${!systemSettings.paymentVcbActive ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <input
                    disabled={!systemSettings.paymentVcbActive}
                    value="bank_transfer"
                    checked={formData.paymentMethod === 'bank_transfer'}
                    onChange={handleChange}
                    name="paymentMethod"
                    type="radio"
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="material-symbols-outlined text-2xl text-green-600">account_balance</span>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 text-sm">{t('checkout.bankTransfer')}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{t('checkout.bankTransferDesc')}</p>
                  </div>
                  {!systemSettings.paymentVcbActive && (
                    <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded-md border border-red-200">
                      {language === 'vi' ? 'Bảo trì' : 'Maintenance'}
                    </span>
                  )}
                </label>
              </div>
            </div>
          </div>

          {/* ===== Right Column: Order Summary ===== */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-6 md:p-8 sticky top-32">
              <h2 className="text-lg font-bold text-gray-900 mb-6 pb-4 border-b border-gray-200" style={{fontFamily: "'Playfair Display', serif"}}>
                {t('cart.summary')}
              </h2>

              {/* Product List */}
              <div className="space-y-4 mb-6 pb-6 border-b border-gray-100 max-h-[320px] overflow-y-auto pr-1">
                {cartItems.length > 0 ? (
                  cartItems.map((item) => (
                    <div key={item.cartItemId} className="flex gap-3 items-center">
                      <div className="w-16 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
                        <img className="w-full h-full object-cover" alt={item.name} src={getImageUrl(item.image)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-1">
                          <h3 className="font-semibold text-gray-900 text-xs sm:text-sm line-clamp-2 flex-1 pr-1">
                            {translateProductName(item.name)}
                          </h3>
                          <div className="shrink-0 text-right">
                            {item.isFlashSale ? (
                              <>
                                <p className="font-bold text-red-500 text-sm">{formatPrice(item.price * item.quantity)}</p>
                                <p className="text-[10px] line-through text-gray-400">{formatPrice(item.originalPrice * item.quantity)}</p>
                              </>
                            ) : (
                              <p className="font-bold text-gray-900 text-sm">{formatPrice(item.price * item.quantity)}</p>
                            )}
                          </div>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                          <span className="bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-md font-medium">
                            Size: {item.size}{item.color && (language === 'vi' ? ` | Màu: ${translateColorName(item.color)}` : ` | Color: ${translateColorName(item.color)}`)}
                          </span>
                          <span className="text-gray-400">× {item.quantity}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-400 italic text-center py-4">{t('cart.emptySub')}</p>
                )}
              </div>

              {/* Shipping Method */}
              <div className="mb-6 pb-6 border-b border-gray-100">
                <h3 className="font-bold text-gray-700 text-sm mb-3">
                  {language === 'vi' ? 'Phương thức vận chuyển' : 'Shipping Method'}
                </h3>
                <div className="space-y-2">
                  <label className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${shippingMethod === 'standard' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="shippingMethod"
                        value="standard"
                        checked={shippingMethod === 'standard'}
                        onChange={() => setShippingMethod('standard')}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{language === 'vi' ? 'Giao hàng tiết kiệm' : 'Economy Shipping'}</p>
                        <p className="text-xs text-gray-500">{language === 'vi' ? '4 - 5 ngày' : '4 - 5 days'}</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-gray-600">{language === 'vi' ? 'Tiêu chuẩn' : 'Standard'}</span>
                  </label>

                  <label className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${shippingMethod === 'fast' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="shippingMethod"
                        value="fast"
                        checked={shippingMethod === 'fast'}
                        onChange={() => setShippingMethod('fast')}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{language === 'vi' ? 'Giao hàng nhanh' : 'Express Shipping'}</p>
                        <p className="text-xs text-gray-500">{language === 'vi' ? '2 - 3 ngày' : '2 - 3 days'}</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-blue-600">+20.000₫</span>
                  </label>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="space-y-3 mb-6 text-sm">
                <div className="flex justify-between items-center text-gray-600">
                  <span>{t('cart.subtotal')}</span>
                  <span className="font-semibold text-gray-900">{formatPrice(subtotal + flashSaleDiscount)}</span>
                </div>
                {flashSaleDiscount > 0 && (
                  <div className="flex justify-between items-center text-gray-600">
                    <span>{language === 'vi' ? 'Giảm Flash Sale' : 'Flash Sale Discount'}</span>
                    <span className="font-semibold text-red-500">-{formatPrice(flashSaleDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-gray-600">
                  <span>
                    {language === 'vi' ? 'Phí vận chuyển' : 'Shipping Fee'}
                    <span className="text-xs text-gray-400 ml-1">({shippingMethod === 'standard' ? (language === 'vi' ? 'Tiêu chuẩn' : 'Standard') : (language === 'vi' ? 'Nhanh' : 'Fast')})</span>
                  </span>
                  <span className="font-semibold text-gray-900">{formatPrice(shippingFee)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between items-center text-gray-600">
                    <span>{t('cart.discount')} ({couponCode})</span>
                    <span className="font-semibold text-green-600">-{formatPrice(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-4 border-t-2 border-gray-200">
                  <span className="text-lg font-bold text-gray-900">{t('cart.total')}</span>
                  <span className="text-xl font-extrabold text-blue-700">{formatPrice(total)}</span>
                </div>
              </div>

              {/* Place Order Button */}
              <button
                onClick={handlePlaceOrder}
                disabled={isProcessing || cartItems.length === 0}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-base rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-wait flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {language === 'vi' ? 'Đang xử lý...' : 'Processing...'}
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-xl">shopping_bag</span>
                    {language === 'vi' ? 'Đặt hàng ngay' : 'Place Order Now'}
                  </>
                )}
              </button>

              <p className="text-[10px] text-center text-gray-400 mt-4 leading-relaxed px-2">
                {language === 'vi'
                  ? 'Bằng cách đặt hàng, bạn đồng ý với điều khoản dịch vụ và chính sách bảo mật của chúng tôi.'
                  : 'By placing an order, you agree to our terms of service and privacy policy.'}
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Checkout;

