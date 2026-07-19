import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Footer from '../../components/Footer';
import { useLanguage } from '../../context/LanguageContext';
import ReviewModal from '../../components/ReviewModal';

import { API_BASE_URL } from '../../config/api.config';
import { AuthContext } from '../../context/AuthContext';
import { io } from 'socket.io-client';

const OrderDetail = () => {
  const { user } = useContext(AuthContext);
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, language, formatPrice, translateProductDescription } = useLanguage();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [settings, setSettings] = useState(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showReviewPrompt, setShowReviewPrompt] = useState(false);

  // States cho Bulk Review (đã chuyển sang dùng ReviewModal riêng)

  // BẢN VÁ: Xây dựng URL hình ảnh một cách chính xác
  const buildImageUrl = (path) => {
    if (!path) return 'https://via.placeholder.com/150?text=No+Image';
    if (path.startsWith('http')) return path;
    return `${API_BASE_URL}${path}`;
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        // Chỉ gọi API công khai để lấy cấu hình cửa hàng (Tên, QR Code, phí ship)
        // Tránh gọi vào /admin/settings nếu không phải quản trị viên để không bị lỗi 401
        const response = await fetch(`${API_BASE_URL}/api/v1/settings`, { headers });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            const fetchedConfig = result.data.storeConfig || result.data;
            setSettings(fetchedConfig);
          }
        }
      } catch (err) {
        console.error("Lỗi khi lấy cấu hình hệ thống:", err);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    const fetchOrderDetail = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }
        const response = await fetch(`${API_BASE_URL}/api/v1/orders/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();

        if (result.success) {
          setOrder(result.data);
        } else {
          toast.error(result.message || (language === 'vi' ? 'Không thể lấy thông tin đơn hàng' : 'Unable to retrieve order details'));
          navigate('/orders');
        }
      } catch (error) {
        console.error('Lỗi fetch chi tiết đơn hàng:', error);
        toast.error(language === 'vi' ? 'Lỗi kết nối đến server' : 'Server connection error');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetail();
  }, [id, navigate, language]);

  // Lắng nghe sự kiện Socket.IO để tự động tải lại dữ liệu chi tiết
  useEffect(() => {
    if (!user || !id) return;
    
    const socket = io(API_BASE_URL, { withCredentials: true });
    socket.emit('join_user_room', user.id);
    
    socket.on('order_updated', (data) => {
      // Chỉ cập nhật nếu event thuộc về đơn hàng hiện tại đang xem
      if (data.orderId && String(data.orderId) === String(id)) {
        console.log('🔄 Order detail updated:', data);
        toast.success(language === 'vi' ? 'Trạng thái đơn hàng vừa được cập nhật!' : 'Order status updated!', { id: 'order-detail-update' });
        
        const fetchOrderDetailBackground = async () => {
          try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/v1/orders/${id}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            if (result.success) {
              setOrder(result.data);
            }
          } catch (error) {
            console.error('Lỗi fetch chi tiết đơn hàng background:', error);
          }
        };
        fetchOrderDetailBackground();
      }
    });

    return () => socket.disconnect();
  }, [user, id, language]);

  const handleConfirmDelivered = async () => {
    setIsConfirming(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/v1/orders/${id}/delivered`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      const result = await response.json();
      if (result.success) {
        toast.success(language === 'vi' ? 'Tuyệt vời! Cảm ơn bạn đã mua sắm tại Aura K.' : 'Wonderful! Thank you for shopping at Aura K.');
        setOrder(prev => ({ ...prev, status: 'completed', status_text: language === 'vi' ? 'Thành công' : 'Completed' }));
        setShowReviewPrompt(true);
      } else {
        toast.error(result.message || (language === 'vi' ? 'Không thể xác nhận lúc này.' : 'Unable to confirm at this time.'));
      }
    } catch (error) {
      toast.error(language === 'vi' ? 'Lỗi kết nối đến máy chủ.' : 'Server connection error.');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleReportRisk = async () => {
    if (!window.confirm(language === 'vi' ? 'Bạn xác nhận rằng Shiper đã báo giao thành công nhưng bạn vẫn CHƯA nhận được hàng?' : 'Confirm that the courier reported successful delivery but you have NOT received it yet?')) return;

    setIsConfirming(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/v1/orders/${id}/risk`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      const result = await response.json();
      if (result.success) {
        toast.error(language === 'vi' ? 'Đã báo cáo Đơn hàng Rủi ro đến hệ thống quản lý.' : 'Reported order issue to management system.', { icon: '🚨' });
        setOrder(prev => ({ ...prev, status: 'at_risk', status_text: language === 'vi' ? 'Rủi ro' : 'At Risk' }));
      }
    } catch (error) {
      toast.error(language === 'vi' ? 'Lỗi kết nối đến máy chủ.' : 'Server connection error.');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleSelectReceiptFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleConfirmPaymentReceipt = async () => {
    if (!selectedFile) {
      toast.error(language === 'vi' ? 'Vui lòng chọn ảnh biên lai trước.' : 'Please select a receipt image first.');
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading(language === 'vi' ? 'Đang tải ảnh biên lai...' : 'Uploading receipt image...');
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('receipt', selectedFile);

      const res = await fetch(`${API_BASE_URL}/api/v1/orders/${id}/upload-receipt`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          language === 'vi'
            ? 'Đã tải lên ảnh chuyển khoản thành công! Bạn hãy chờ Admin xác nhận.'
            : 'Receipt uploaded successfully! Please wait for Admin verification.',
          { id: toastId }
        );
        // Cập nhật state order để hiển thị biên lai ngay lập tức
        setOrder(prev => ({ ...prev, payment_receipt: data.receiptUrl }));
        setSelectedFile(null);
        setPreviewUrl(null);
      } else {
        toast.error(data.message || (language === 'vi' ? 'Lỗi khi tải ảnh lên.' : 'Error uploading receipt.'), { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error(language === 'vi' ? 'Không thể kết nối đến máy chủ.' : 'Unable to connect to server.', { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) return <div className="min-h-screen pt-32 text-center text-slate-500 font-bold">{language === 'vi' ? 'Đang tải thông tin đơn hàng...' : 'Loading order details...'}</div>;
  if (!order) return <div className="min-h-screen pt-32 text-center text-slate-500">{language === 'vi' ? 'Không tìm thấy đơn hàng' : 'Order not found'}</div>;

  const estimatedDelivery = order?.created_at ? new Date(new Date(order.created_at).getTime() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US') : '';

  return (
    <div className="bg-gray-50 text-gray-900 min-h-screen flex flex-col font-sans">
      <main className="pt-32 pb-20 px-4 sm:px-8 max-w-4xl mx-auto flex-grow w-full">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/orders" className="text-gray-500 hover:text-blue-600 transition-colors flex items-center justify-center p-2 rounded-full hover:bg-gray-200">
            <span className="material-symbols-outlined text-2xl">arrow_back</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{fontFamily: "'Playfair Display', serif"}}>
            {language === 'vi' ? 'Chi tiết đơn hàng' : 'Order Details'}{' '}
            <span className="text-blue-600">{order.order_code || `#ORD-${order.id}`}</span>
          </h1>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-200 space-y-8">
          {/* Box Trạng thái */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-100 pb-6 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">
                {language === 'vi' ? 'Ngày đặt:' : 'Date:'}{' '}
                <span className="font-semibold text-gray-900">{new Date(order.created_at).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
              </p>
              <p className="text-sm text-gray-500">
                {language === 'vi' ? 'Thanh toán:' : 'Payment:'}{' '}
                <span className="font-semibold text-gray-900">
                  {order.payment_method === 'cod' ? t('checkout.cod') : t('checkout.onlinePayment')}
                </span>
              </p>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-bold border ${order.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' : (order.status === 'cancelled' || order.status === 'at_risk') ? 'bg-red-50 text-red-700 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
              {language === 'vi' ? order.status_text : (
                order.status === 'completed' ? 'Success' :
                  order.status === 'cancelled' ? 'Cancelled' :
                    order.status === 'pending' ? 'Pending' :
                      order.status === 'shipping' ? 'Shipping' :
                        order.status === 'processing' ? 'Processing' : 'Pending'
              )}
            </span>
          </div>

          {/* THANH TRẠNG THÁI ĐƠN HÀNG (STEPPER) */}
          <div className="py-2 sm:py-6 border-b border-gray-100 mb-6">
            {(order.status === 'cancelled' || order.status === 'at_risk') ? (
              <div className="bg-red-50 border border-red-200 p-6 rounded-xl flex flex-col items-center justify-center text-red-600">
                <span className="material-symbols-outlined text-5xl mb-2">{order.status === 'at_risk' ? 'warning' : 'cancel'}</span>
                <h3 className="font-bold text-xl mb-1">
                  {order.status === 'at_risk' ? (language === 'vi' ? 'Đơn hàng gặp sự cố rủi ro' : 'Order Issue / At Risk') : (language === 'vi' ? 'Đơn hàng đã bị hủy' : 'Order Cancelled')}
                </h3>
                <p className="text-sm text-center">
                  {order.status === 'at_risk'
                    ? (language === 'vi' ? 'Đơn hàng đã được đánh dấu là chưa nhận được hàng. Shop sẽ liên hệ với bạn sớm nhất. Nếu bạn đã nhận được hàng, vui lòng xác nhận bên dưới.' : 'The order has been marked as not received. We will contact you soon. If you have received it, please confirm below.')
                    : (language === 'vi' ? 'Rất tiếc vì đơn hàng này không thể hoàn tất.' : 'We are sorry that this order could not be completed.')
                  }
                </p>
              </div>
            ) : (
              <div className="relative flex justify-between items-start w-full max-w-3xl mx-auto mt-4">
                {/* Đường line xám nền */}
                <div className="absolute left-0 top-5 sm:top-6 -translate-y-1/2 w-full h-1.5 bg-gray-200 z-0 rounded-full"></div>
                {/* Đường line xanh báo tiến độ */}
                <div
                  className="absolute left-0 top-5 sm:top-6 -translate-y-1/2 h-1.5 bg-blue-600 transition-all duration-1000 ease-in-out z-0 rounded-full"
                  style={{
                    width:
                      ['pending', 'processing', 'shipped', 'delivered', 'completed'].indexOf(order.status) === 0 ? '0%' :
                        ['pending', 'processing', 'shipped', 'delivered', 'completed'].indexOf(order.status) === 1 ? '25%' :
                          ['pending', 'processing', 'shipped', 'delivered', 'completed'].indexOf(order.status) === 2 ? '50%' :
                            ['pending', 'processing', 'shipped', 'delivered', 'completed'].indexOf(order.status) === 3 ? '75%' :
                              ['pending', 'processing', 'shipped', 'delivered', 'completed'].indexOf(order.status) === 4 ? '100%' : '0%'
                  }}
                ></div>

                {/* Các vòng tròn Trạng thái */}
                {[
                  { id: 'pending', label: language === 'vi' ? 'Chờ xác nhận' : 'Pending', icon: 'inventory_2' },
                  { id: 'processing', label: language === 'vi' ? 'Đang xử lý' : 'Processing', icon: 'autorenew' },
                  { id: 'shipped', label: language === 'vi' ? 'Đang giao' : 'Shipping', icon: 'local_shipping' },
                  { id: 'delivered', label: language === 'vi' ? 'Đã giao' : 'Delivered', icon: 'inbox' },
                  { id: 'completed', label: language === 'vi' ? 'Thành công' : 'Completed', icon: 'check_circle' },
                ].map((step, index) => {
                  const currentIndex = ['pending', 'processing', 'shipped', 'delivered', 'completed'].indexOf(order.status);
                  const isCompleted = index <= currentIndex;
                  const isCurrent = index === currentIndex;

                  return (
                    <div key={step.id} className="relative z-10 flex flex-col items-center gap-2 w-16 sm:w-20">
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border-4 transition-colors duration-500 bg-white ${isCompleted ? 'border-blue-600 text-blue-600' : 'border-gray-200 text-gray-300'} ${isCurrent ? 'ring-4 ring-blue-500/20 shadow-lg scale-110' : ''}`}>
                        <span className="material-symbols-outlined text-lg sm:text-xl">{step.icon}</span>
                      </div>
                      <div className="text-center mt-1">
                        <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${isCompleted ? 'text-blue-600' : 'text-gray-400'}`}>{step.label}</span>

                        {/* Hiển thị ngày dự kiến nhận hàng cho mục Đang giao */}
                        {step.id === 'shipped' && order.status !== 'delivered' && order.status !== 'cancelled' && (
                          <p className="text-[9px] sm:text-[10px] text-amber-600 font-bold mt-1.5 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 whitespace-nowrap">
                            {language === 'vi' ? `Dự kiến: ${estimatedDelivery}` : `Estimated: ${estimatedDelivery}`}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Thông tin giao hàng */}
          <div>
            <h3 className="text-lg font-bold mb-4" style={{fontFamily: "'Playfair Display', serif"}}>{language === 'vi' ? 'Thông tin nhận hàng' : 'Shipping Details'}</h3>
            <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
              <p className="font-bold text-gray-900 text-lg">{order.customer_name}</p>
              <p className="text-sm text-gray-600 mt-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">call</span> {order.customer_phone}
              </p>
              <p className="text-sm text-gray-600 mt-1 flex items-start gap-2">
                <span className="material-symbols-outlined text-sm mt-0.5">location_on</span> {order.shipping_address}
              </p>
              {order.notes && (
                <p className="text-sm text-amber-700 mt-3 font-medium bg-amber-50 p-3 rounded-lg border border-amber-100">
                  {language === 'vi' ? `Ghi chú: ${order.notes}` : `Notes: ${order.notes}`}
                </p>
              )}
            </div>
          </div>

          {/* Payment Receipt Upload/Display Box */}
          {['bank_transfer', 'credit_card'].includes(order.payment_method) && (
            <div>
              <h3 className="text-lg font-bold mb-4" style={{fontFamily: "'Playfair Display', serif"}}>
                {language === 'vi' ? 'Thanh toán & Gửi biên lai' : 'Payment & Upload Receipt'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-5 rounded-xl border border-gray-200">
                {/* Cột 1: Thông tin chuyển khoản & QR Code */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-gray-900">
                    {order.payment_method === 'bank_transfer'
                      ? (language === 'vi' ? '1. Quét mã QR để chuyển khoản' : '1. Scan QR to Transfer')
                      : (language === 'vi' ? '1. Quét mã QR MoMo' : '1. Scan MoMo QR')
                    }
                  </h4>

                  {settings ? (
                    <div className="p-4 bg-white rounded-xl border border-gray-200 flex flex-col items-center shadow-sm">
                      {order.payment_method === 'bank_transfer' && (
                        settings.paymentVcbQr ? (
                          <img src={buildImageUrl(settings.paymentVcbQr)} alt="Vietcombank QR" className="w-48 h-48 object-contain mb-3" />
                        ) : (
                          <div className="w-48 h-48 bg-gray-100 flex items-center justify-center text-center text-xs text-gray-500 p-4 rounded mb-3">
                            {language === 'vi' ? 'Chưa cấu hình mã QR Vietcombank' : 'Vietcombank QR code not configured'}
                          </div>
                        )
                      )}

                      {order.payment_method === 'credit_card' && (
                        settings.paymentMomoQr ? (
                          <img src={buildImageUrl(settings.paymentMomoQr)} alt="MoMo QR" className="w-48 h-48 object-contain mb-3" />
                        ) : (
                          <div className="w-48 h-48 bg-gray-100 flex items-center justify-center text-center text-xs text-gray-500 p-4 rounded mb-3">
                            {language === 'vi' ? 'Chưa cấu hình mã QR MoMo' : 'MoMo QR code not configured'}
                          </div>
                        )
                      )}

                      <div className="text-left bg-blue-50 p-4 rounded-lg w-full border border-blue-100 text-xs font-mono space-y-1.5 text-blue-900">
                        <p><strong>{language === 'vi' ? 'Tên Shop:' : 'Shop Name:'}</strong> {settings.name || 'Shop Aura'}</p>
                        <p><strong>{language === 'vi' ? 'Số tiền:' : 'Amount:'}</strong> <span className="text-blue-600 font-bold">{formatPrice(order.total_amount || order.total || 0)}</span></p>
                        <p><strong>{language === 'vi' ? 'Nội dung CK:' : 'Transfer Message:'}</strong> <span className="bg-blue-600 text-white px-2 py-0.5 rounded font-bold ml-1">#ORD-00{order.id}</span></p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-white rounded-xl border border-gray-200 text-center text-xs text-gray-500">
                      {language === 'vi' ? 'Đang tải thông tin tài khoản shop...' : 'Loading shop account details...'}
                    </div>
                  )}
                </div>

                {/* Cột 2: Trạng thái & Tải lên biên lai */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-gray-900">
                    {language === 'vi' ? '2. Trạng thái & Gửi biên lai' : '2. Status & Submit Receipt'}
                  </h4>

                  {/* Hiển thị biên lai hiện tại nếu đã có */}
                  {order.payment_receipt && (
                    <div className="p-4 bg-white rounded-xl border border-gray-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-1 rounded border border-green-200">
                          {language === 'vi' ? 'Đã gửi biên lai' : 'Receipt submitted'}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {language === 'vi' ? 'Đang chờ duyệt' : 'Awaiting approval'}
                        </span>
                      </div>
                      <a
                        href={buildImageUrl(order.payment_receipt)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block relative group overflow-hidden rounded border border-gray-200 max-h-32 bg-gray-50 text-center"
                      >
                        <img
                          src={buildImageUrl(order.payment_receipt)}
                          alt="Current Receipt"
                          className="mx-auto object-contain max-h-32 group-hover:scale-105 transition-transform cursor-zoom-in"
                        />
                      </a>
                    </div>
                  )}

                  {/* Cho phép tải lên mới nếu đơn hàng đang pending */}
                  {order.status === 'pending' ? (
                    <div className="space-y-3">
                      {/* Vùng chọn file */}
                      <input
                        type="file"
                        accept="image/*"
                        id="receipt-upload"
                        className="hidden"
                        onChange={handleSelectReceiptFile}
                      />

                      {!previewUrl ? (
                        <label
                          htmlFor="receipt-upload"
                          className="px-4 py-8 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all text-center flex flex-col items-center justify-center gap-3 bg-white min-h-[140px]"
                        >
                          <span className="material-symbols-outlined text-3xl text-blue-500">add_photo_alternate</span>
                          <span className="text-sm font-semibold text-blue-600">
                            {language === 'vi' ? 'Bấm để thêm ảnh chụp biên lai' : 'Click to add receipt photo'}
                          </span>
                        </label>
                      ) : (
                        <div className="p-4 bg-white rounded-xl border border-blue-200 space-y-3 text-center shadow-sm">
                          <p className="text-xs font-bold text-gray-600">
                            {language === 'vi' ? 'Ảnh biên lai đã chọn:' : 'Selected receipt:'}
                          </p>
                          <img
                            src={previewUrl}
                            alt="Receipt Preview"
                            className="mx-auto max-h-32 object-contain rounded border border-gray-200"
                          />
                          <div className="flex gap-2 justify-center pt-2">
                            <button
                              onClick={() => {
                                setSelectedFile(null);
                                setPreviewUrl(null);
                              }}
                              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-colors"
                            >
                              {language === 'vi' ? 'Hủy chọn' : 'Cancel'}
                            </button>
                            <label
                              htmlFor="receipt-upload"
                              className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-bold rounded-lg cursor-pointer transition-colors"
                            >
                              {language === 'vi' ? 'Chọn ảnh khác' : 'Change image'}
                            </label>
                          </div>
                        </div>
                      )}

                      {/* Nút bấm xác nhận gửi đã thanh toán */}
                      {selectedFile && (
                        <button
                          onClick={handleConfirmPaymentReceipt}
                          disabled={isUploading}
                          className="w-full py-3.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all shadow-md text-sm flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                        >
                          <span className="material-symbols-outlined text-lg">check_circle</span>
                          {isUploading
                            ? (language === 'vi' ? 'Đang gửi...' : 'Submitting...')
                            : (language === 'vi' ? 'Xác nhận đã thanh toán' : 'Confirm Paid')
                          }
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-100 rounded-xl text-center text-xs text-gray-500">
                      {language === 'vi'
                        ? 'Đơn hàng này không ở trạng thái Chờ thanh toán, không thể gửi biên lai mới.'
                        : 'This order is not pending payment, cannot submit a new receipt.'
                      }
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Danh sách sản phẩm */}
          <div>
            <h3 className="text-lg font-bold mb-4" style={{fontFamily: "'Playfair Display', serif"}}>{language === 'vi' ? 'Sản phẩm đã mua' : 'Purchased Items'}</h3>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {order.items && order.items.map((item, index) => (
                <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border border-gray-200 p-4 rounded-xl hover:shadow-md transition-shadow bg-white">
                  <Link to={`/product/${item.product_id}`}>
                    <img
                      src={buildImageUrl(item.image || item.image_url)}
                      alt={item.name}
                      onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/150?text=No+Image'; }}
                      className="w-24 h-24 object-cover rounded-xl border border-gray-100 bg-gray-50"
                    />
                  </Link>
                  <div className="flex-1 w-full">
                    <Link to={`/product/${item.product_id}`} className="font-bold text-gray-900 hover:text-blue-600 line-clamp-2 transition-colors">{item.name}</Link>
                    {item.description && (
                      <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 italic">
                        {translateProductDescription(item.description)}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2">
                      <p className="text-xs text-gray-600 bg-gray-100 px-2.5 py-1 rounded-md font-medium">Size: <strong className="text-gray-900">{item.size}</strong></p>
                      <p className="text-xs text-gray-600 bg-gray-100 px-2.5 py-1 rounded-md font-medium">
                        {language === 'vi' ? 'SL: ' : 'Qty: '}<strong className="text-gray-900">{item.quantity}</strong>
                      </p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right mt-2 sm:mt-0 w-full sm:w-auto bg-gray-50 sm:bg-transparent p-2 sm:p-0 rounded-lg">
                    <p className="font-bold text-blue-600 text-lg">{formatPrice(item.price * item.quantity)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chi tiết thanh toán */}
          <div className="border-t border-gray-200 pt-6 space-y-3 bg-gray-50 p-6 rounded-xl mt-6">
            <div className="flex justify-between text-gray-600 text-sm">
              <span className="font-medium">{t('cart.subtotal')}</span>
              <span className="font-semibold text-gray-900">{formatPrice(order.subtotal || 0)}</span>
            </div>
            <div className="flex justify-between text-gray-600 text-sm">
              <span className="font-medium">{language === 'vi' ? 'Phí vận chuyển' : 'Shipping Fee'}</span>
              <span className="font-semibold text-gray-900">{formatPrice(order.shipping_fee || 0)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-red-600 text-sm">
                <span className="font-medium">{t('cart.discount')}</span>
                <span className="font-semibold">-{formatPrice(order.discount)}</span>
              </div>
            )}
            {order.coupon_code && (
              <div className="flex justify-between text-gray-600 text-sm">
                <span className="font-medium">{t('cart.voucher')}</span>
                <span className="font-semibold text-blue-600 bg-blue-50 px-2 rounded">{order.coupon_code}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-4 mt-2 border-t border-gray-200">
              <span className="text-lg font-bold uppercase tracking-wide text-gray-900">{t('cart.total')}</span>
              <span className="text-2xl font-black text-blue-600">{formatPrice(order.total_amount || 0)}</span>
            </div>
          </div>

          {/* Nút Thao tác của khách hàng */}
          {(order.status === 'delivered' || order.status === 'at_risk') && (
            <div className="pt-2 flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
              {order.status === 'delivered' && (
                <button
                  onClick={handleReportRisk}
                  disabled={isConfirming}
                  className="px-6 py-3 bg-white text-red-600 border border-red-200 font-bold rounded-xl shadow-sm hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                >
                  {language === 'vi' ? 'Chưa nhận được hàng' : 'Not Received Yet'}
                  <span className="material-symbols-outlined text-base">warning</span>
                </button>
              )}
              <button
                onClick={handleConfirmDelivered}
                disabled={isConfirming}
                className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-wait flex items-center justify-center gap-2"
              >
                {isConfirming ? (language === 'vi' ? 'Đang xử lý...' : 'Processing...') : (language === 'vi' ? 'Đã nhận được hàng' : 'Received Order')}
                <span className="material-symbols-outlined text-base">check_circle</span>
              </button>
            </div>
          )}
          {order.status === 'pending' && (
            <div className="pt-2 flex justify-end items-center">
              <p className="text-sm text-gray-500 italic mr-4 hidden sm:block">
                {language === 'vi' ? 'Đơn hàng đang chờ Admin xác nhận.' : 'Order is pending admin confirmation.'}
              </p>
              <button
                onClick={() => {
                  toast(language === 'vi' ? 'Vui lòng vào trang Lịch sử đơn hàng để chọn lý do hủy đơn!' : 'Please go to Order History to select a cancellation reason!', { icon: 'ℹ️' });
                  navigate('/orders');
                }}
                className="px-6 py-3 bg-white text-red-600 font-bold rounded-xl border border-red-200 shadow-sm hover:bg-red-50 transition-all flex items-center justify-center gap-2"
              >
                {language === 'vi' ? 'Hủy đơn hàng' : 'Cancel Order'}
                <span className="material-symbols-outlined text-base">cancel</span>
              </button>
            </div>
          )}
        </div>
      </main>
      <Footer />

      <ReviewModal 
        isOpen={showReviewPrompt} 
        onClose={() => setShowReviewPrompt(false)} 
        items={order.items}
        language={language}
      />
    </div>
  );
};

export default OrderDetail;
