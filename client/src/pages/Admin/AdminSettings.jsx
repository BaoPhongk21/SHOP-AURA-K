import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import AdminLayout from './AdminLayout';
import { getImageUrl } from '../Register/api.config';

import { API_BASE_URL } from '../../config/api.config';
import { useSettings } from '../../components/SettingsContext';
import BannerManager from './BannerManager';

const AdminSettings = () => {
  const { user } = useContext(AuthContext);
  const userRole = user?.role || 'customer';
  const isAdmin = userRole === 'admin';
  const { updateSettings } = useSettings();

  const [storeConfig, setStoreConfig] = useState({
    name: '',
    hotline: '',
    address: '',
    shippingFee: '',
    mapUrl: '',
    paymentVcbActive: true,
    paymentMomoActive: true,
    paymentCodActive: false,
    shippingGhtkActive: true,
    shippingGhnActive: false
  });

  const [flashSaleConfig, setFlashSaleConfig] = useState({
    isActive: false,
    durationHours: 3,
    discountPercent: 20,
    endTime: null,
    products: []
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isFlashSaleLoading, setIsFlashSaleLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [allProducts, setAllProducts] = useState([]);
  const [selectedProductIds, setSelectedProductIds] = useState([]);

  // States for new image uploads
  const [vcbQrFile, setVcbQrFile] = useState(null);
  const [momoQrFile, setMomoQrFile] = useState(null);
  const [vcbQrPreview, setVcbQrPreview] = useState(null);
  const [momoQrPreview, setMomoQrPreview] = useState(null);

  // Lấy dữ liệu flash sale và tất cả sản phẩm
  useEffect(() => {
    const fetchFlashSaleAdmin = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/api/v1/admin/settings/flash-sale`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setFlashSaleConfig({
            isActive: data.isActive,
            durationHours: 3,
            discountPercent: data.discount || 20,
            endTime: data.endTime,
            products: data.products || []
          });
          setSelectedProductIds((data.productIds || []).map(Number));
        }
      } catch (e) {
        console.error("Lỗi lấy thông tin flash sale admin:", e);
      }
    };

    const fetchAllProducts = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/products?limit=99999`);
        const data = await res.json();
        if (data.success) {
          setAllProducts(data.data || []);
        }
      } catch (e) {
        console.error("Lỗi lấy danh sách sản phẩm:", e);
      }
    };

    fetchFlashSaleAdmin();
    fetchAllProducts();
  }, []);

  const handleStartFlashSale = async () => {
    if (selectedProductIds.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 sản phẩm để giảm giá.");
      return;
    }
    setIsFlashSaleLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/settings/start-flash-sale`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          productIds: selectedProductIds,
          durationHours: flashSaleConfig.durationHours,
          discountPercent: flashSaleConfig.discountPercent
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Đã kích hoạt Flash Sale thành công!");
        // Refresh
        const updatedRes = await fetch(`${API_BASE_URL}/api/v1/admin/settings/flash-sale`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const updatedData = await updatedRes.json();
        if (updatedData.success) {
          setFlashSaleConfig({
            isActive: updatedData.isActive,
            durationHours: flashSaleConfig.durationHours,
            discountPercent: updatedData.discount || 20,
            endTime: updatedData.endTime,
            products: updatedData.products || []
          });
        }
      } else {
        toast.error(data.message || "Lỗi khi kích hoạt Flash Sale.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Lỗi hệ thống khi kích hoạt Flash Sale.");
    } finally {
      setIsFlashSaleLoading(false);
    }
  };

  const handleStopFlashSale = async () => {
    setIsFlashSaleLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/settings/stop-flash-sale`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Đã dừng Flash Sale thành công!");
        setFlashSaleConfig(prev => ({
          ...prev,
          isActive: false,
          endTime: null,
          products: []
        }));
        setSelectedProductIds([]);
      } else {
        toast.error(data.message || "Lỗi khi dừng Flash Sale.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Lỗi hệ thống khi dừng Flash Sale.");
    } finally {
      setIsFlashSaleLoading(false);
    }
  };

  // Gọi API lấy dữ liệu thật từ DB
  useEffect(() => {
    const fetchSettingsData = async () => {
      try {
        const token = localStorage.getItem('token');

        // Cố gắng lấy từ admin endpoint (protected)
        let settingsRes = await fetch(`${API_BASE_URL}/api/v1/admin/settings`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => null);

        // Nếu admin endpoint fail, fallback sang public endpoint
        if (!settingsRes || !settingsRes.ok) {
          console.warn(`Admin settings fetch failed (${settingsRes?.status}), trying public endpoint...`);
          settingsRes = await fetch(`${API_BASE_URL}/api/v1/settings`);
        }

        // Xử lý dữ liệu cấu hình
        if (settingsRes && settingsRes.ok) {
          const settingsData = await settingsRes.json();
          if (settingsData.success && settingsData.data) {
            const fetchedConfig = settingsData.data.storeConfig || settingsData.data;

            // Chuẩn hóa dữ liệu: Ánh xạ tất cả các biến thể từ Server về State chuẩn
            setStoreConfig({
              name: fetchedConfig.name || '',
              hotline: fetchedConfig.hotline || '',
              address: fetchedConfig.address || '',
              shippingFee: fetchedConfig.shipping_fee || fetchedConfig.shippingFee || '',
              mapUrl: fetchedConfig.mapUrl || fetchedConfig.map_url || '',
              paymentVcbQr: fetchedConfig.payment_vcb_qr || fetchedConfig.paymentVcbQr || '',
              paymentMomoQr: fetchedConfig.payment_momo_qr || fetchedConfig.paymentMomoQr || '',
              paymentVcbActive: fetchedConfig.payment_vcb_active == 1 || fetchedConfig.paymentVcbActive === true,
              paymentMomoActive: fetchedConfig.payment_momo_active == 1 || fetchedConfig.paymentMomoActive === true,
              paymentCodActive: fetchedConfig.payment_cod_active == 1 || fetchedConfig.paymentCodActive === true,
              shippingGhtkActive: fetchedConfig.shipping_ghtk_active == 1 || fetchedConfig.shippingGhtkActive === true,
              shippingGhnActive: fetchedConfig.shipping_ghn_active == 1 || fetchedConfig.shippingGhnActive === true,
            });
          }
        }
      } catch (error) {
        console.error('Lỗi khi lấy dữ liệu settings:', error);
        toast.error('Không thể tải cấu hình. Sẽ dùng giá trị mặc định.');
      } finally {
        setLoading(false);
      }
    };

    fetchSettingsData();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');

      if (!token) {
        toast.error('❌ Không tìm thấy token. Vui lòng đăng nhập lại.');
        setIsSaving(false);
        return;
      }

      // Sử dụng FormData để hỗ trợ upload file ảnh
      const formData = new FormData();

      // Chuyển đổi camelCase sang snake_case để đồng bộ hoàn toàn với Database
      const mapping = {
        name: 'name', hotline: 'hotline', address: 'address',
        shippingFee: 'shipping_fee', mapUrl: 'map_url',
        paymentVcbQr: 'payment_vcb_qr', paymentMomoQr: 'payment_momo_qr',
        paymentVcbActive: 'payment_vcb_active', paymentMomoActive: 'payment_momo_active',
        paymentCodActive: 'payment_cod_active', shippingGhtkActive: 'shipping_ghtk_active',
        shippingGhnActive: 'shipping_ghn_active'
      };

      Object.keys(storeConfig).forEach(key => {
        const apiField = mapping[key] || key;
        let value = storeConfig[key];

        // Làm sạch URL trước khi gửi (chuẩn hóa dấu /)
        if (value && typeof value === 'string' && (value.includes('uploads') || value.includes('http') || value.includes('\\'))) {
          value = value.replace(/\\/g, '/');
          if (value.startsWith('http')) {
            try { value = new URL(value).pathname; } catch (e) { }
          }
        }

        if (value !== null && value !== undefined && apiField !== 'payment_vcb_qr' && apiField !== 'payment_momo_qr') {
          formData.append(apiField, typeof value === 'boolean' ? (value ? '1' : '0') : String(value).trim());
        }
      });

      if (vcbQrFile) formData.append('vcbQr', vcbQrFile);
      if (momoQrFile) formData.append('momoQr', momoQrFile);

      const response = await fetch(`${API_BASE_URL}/api/v1/admin/settings`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      // Check nếu response status không OK (401, 403, 500 v.v.)
      if (!response.ok) {
        if (response.status === 401) {
          toast.error('❌ Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
          // Trigger logout từ AuthContext
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setTimeout(() => window.location.href = '/login', 1500);
          return;
        } else if (response.status === 403) {
          toast.error('❌ Bạn không có quyền chỉnh sửa cấu hình hệ thống.');
          return;
        }
      }

      const result = await response.json();

      if (result.success) {
        toast.success('✅ Cấu hình đã được lưu thành công!', { duration: 2000 });

        // CẬP NHẬT TOÀN BỘ DỮ LIỆU ĐỂ TRÁNH MẤT CHỮ / MẤT ẢNH
        // Server trả về object config trực tiếp hoặc nằm trong storeConfig
        const serverData = result.data?.storeConfig || result.data || {};

        const normalizedUpdate = {
          name: serverData.name ?? storeConfig.name,
          hotline: serverData.hotline ?? storeConfig.hotline,
          address: serverData.address ?? storeConfig.address,
          mapUrl: serverData.map_url ?? serverData.mapUrl ?? storeConfig.mapUrl,
          shippingFee: serverData.shipping_fee ?? serverData.shippingFee ?? storeConfig.shippingFee,
          paymentVcbQr: serverData.payment_vcb_qr ?? serverData.paymentVcbQr ?? storeConfig.paymentVcbQr,
          paymentMomoQr: serverData.payment_momo_qr ?? serverData.paymentMomoQr ?? storeConfig.paymentMomoQr,
          paymentVcbActive: serverData.payment_vcb_active !== undefined ? (serverData.payment_vcb_active == 1 || serverData.payment_vcb_active === true) : storeConfig.paymentVcbActive,
          paymentMomoActive: serverData.payment_momo_active !== undefined ? (serverData.payment_momo_active == 1 || serverData.payment_momo_active === true) : storeConfig.paymentMomoActive,
          paymentCodActive: serverData.payment_cod_active !== undefined ? (serverData.payment_cod_active == 1 || serverData.payment_cod_active === true) : storeConfig.paymentCodActive,
          shippingGhtkActive: serverData.shipping_ghtk_active !== undefined ? (serverData.shipping_ghtk_active == 1 || serverData.shipping_ghtk_active === true) : storeConfig.shippingGhtkActive,
          shippingGhnActive: serverData.shipping_ghn_active !== undefined ? (serverData.shipping_ghn_active == 1 || serverData.shipping_ghn_active === true) : storeConfig.shippingGhnActive,
        };

        setStoreConfig(normalizedUpdate);

        // Reset file uploads
        setVcbQrFile(null);
        setMomoQrFile(null);
        setVcbQrPreview(null);
        setMomoQrPreview(null);

        // Cập nhật Context toàn cục để Header/Home nhận dữ liệu mới ngay
        await updateSettings(normalizedUpdate);
      } else {
        toast.error(result.message || 'Lỗi khi lưu cấu hình');
        console.error('Backend error:', result);
      }
    } catch (error) {
      console.error('Save settings error:', error);
      toast.error('Lỗi hệ thống khi lưu. Chi tiết: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Thêm headerCenterContent để đồng bộ UI với các trang Admin khác
  const headerCenterContent = (
    <div className="hidden md:flex items-center text-sm font-bold text-on-surface-variant uppercase tracking-wider bg-surface-container-low px-4 py-2 rounded-lg">
      <span className="material-symbols-outlined text-base mr-2">settings_suggest</span>
      Cấu hình & Nhận diện
    </div>
  );

  return (
    <AdminLayout title="Cài đặt Hệ thống" headerCenterContent={headerCenterContent}>
      <div className="p-8 max-w-7xl w-full mx-auto space-y-8">
        <header className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-black text-on-surface tracking-tight font-headline">Cài đặt Hệ thống</h2>
            <p className="text-on-surface-variant mt-1">Quản lý các thông số cốt lõi và nhận diện thương hiệu Aura K.</p>
          </div>
          {isAdmin && (
            <button
              onClick={handleSave}
              disabled={loading || isSaving}
              className="bg-gradient-to-r from-primary to-blue-800 text-white px-6 py-2.5 rounded-lg font-bold text-sm shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center space-x-2 disabled:opacity-70 disabled:cursor-wait"
            >
              {isSaving ? (
                <span className="material-symbols-outlined text-sm animate-spin">refresh</span>
              ) : (
                <span className="material-symbols-outlined text-sm">save</span>
              )}
              <span>{isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
            </button>
          )}
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* 2. Cấu hình cửa hàng */}
          <section className="lg:col-span-12 bg-surface p-6 rounded-xl shadow-sm border border-surface-container flex flex-col transition-colors duration-300">
            <div className="flex items-center space-x-3 mb-6">
              <span className="p-2 bg-blue-50 rounded-lg">
                <span className="material-symbols-outlined text-primary">store</span>
              </span>
              <h3 className="text-lg font-bold text-primary font-headline">Cấu hình cửa hàng</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider pl-1">Tên cửa hàng</label>
                <input
                  className="w-full bg-surface-container-lowest border border-surface-container focus:border-primary focus:ring-1 focus:ring-primary rounded-lg transition-all px-4 py-2.5 text-sm text-on-surface outline-none font-medium"
                  type="text"
                  disabled={loading}
                  value={storeConfig.name || ''}
                  onChange={(e) => setStoreConfig({ ...storeConfig, name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider pl-1">Hotline</label>
                <input
                  className="w-full bg-surface-container-lowest border border-surface-container focus:border-primary focus:ring-1 focus:ring-primary rounded-lg transition-all px-4 py-2.5 text-sm text-on-surface outline-none font-medium"
                  type="text"
                  disabled={loading}
                  value={storeConfig.hotline || ''}
                  onChange={(e) => setStoreConfig({ ...storeConfig, hotline: e.target.value })}
                />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider pl-1">Địa chỉ trụ sở</label>
                <input
                  className="w-full bg-surface-container-lowest border border-surface-container focus:border-primary focus:ring-1 focus:ring-primary rounded-lg transition-all px-4 py-2.5 text-sm text-on-surface outline-none font-medium"
                  type="text"
                  disabled={loading}
                  value={storeConfig.address || ''}
                  onChange={(e) => setStoreConfig({ ...storeConfig, address: e.target.value })}
                />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider pl-1">Bản đồ (Google Maps URL/Iframe)</label>
                <input
                  className="w-full bg-surface-container-lowest border border-surface-container focus:border-primary focus:ring-1 focus:ring-primary rounded-lg transition-all px-4 py-2.5 text-sm text-on-surface outline-none font-medium"
                  type="text"
                  placeholder="Dán mã nhúng <iframe> từ Google Maps vào đây..."
                  disabled={loading}
                  value={storeConfig.mapUrl || ''}
                  onChange={(e) => setStoreConfig({ ...storeConfig, mapUrl: e.target.value })}
                />
              </div>
            </div>

            <div className="rounded-xl overflow-hidden h-48 relative border border-surface-container mt-auto bg-surface-container-low">
              {storeConfig.mapUrl ? (
                <iframe
                  src={storeConfig.mapUrl.includes('<iframe') && storeConfig.mapUrl.match(/src="([^"]+)"/) ? storeConfig.mapUrl.match(/src="([^"]+)"/)[1] : storeConfig.mapUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Store Map"
                ></iframe>
              ) : (
                <>
                  <img className="w-full h-full object-cover grayscale opacity-50" alt="Map location" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAXqAPAzY-JPxNprJZfmeBBGiI_Eg6kVHcrCSSkccR2zZrOZfY2Ng6pGltoEN3z1YnjqtRXBGuUQnLeekmXxlBuiAzGdbHZAyPHBMbHfl-WMEBmX0cxJm4gc9BWWKcuydN0uuNy3o3ISQGIu2aoK2wXuIMhAkqCac8dR96RAdEDd75c8606rFiMZlNTgcF8LL_MCXdILMOH_sCkHJ2zOtigSC450fw3Py1s_oHq1Kr5ddBdca8ZRnjo8o7z-LcWL1-z6PtZMlB1xyg" />
                  <div className="absolute inset-0 flex items-center justify-center bg-primary/5">
                    <div className="bg-white p-3 rounded-full shadow-lg flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
                    </div>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 bg-surface/90 backdrop-blur-md p-2.5 rounded-lg text-[10px] font-bold text-primary flex items-center justify-between shadow-sm">
                    <span>VỊ TRÍ CHƯA ĐƯỢC THIẾT LẬP</span>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* 3. Thông tin cửa hàng */}
          <section className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-surface p-6 rounded-xl shadow-sm border border-surface-container transition-colors duration-300">
              <div className="flex items-center space-x-3 mb-6">
                <span className="p-2 bg-blue-50 rounded-lg">
                  <span className="material-symbols-outlined text-primary">payments</span>
                </span>
                <h3 className="text-lg font-bold text-primary font-headline">Thanh toán</h3>
              </div>
              <div className="space-y-3">
                <div className={`flex flex-col p-3.5 bg-surface-container-low rounded-lg border transition-colors ${storeConfig.paymentVcbActive ? 'border-surface-container hover:border-primary' : 'border-outline-variant/30 opacity-70 grayscale'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="material-symbols-outlined text-blue-600">account_balance</span>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-on-surface">Ngân hàng (Vietcombank)</span>
                        {!storeConfig.paymentVcbActive && <span className="text-[10px] text-red-500 font-bold uppercase">Đang bảo trì</span>}
                      </div>
                    </div>
                    <div onClick={() => setStoreConfig({ ...storeConfig, paymentVcbActive: !storeConfig.paymentVcbActive })} className={`w-10 h-5 rounded-full relative cursor-pointer shadow-inner transition-colors ${storeConfig.paymentVcbActive ? 'bg-primary' : 'bg-slate-300'}`}>
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all ${storeConfig.paymentVcbActive ? 'right-1' : 'left-1'}`}></div>
                    </div>
                  </div>
                  {storeConfig.paymentVcbActive && (
                    <div className="mt-3 pt-3 border-t border-outline-variant/20 flex flex-col space-y-2">
                      <label className="text-xs font-bold text-outline uppercase tracking-wider">Mã QR Thanh toán VCB</label>
                      <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                        {(vcbQrPreview || storeConfig.paymentVcbQr) && (
                          <img src={vcbQrPreview || getImageUrl(storeConfig.paymentVcbQr)} alt="VCB QR" className="w-16 h-16 object-contain rounded border border-outline-variant" />
                        )}
                        <input 
                          type="file" 
                          accept="image/*"
                          className="text-xs"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setVcbQrFile(e.target.files[0]);
                              setVcbQrPreview(URL.createObjectURL(e.target.files[0]));
                            }
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className={`flex flex-col p-3.5 bg-surface-container-low rounded-lg border transition-colors ${storeConfig.paymentMomoActive ? 'border-surface-container hover:border-primary' : 'border-outline-variant/30 opacity-70 grayscale'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="material-symbols-outlined text-pink-600">account_balance_wallet</span>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-on-surface">Ví điện tử MoMo</span>
                        {!storeConfig.paymentMomoActive && <span className="text-[10px] text-red-500 font-bold uppercase">Đang bảo trì</span>}
                      </div>
                    </div>
                    <div onClick={() => setStoreConfig({ ...storeConfig, paymentMomoActive: !storeConfig.paymentMomoActive })} className={`w-10 h-5 rounded-full relative cursor-pointer shadow-inner transition-colors ${storeConfig.paymentMomoActive ? 'bg-primary' : 'bg-slate-300'}`}>
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all ${storeConfig.paymentMomoActive ? 'right-1' : 'left-1'}`}></div>
                    </div>
                  </div>
                  {storeConfig.paymentMomoActive && (
                    <div className="mt-3 pt-3 border-t border-outline-variant/20 flex flex-col space-y-2">
                      <label className="text-xs font-bold text-outline uppercase tracking-wider">Mã QR Thanh toán MoMo</label>
                      <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                        {(momoQrPreview || storeConfig.paymentMomoQr) && (
                          <img src={momoQrPreview || getImageUrl(storeConfig.paymentMomoQr)} alt="Momo QR" className="w-16 h-16 object-contain rounded border border-outline-variant" />
                        )}
                        <input 
                          type="file" 
                          accept="image/*"
                          className="text-xs"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setMomoQrFile(e.target.files[0]);
                              setMomoQrPreview(URL.createObjectURL(e.target.files[0]));
                            }
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className={`flex items-center justify-between p-3.5 bg-surface-container-low rounded-lg border transition-colors ${storeConfig.paymentCodActive ? 'border-surface-container hover:border-primary' : 'border-outline-variant/30 opacity-70 grayscale'}`}>
                  <div className="flex items-center space-x-3">
                    <span className="material-symbols-outlined text-slate-500">local_shipping</span>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-on-surface">Thanh toán COD</span>
                      {!storeConfig.paymentCodActive && <span className="text-[10px] text-red-500 font-bold uppercase">Tạm tắt</span>}
                    </div>
                  </div>
                  <div onClick={() => setStoreConfig({ ...storeConfig, paymentCodActive: !storeConfig.paymentCodActive })} className={`w-10 h-5 rounded-full relative cursor-pointer shadow-inner transition-colors ${storeConfig.paymentCodActive ? 'bg-primary' : 'bg-slate-300'}`}>
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all ${storeConfig.paymentCodActive ? 'right-1' : 'left-1'}`}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-surface p-6 rounded-xl shadow-sm border border-surface-container transition-colors duration-300">
              <div className="flex items-center space-x-3 mb-6">
                <span className="p-2 bg-blue-50 rounded-lg">
                  <span className="material-symbols-outlined text-primary">local_post_office</span>
                </span>
                <h3 className="text-lg font-bold text-primary font-headline">Vận chuyển</h3>
              </div>
              <div className="space-y-4">
                <div className={`p-3.5 border rounded-lg flex items-center justify-between bg-surface-container-low transition-colors ${storeConfig.shippingGhtkActive ? 'border-surface-container hover:border-primary' : 'border-outline-variant/30 opacity-70 grayscale'}`}>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-on-surface">GIAO HÀNG TIẾT KIỆM</span>
                    <span className={`text-[10px] font-bold mt-0.5 ${storeConfig.shippingGhtkActive ? 'text-green-600' : 'text-slate-500'}`}>
                      {storeConfig.shippingGhtkActive ? 'ĐÃ KẾT NỐI' : 'CHƯA KẾT NỐI'}
                    </span>
                  </div>
                  <div onClick={() => setStoreConfig({ ...storeConfig, shippingGhtkActive: !storeConfig.shippingGhtkActive })} className={`w-10 h-5 rounded-full relative cursor-pointer shadow-inner transition-colors ${storeConfig.shippingGhtkActive ? 'bg-primary' : 'bg-slate-300'}`}>
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all ${storeConfig.shippingGhtkActive ? 'right-1' : 'left-1'}`}></div>
                  </div>
                </div>
                <div className={`p-3.5 border rounded-lg flex items-center justify-between bg-surface-container-low transition-colors ${storeConfig.shippingGhnActive ? 'border-surface-container hover:border-primary' : 'border-outline-variant/30 opacity-70 grayscale'}`}>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-on-surface">GIAO HÀNG NHANH</span>
                    <span className={`text-[10px] font-bold mt-0.5 ${storeConfig.shippingGhnActive ? 'text-green-600' : 'text-slate-500'}`}>
                      {storeConfig.shippingGhnActive ? 'ĐÃ KẾT NỐI' : 'CHƯA KẾT NỐI'}
                    </span>
                  </div>
                  <div onClick={() => setStoreConfig({ ...storeConfig, shippingGhnActive: !storeConfig.shippingGhnActive })} className={`w-10 h-5 rounded-full relative cursor-pointer shadow-inner transition-colors ${storeConfig.shippingGhnActive ? 'bg-primary' : 'bg-slate-300'}`}>
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all ${storeConfig.shippingGhnActive ? 'right-1' : 'left-1'}`}></div>
                  </div>
                </div>
                <div className="pt-2">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2 block pl-1">Phí ship khu vực nội thành</label>
                  <div className="flex items-center bg-surface-container-lowest border border-surface-container rounded-lg px-4 py-2 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
                    <input
                      className="bg-transparent border-none outline-none focus:ring-0 text-sm font-bold w-full text-right p-0 text-on-surface"
                      type="text"
                      disabled={loading}
                      value={storeConfig.shippingFee || ''}
                      onChange={(e) => setStoreConfig({ ...storeConfig, shippingFee: e.target.value })}
                    />
                    <span className="ml-2 text-xs font-bold text-slate-400">VNĐ</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Quản lý Banner */}
          <BannerManager />

          {/* Flash Sale configuration */}
          <section className="lg:col-span-12 bg-surface p-6 rounded-xl shadow-sm border border-surface-container flex flex-col transition-colors duration-300">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <span className="p-2 bg-red-50 rounded-lg">
                  <span className="material-symbols-outlined text-error">bolt</span>
                </span>
                <h3 className="text-lg font-bold text-error font-headline">Chương trình Flash Sale (Giảm giá sốc)</h3>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-on-surface-variant">Trạng thái:</span>
                {flashSaleConfig.isActive ? (
                  <span className="bg-green-100 text-green-800 text-xs font-extrabold px-3 py-1 rounded-full flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-ping"></span>
                    ĐANG DIỄN RA
                  </span>
                ) : (
                  <span className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1 rounded-full">
                    ĐÃ KẾT THÚC / TẮT
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Cài đặt thời gian & phần trăm giảm */}
              <div className="lg:col-span-4 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider pl-1">Thời gian chạy (Giờ)</label>
                  <input
                    className="w-full bg-surface-container-lowest border border-surface-container focus:border-primary focus:ring-1 focus:ring-primary rounded-lg transition-all px-4 py-2.5 text-sm text-on-surface outline-none font-medium"
                    type="number"
                    min="1"
                    max="72"
                    value={flashSaleConfig.durationHours}
                    disabled={flashSaleConfig.isActive}
                    onChange={(e) => setFlashSaleConfig({ ...flashSaleConfig, durationHours: Number(e.target.value) })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider pl-1">Tỷ lệ giảm giá (%)</label>
                  <input
                    className="w-full bg-surface-container-lowest border border-surface-container focus:border-primary focus:ring-1 focus:ring-primary rounded-lg transition-all px-4 py-2.5 text-sm text-on-surface outline-none font-medium"
                    type="number"
                    min="5"
                    max="90"
                    value={flashSaleConfig.discountPercent}
                    disabled={flashSaleConfig.isActive}
                    onChange={(e) => setFlashSaleConfig({ ...flashSaleConfig, discountPercent: Number(e.target.value) })}
                  />
                </div>

                {flashSaleConfig.isActive && flashSaleConfig.endTime && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-lg space-y-1">
                    <p className="text-xs text-red-600 font-bold uppercase tracking-wider">Thời gian kết thúc dự kiến</p>
                    <p className="text-sm font-extrabold text-red-800">
                      {new Date(flashSaleConfig.endTime).toLocaleString('vi-VN')}
                    </p>
                  </div>
                )}
                {isAdmin && (
                  <div className="pt-2 flex flex-col gap-2">
                    {!flashSaleConfig.isActive ? (
                      <button
                        onClick={handleStartFlashSale}
                        disabled={isFlashSaleLoading || selectedProductIds.length === 0}
                        className="w-full bg-gradient-to-r from-red-600 to-orange-600 text-white py-3 rounded-lg font-bold text-sm shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isFlashSaleLoading ? (
                          <span className="material-symbols-outlined text-sm animate-spin">refresh</span>
                        ) : (
                          <span className="material-symbols-outlined text-sm">play_arrow</span>
                        )}
                        <span>Kích hoạt Flash Sale ({selectedProductIds.length} sp)</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleStopFlashSale}
                        disabled={isFlashSaleLoading}
                        className="w-full bg-slate-800 text-white py-3 rounded-lg font-bold text-sm shadow-md hover:bg-slate-900 active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                        {isFlashSaleLoading ? (
                          <span className="material-symbols-outlined text-sm animate-spin">refresh</span>
                        ) : (
                          <span className="material-symbols-outlined text-sm">stop</span>
                        )}
                        <span>Dừng chương trình Flash Sale</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Chọn sản phẩm tham gia sale */}
              <div className="lg:col-span-8 flex flex-col space-y-4">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider pl-1 shrink-0">
                      Sản phẩm tham gia Flash Sale ({selectedProductIds.length} đã chọn)
                    </label>
                    {!flashSaleConfig.isActive && selectedProductIds.length > 0 && (
                      <button
                        onClick={() => setSelectedProductIds([])}
                        className="text-[10px] font-bold text-red-600 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-md transition-all flex items-center gap-1 border border-red-200"
                      >
                        <span className="material-symbols-outlined text-sm">delete_sweep</span>
                        XOÁ TẤT CẢ
                      </button>
                    )}
                  </div>
                  {!flashSaleConfig.isActive && (
                    <div className="relative w-full max-w-xs">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <span className="material-symbols-outlined text-sm">search</span>
                      </span>
                      <input
                        type="text"
                        placeholder="Tìm sản phẩm..."
                        className="w-full pl-9 bg-surface-container-lowest border border-surface-container focus:border-primary focus:ring-1 focus:ring-primary rounded-lg transition-all py-1.5 px-3 text-xs text-on-surface outline-none"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                {!flashSaleConfig.isActive ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[320px] overflow-y-auto pr-2 border border-surface-container p-3 rounded-lg bg-surface-container-lowest">
                    {allProducts
                      .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map(product => {
                        const isSelected = selectedProductIds.includes(product.id);
                        const displayImage = getImageUrl(product.images?.find(img => img.is_primary)?.image_url || product.image_url);
                        return (
                          <div
                            key={product.id}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedProductIds(selectedProductIds.filter(id => id !== product.id));
                              } else {
                                setSelectedProductIds([...selectedProductIds, product.id]);
                              }
                            }}
                            className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-all ${isSelected ? 'border-primary bg-primary/5' : 'border-surface-container hover:bg-slate-50'
                              }`}
                          >
                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200">
                              {displayImage ? (
                                <img src={displayImage} alt={product.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }} />
                              ) : null}
                              <span className="material-symbols-outlined text-slate-400" style={{ display: displayImage ? 'none' : 'flex' }}>inventory_2</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-bold text-on-surface truncate">{product.name}</h4>
                              <p className="text-[10px] text-slate-500 font-medium">
                                {Number(product.price).toLocaleString('vi-VN')} VNĐ
                              </p>
                            </div>
                            <span className={`material-symbols-outlined text-sm ${isSelected ? 'text-primary' : 'text-slate-300'}`}>
                              {isSelected ? 'check_box' : 'check_box_outline_blank'}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 border border-surface-container rounded-lg bg-surface-container-low">
                    {flashSaleConfig.products && flashSaleConfig.products.length > 0 ? (
                      flashSaleConfig.products.map(product => {
                        const originalPrice = Number(product.price);
                        const discount = flashSaleConfig.discountPercent || 20;
                        const discountedPrice = originalPrice * (100 - discount) / 100;
                        const displayImage = getImageUrl(product.image_url);
                        return (
                          <div key={product.id} className="bg-white p-2 rounded-lg border border-surface-container relative">
                            <span className="absolute top-1 left-1 bg-red-600 text-white text-[8px] font-extrabold px-1 py-0.5 rounded">
                              -{discount}%
                            </span>
                            <div className="w-full h-20 rounded-md bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 mb-2">
                              {displayImage ? (
                                <img src={displayImage} alt={product.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }} />
                              ) : null}
                              <span className="material-symbols-outlined text-slate-400" style={{ display: displayImage ? 'none' : 'flex' }}>inventory_2</span>
                            </div>
                            <h5 className="text-[10px] font-bold text-on-surface truncate">{product.name}</h5>
                            <div className="flex flex-col mt-0.5">
                              <span className="text-[10px] font-bold text-red-600">{discountedPrice.toLocaleString('vi-VN')} đ</span>
                              <span className="text-[8px] text-slate-400 line-through">{originalPrice.toLocaleString('vi-VN')} đ</span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="col-span-full text-center text-xs text-on-surface-variant py-8">
                        Không có sản phẩm nào trong đợt sale này.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;