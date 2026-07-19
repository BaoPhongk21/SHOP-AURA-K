import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { AuthContext } from '../../context/AuthContext';
import Footer from '../../components/Footer';
import AccountSidebar from '../../components/AccountSidebar';
import { useLanguage } from '../../context/LanguageContext';
import ReviewModal from '../../components/ReviewModal';

import { API_BASE_URL } from '../../config/api.config';
import { io } from 'socket.io-client';

const OrderHistory = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const { t, language, formatPrice } = useLanguage();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // States cho tính năng hủy đơn hàng
  const [isRetrying, setIsRetrying] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  // States cho tính năng Đánh giá sản phẩm
  const [reviewOrder, setReviewOrder] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // States cho Lọc (Tabs) và Phân trang (Pagination)
  const [activeTab, setActiveTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const predefinedReasons = language === 'vi' ? [
    "Thay đổi ý định (Không muốn mua nữa)",
    "Tìm thấy giá rẻ hơn ở nơi khác",
    "Muốn cập nhật thêm/bớt sản phẩm hoặc đổi size",
    "Muốn thay đổi địa chỉ hoặc số điện thoại giao hàng",
    "Thời gian giao hàng dự kiến quá lâu",
    "Khác"
  ] : [
    "Changed my mind (No longer want to buy)",
    "Found a cheaper price elsewhere",
    "Want to add/remove items or change size",
    "Want to change delivery address or phone number",
    "Expected delivery time is too long",
    "Other"
  ];

  // BẢN VÁ: Xây dựng URL hình ảnh một cách chính xác
  const buildImageUrl = (path) => {
    if (!path) return 'https://via.placeholder.com/150?text=No+Image';
    if (path.startsWith('http')) return path;
    return `${API_BASE_URL}${path}`;
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/v1/orders/my-orders`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (response.ok && data.success) {
          setOrders(data.data || []);
        } else {
          toast.error(data.message || (language === 'vi' ? "Không thể tải danh sách đơn hàng." : "Unable to load order history."));
        }
      } catch (error) {
        console.error("Lỗi fetch đơn hàng:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user, navigate, language]);

  // Lắng nghe sự kiện Socket.IO để tự động tải lại dữ liệu
  useEffect(() => {
    if (!user) return;
    
    const socket = io(API_BASE_URL, { withCredentials: true });
    socket.emit('join_user_room', user.id);
    
    socket.on('order_updated', (data) => {
      console.log('🔄 Order updated:', data);
      toast.success(language === 'vi' ? 'Trạng thái đơn hàng vừa được cập nhật!' : 'Order status updated!', { id: 'order-update' });
      
      const fetchOrdersBackground = async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`${API_BASE_URL}/api/v1/orders/my-orders`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const result = await response.json();
          if (response.ok && result.success) {
            setOrders(result.data || []);
          }
        } catch (error) {
          console.error("Lỗi fetch đơn hàng background:", error);
        }
      };
      fetchOrdersBackground();
    });

    return () => socket.disconnect();
  }, [user, language]);

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success(language === 'vi' ? 'Bạn đã đăng xuất.' : 'You have logged out.');
  };

  const openCancelModal = (orderId) => {
    setSelectedOrderId(orderId);
    setCancelReason('');
    setOtherReason('');
    setShowCancelModal(true);
  };

  const handleCancelOrder = async () => {
    if (!cancelReason) return;

    const finalReason = cancelReason === (language === 'vi' ? 'Khác' : 'Other') ? otherReason : cancelReason;
    if (cancelReason === (language === 'vi' ? 'Khác' : 'Other') && !finalReason.trim()) {
      toast.error(language === 'vi' ? 'Vui lòng nhập lý do hủy đơn của bạn!' : 'Please enter your reason for cancellation!');
      return;
    }

    setIsCancelling(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/v1/orders/${selectedOrderId}/cancel`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ reason: finalReason, status: 'cancelled' })
      });

      const result = await response.json();
      if (response.ok && result.success !== false) {
        toast.success(language === 'vi' ? 'Hủy đơn hàng thành công!' : 'Order cancelled successfully!');
        setOrders(prevOrders => prevOrders.map(order =>
          order.id === selectedOrderId ? { ...order, status: 'cancelled', status_text: language === 'vi' ? 'Đã hủy' : 'Cancelled' } : order
        ));
        setShowCancelModal(false);
      } else {
        toast.error(result.message || (language === 'vi' ? 'Không thể hủy đơn hàng lúc này.' : 'Unable to cancel order at this time.'));
      }
    } catch (error) {
      toast.error(language === 'vi' ? 'Lỗi kết nối đến server.' : 'Server connection error.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleConfirmDelivered = async (orderId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/v1/orders/${orderId}/delivered`, {
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
        setOrders(prevOrders => prevOrders.map(order =>
          order.id === orderId ? { ...order, status: 'completed', status_text: language === 'vi' ? 'Thành công' : 'Completed' } : order
        ));
        
        // Fetch chi tiết đơn hàng để lấy danh sách sản phẩm phục vụ đánh giá
        try {
          const detailRes = await fetch(`${API_BASE_URL}/api/v1/orders/${orderId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const detailData = await detailRes.json();
          if (detailData.success && detailData.data) {
            setReviewOrder(detailData.data);
            setShowReviewModal(true);
          }
        } catch (err) {
          console.error("Lỗi khi fetch chi tiết đơn để đánh giá", err);
        }

      } else {
        toast.error(result.message || (language === 'vi' ? 'Không thể xác nhận lúc này.' : 'Unable to confirm at this time.'));
      }
    } catch (error) {
      toast.error(language === 'vi' ? 'Lỗi kết nối đến máy chủ.' : 'Server connection error.');
    }
  };

  const handleRetryPayment = async (orderId) => {
    setIsRetrying(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/v1/orders/${orderId}/retry-payment`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const result = await response.json();
      if (response.ok && result.success && result.paymentUrl) {
        window.location.href = result.paymentUrl;
      } else {
        toast.error(result.message || (language === 'vi' ? 'Không thể tạo lại link thanh toán.' : 'Unable to recreate payment link.'));
      }
    } catch (error) {
      toast.error(language === 'vi' ? 'Lỗi kết nối đến server.' : 'Server connection error.');
    } finally {
      setIsRetrying(false);
    }
  };

  // Reset trang về 1 khi thay đổi Tab bộ lọc
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const getFilteredOrders = () => {
    switch (activeTab) {
      case 'paid':
        return orders.filter(order => ['processing', 'shipped', 'delivered', 'completed'].includes(order.status));
      case 'unpaid':
        return orders.filter(order => order.status === 'pending');
      case 'cancelled':
        return orders.filter(order => ['cancelled', 'at_risk'].includes(order.status));
      case 'all':
      default:
        return orders;
    }
  };

  const filteredOrders = getFilteredOrders();
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const displayedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (!user) return null;

  return (
    <div className="bg-surface text-on-surface antialiased min-h-screen flex flex-col">
      <Toaster position="top-center" />

      <main className="pt-32 pb-20 px-8 max-w-7xl mx-auto flex flex-col md:flex-row gap-12 flex-grow w-full">
        <AccountSidebar />

        <section className="flex-1 space-y-8">
          <header>
            <h1 className="text-4xl font-bold tracking-tight text-primary mb-2 font-headline">
              {language === 'vi' ? 'Lịch sử đơn hàng' : 'Order History'}
            </h1>
            <p className="text-on-surface-variant text-lg">
              {language === 'vi' ? 'Quản lý và theo dõi trạng thái các đơn hàng của bạn.' : 'Manage and track your order history status.'}
            </p>
          </header>

          {/* Tabs/Filters */}
          <div className="flex flex-wrap gap-2 border-b border-outline-variant/20 pb-4">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'all' ? 'bg-primary text-white shadow-md' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'}`}
            >
              <span>{language === 'vi' ? 'Đã đặt' : 'All Placed'}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === 'all' ? 'bg-white/20 text-white' : 'bg-surface-container-high text-on-surface-variant'}`}>{orders.length}</span>
            </button>
            <button
              onClick={() => setActiveTab('paid')}
              className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'paid' ? 'bg-green-600 text-white shadow-md' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'}`}
            >
              <span>{language === 'vi' ? 'Đã thanh toán' : 'Paid'}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === 'paid' ? 'bg-white/20 text-white' : 'bg-surface-container-high text-on-surface-variant'}`}>{orders.filter(o => ['processing', 'shipped', 'delivered', 'completed'].includes(o.status)).length}</span>
            </button>
            <button
              onClick={() => setActiveTab('unpaid')}
              className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'unpaid' ? 'bg-amber-600 text-white shadow-md' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'}`}
            >
              <span>{language === 'vi' ? 'Chưa thanh toán' : 'Unpaid'}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === 'unpaid' ? 'bg-white/20 text-white' : 'bg-surface-container-high text-on-surface-variant'}`}>{orders.filter(o => o.status === 'pending').length}</span>
            </button>
            <button
              onClick={() => setActiveTab('cancelled')}
              className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'cancelled' ? 'bg-error text-white shadow-md' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'}`}
            >
              <span>{language === 'vi' ? 'Đã hủy' : 'Cancelled'}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === 'cancelled' ? 'bg-white/20 text-white' : 'bg-surface-container-high text-on-surface-variant'}`}>{orders.filter(o => ['cancelled', 'at_risk'].includes(o.status)).length}</span>
            </button>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="p-8 text-center text-on-surface-variant font-bold">
                {language === 'vi' ? 'Đang tải danh sách đơn hàng...' : 'Loading order history...'}
              </div>
            ) : orders.length === 0 ? (
              <div className="bg-surface-container-lowest p-12 text-center rounded-xl border border-outline-variant/10">
                <span className="material-symbols-outlined text-6xl text-outline-variant mb-4">inventory_2</span>
                <h3 className="text-xl font-bold mb-2">{language === 'vi' ? 'Bạn chưa có đơn hàng nào' : 'You do not have any orders yet'}</h3>
                <p className="text-on-surface-variant mb-6">
                  {language === 'vi' ? 'Hãy khám phá các sản phẩm tuyệt vời của chúng tôi nhé.' : 'Let\'s explore our beautiful products.'}
                </p>
                <Link to="/products" className="inline-block px-8 py-3 bg-primary text-white font-bold rounded-lg shadow-md hover:opacity-90">
                  {language === 'vi' ? 'Mua sắm ngay' : 'Shop Now'}
                </Link>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="bg-surface-container-lowest p-12 text-center rounded-xl border border-outline-variant/10">
                <span className="material-symbols-outlined text-6xl text-outline-variant mb-4">inventory_2</span>
                <h3 className="text-xl font-bold mb-2">
                  {language === 'vi' ? 'Không tìm thấy đơn hàng phù hợp' : 'No matching orders found'}
                </h3>
                <p className="text-on-surface-variant">
                  {language === 'vi' ? 'Bạn không có đơn hàng nào trong danh mục này.' : 'You do not have any orders in this category.'}
                </p>
              </div>
            ) : (
              displayedOrders.map(order => (
                <div key={order.id} className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div className="flex items-start gap-4">
                    {order.first_product_image ? (
                      <img src={buildImageUrl(order.first_product_image)} alt={order.first_product_name || "Product"} className="w-16 h-16 object-cover rounded-lg border border-outline-variant/20 bg-surface-container-low" />
                    ) : (
                      <div className={`w-16 h-16 rounded-lg flex items-center justify-center text-white ${order.status === 'completed' ? 'bg-green-500' : (order.status === 'cancelled' || order.status === 'at_risk') ? 'bg-red-500' : 'bg-primary'}`}>
                        <span className="material-symbols-outlined">
                          {order.status === 'completed' ? 'check_circle' : order.status === 'cancelled' ? 'cancel' : order.status === 'at_risk' ? 'warning' : 'local_shipping'}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-on-surface-variant font-medium tracking-wide mb-1">
                        {language === 'vi' ? 'Mã đơn:' : 'Order Code:'} <span className="text-primary font-bold">{order.order_code}</span>
                      </p>
                      <p className="text-xs text-outline font-medium mb-1">
                        {language === 'vi' ? 'Ngày đặt:' : 'Date:'} {order.created_at ? new Date(order.created_at).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : (language === 'vi' ? 'Không rõ' : 'Unknown')}
                      </p>
                      {order.first_product_name && (
                        <p className="text-xs text-on-surface font-medium line-clamp-1">
                          {order.first_product_name} {order.total_items > 1 ? (language === 'vi' ? `và ${order.total_items - 1} sản phẩm khác` : `and ${order.total_items - 1} other items`) : ''}
                        </p>
                      )}
                      <span className={`inline-block px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold mt-2 ${order.status === 'completed' ? 'bg-green-100 text-green-700 border border-green-200' : (order.status === 'cancelled' || order.status === 'at_risk') ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>
                        {language === 'vi' ? order.status_text : (
                          order.status === 'completed' ? 'Success' :
                            order.status === 'cancelled' ? 'Cancelled' :
                              order.status === 'pending' ? 'Pending' :
                                order.status === 'shipping' ? 'Shipping' :
                                  order.status === 'processing' ? 'Processing' : 'Pending'
                        )}
                      </span>
                      {order.coupon_code && (
                        <span className="inline-block ml-2 px-2 py-0.5 rounded bg-primary/5 text-primary text-[10px] font-bold border border-primary/10">
                          <span className="material-symbols-outlined text-[10px] align-middle mr-1">sell</span>
                          {order.coupon_code}
                        </span>
                      )}
                      {order.status === 'pending' && ['bank_transfer', 'credit_card'].includes(order.payment_method) && (
                        <span className={`inline-block md:ml-2 px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold mt-2 ${order.payment_receipt ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-red-100 text-red-700 border border-red-200 animate-pulse'}`}>
                          {language === 'vi'
                            ? (order.payment_receipt ? 'Đang duyệt biên lai' : 'Chưa thanh toán')
                            : (order.payment_receipt ? 'Awaiting verification' : 'Unpaid')
                          }
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-left md:text-right w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0 border-outline-variant/20 flex flex-row md:flex-col justify-between items-center md:items-end">
                    <p className="font-extrabold text-lg text-on-surface mb-0 md:mb-3">{formatPrice(order.total_amount || 0)}</p>

                    <div className="flex gap-2">
                      {order.status === 'delivered' && (
                        <button
                          onClick={() => handleConfirmDelivered(order.id)}
                          className="px-6 py-2 bg-primary text-white font-bold rounded-lg hover:brightness-110 transition-colors text-sm shadow-sm"
                        >
                          {language === 'vi' ? 'Đã nhận hàng' : 'Received'}
                        </button>
                      )}
                      {order.status === 'pending' && (order.payment_method === 'credit_card' || order.payment_method === 'bank_transfer') && (
                        <button
                          onClick={() => {
                            if (['bank_transfer', 'credit_card'].includes(order.payment_method)) {
                              navigate(`/orders/${order.id}`);
                            } else {
                              handleRetryPayment(order.id);
                            }
                          }}
                          disabled={isRetrying}
                          className="px-6 py-2 bg-green-50 text-green-600 font-bold rounded-lg hover:bg-green-600 hover:text-white transition-colors text-sm shadow-sm disabled:opacity-50"
                        >
                          {isRetrying ? (
                            language === 'vi' ? 'Đang tải...' : 'Loading...'
                          ) : (
                            language === 'vi'
                              ? (order.payment_receipt ? 'Gửi lại bill' : 'Thanh toán lại')
                              : (order.payment_receipt ? 'Re-submit Bill' : 'Pay Again')
                          )}
                        </button>
                      )}
                      {['pending', 'processing'].includes(order.status) && (
                        <button
                          onClick={() => openCancelModal(order.id)}
                          className="px-6 py-2 bg-error/10 text-error font-bold rounded-lg hover:bg-error hover:text-white transition-colors text-sm shadow-sm"
                        >
                          {language === 'vi' ? 'Hủy đơn' : 'Cancel Order'}
                        </button>
                      )}
                      <Link
                        to={`/orders/${order.id}`}
                        className="px-6 py-2 bg-surface-container-highest text-primary font-bold rounded-lg hover:bg-surface-container-high transition-colors text-sm shadow-sm"
                      >
                        {language === 'vi' ? 'Xem chi tiết' : 'View Details'}
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8 pt-4 border-t border-outline-variant/10">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 disabled:cursor-not-allowed transition-all border border-outline-variant/10 font-bold"
                >
                  <span className="material-symbols-outlined text-lg">chevron_left</span>
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-10 h-10 flex items-center justify-center rounded-xl text-sm font-bold transition-all border ${currentPage === page ? 'bg-primary text-white border-primary shadow-md shadow-primary/20 scale-105' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high border-outline-variant/10'}`}
                  >
                    {page}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 disabled:cursor-not-allowed transition-all border border-outline-variant/10 font-bold"
                >
                  <span className="material-symbols-outlined text-lg">chevron_right</span>
                </button>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Modal Chọn lý do hủy đơn hàng */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface p-8 rounded-2xl w-full max-w-lg shadow-2xl">
            <h2 className="text-2xl font-bold text-on-surface mb-6">
              {language === 'vi' ? `Lý do hủy đơn hàng #${selectedOrderId}` : `Reason for cancelling order #${selectedOrderId}`}
            </h2>
            <div className="space-y-4 mb-8">
              {predefinedReasons.map((reason, index) => (
                <label key={index} className="flex items-start cursor-pointer group">
                  <input
                    type="radio"
                    name="cancelReason"
                    value={reason}
                    checked={cancelReason === reason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="mt-1 mr-3 w-4 h-4 text-primary focus:ring-primary border-outline-variant cursor-pointer"
                  />
                  <span className="text-on-surface group-hover:text-primary transition-colors">{reason}</span>
                </label>
              ))}
              {cancelReason === (language === 'vi' ? 'Khác' : 'Other') && (
                <textarea
                  className="w-full mt-3 p-4 bg-surface-container-highest border border-outline-variant/40 rounded-lg focus:ring-primary focus:border-primary outline-none transition-all text-sm"
                  placeholder={language === 'vi' ? "Vui lòng nhập lý do cụ thể (Bắt buộc)..." : "Please enter a specific reason (Required)..."}
                  value={otherReason}
                  onChange={(e) => setOtherReason(e.target.value)}
                  rows="3"
                ></textarea>
              )}
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={isCancelling}
                className="px-6 py-2.5 rounded-lg font-semibold text-on-surface-variant bg-surface-container-low hover:bg-surface-container-high transition-colors"
              >
                {language === 'vi' ? 'Đóng lại' : 'Close'}
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={!cancelReason || (cancelReason === (language === 'vi' ? 'Khác' : 'Other') && !otherReason.trim()) || isCancelling}
                className="px-6 py-2.5 rounded-lg font-semibold bg-error text-white hover:brightness-110 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isCancelling ? (language === 'vi' ? 'Đang xử lý...' : 'Processing...') : (language === 'vi' ? 'Xác nhận hủy đơn' : 'Confirm Cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />

      {reviewOrder && reviewOrder.items && (
        <ReviewModal 
          isOpen={showReviewModal} 
          onClose={() => setShowReviewModal(false)} 
          items={reviewOrder.items}
          language={language}
        />
      )}
    </div>
  );
};

export default OrderHistory;