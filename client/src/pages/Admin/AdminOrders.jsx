import React, { useState, useEffect, useContext } from 'react';
import toast from 'react-hot-toast';
import AdminLayout from './AdminLayout';
import { AuthContext } from '../../context/AuthContext';

import { API_BASE_URL } from '../../config/api.config';
import { getImageUrl } from '../Register/api.config';

const AdminOrders = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalOrders: 0, newOrders: 0, revenueMonth: 0, cancelledOrders: 0 });

  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Số lượng đơn hàng mỗi trang

  // States cho Modal Chi tiết đơn hàng
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // State hỗ trợ thay đổi trạng thái
  const [updateStatus, setUpdateStatus] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // States cho Form tạo đơn hàng mới
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newOrderForm, setNewOrderForm] = useState({
    customerName: '', phone: '', address: '', productName: '', price: '', quantity: 1, shippingFee: 0, paymentMethod: 'cod', size: ''
  });
  const [productsList, setProductsList] = useState([]); // State lưu danh sách sản phẩm
  const [sizesList, setSizesList] = useState([]); // State lưu danh sách kích cỡ từ CSDL

  const { user } = useContext(AuthContext);
  const userRole = user?.role || 'customer';
  const isAdmin = userRole === 'admin';

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        if (result.data && result.data.orders) {
          setOrders(result.data.orders);
          setStats(result.data.stats);
        } else {
          setOrders(result.data); // Fallback nếu API cũ chưa cập nhật kịp
        }
      }
    } catch (error) {
      console.error('Lỗi khi lấy đơn hàng:', error);
      toast.error('Không thể tải dữ liệu đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  // Hàm lấy danh sách sản phẩm có sẵn
  const fetchProductsList = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/products`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success && result.data) {
        if (result.data.products) setProductsList(result.data.products);
        if (result.data.formOptions && result.data.formOptions.sizes) {
          setSizesList(result.data.formOptions.sizes);
        }
      }
    } catch (error) {
      console.error('Lỗi khi lấy danh sách sản phẩm:', error);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchProductsList();
  }, []);

  const openModal = (order) => {
    setSelectedOrder(order);
    setUpdateStatus(order.raw_status || 'pending');
    setIsModalOpen(true);
  };

  // Hàm gửi API cập nhật trạng thái
  const handleUpdateStatus = async () => {
    setIsUpdating(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${selectedOrder.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: updateStatus })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Cập nhật trạng thái thành công!');
        fetchOrders(); // Load lại dữ liệu bảng
        setIsModalOpen(false); // Tắt modal
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error('Lỗi khi cập nhật trạng thái');
    } finally {
      setIsUpdating(false);
    }
  };

  // Hàm gửi API yêu cầu khách hàng thanh toán lại
  const handleRequestRepayment = async (orderId) => {
    if (!window.confirm('Bạn có chắc chắn muốn yêu cầu khách hàng thanh toán lại đơn hàng này không?')) return;
    setIsUpdating(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${orderId}/request-repayment`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Đã gửi yêu cầu thanh toán lại cho khách hàng thành công!');
        fetchOrders(); // Tải lại danh sách đơn hàng
        setIsModalOpen(false); // Đóng modal
      } else {
        toast.error(data.message || 'Lỗi khi gửi yêu cầu.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Lỗi kết nối khi gửi yêu cầu.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Hàm gửi API tạo đơn hàng thủ công
  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const token = localStorage.getItem('token');
      const subtotal = Number(newOrderForm.price) * Number(newOrderForm.quantity);
      const total = subtotal + Number(newOrderForm.shippingFee);
      const matchedProduct = productsList.find(p => p.name === newOrderForm.productName);

      const payload = {
        recipient_name: newOrderForm.customerName,
        phone: newOrderForm.phone,
        shipping_address: newOrderForm.address,
        payment_method: newOrderForm.paymentMethod,
        subtotal: subtotal,
        shipping_fee: Number(newOrderForm.shippingFee),
        total_amount: total,
        items: [{
          productId: matchedProduct ? matchedProduct.id : null,
          name: newOrderForm.productName,
          price: Number(newOrderForm.price),
          quantity: Number(newOrderForm.quantity),
          size: newOrderForm.size || 'Mặc định'
        }]
      };

      const res = await fetch(`${API_BASE_URL}/api/v1/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Tạo đơn hàng thủ công thành công!');
        setIsCreateModalOpen(false);
        setNewOrderForm({ customerName: '', phone: '', address: '', productName: '', price: '', quantity: 1, shippingFee: 0, paymentMethod: 'cod', size: '' });
        fetchOrders(); // Refresh order list
      } else toast.error(data.message || 'Lỗi khi tạo đơn hàng');
    } catch (err) { toast.error('Lỗi kết nối máy chủ'); } finally { setIsCreating(false); }
  };

  // Hàm xử lý In hóa đơn
  const handlePrintInvoice = () => {
    if (!selectedOrder) return;

    const staffName = user ? (user.first_name ? `${user.last_name || ''} ${user.first_name}`.trim() : user.username || 'Nhân viên') : 'Hệ thống';

    // Hàm escape HTML để tránh XSS khi in hóa đơn (dữ liệu khách hàng, email, ghi chú có thể chứa ký tự đặc biệt)
    const escapeHtml = (str) => {
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

    const safeCode = escapeHtml(selectedOrder.code);
    const safeCustomerName = escapeHtml(selectedOrder.customerName);
    const safePhone = escapeHtml(selectedOrder.phone || 'Chưa cung cấp');
    const safeEmail = escapeHtml(selectedOrder.email);
    const safeAddress = escapeHtml(selectedOrder.shippingAddress || 'Chưa cung cấp');
    const safeNote = escapeHtml(selectedOrder.note);
    const safeTime = escapeHtml(selectedOrder.time || '');
    const safeDate = escapeHtml(selectedOrder.date || '');
    const safePaymentStatus = escapeHtml(selectedOrder.paymentStatus);
    const safeStaffName = escapeHtml(staffName);

    // Tạo một tab cửa sổ mới ẩn
    const printWindow = window.open('', '_blank');

    // Chèn HTML và CSS cấu trúc hóa đơn chuyên nghiệp
    printWindow.document.write(`
      <html>
        <head>
          <title>Hóa đơn ${safeCode}</title>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #333; line-height: 1.6; max-width: 800px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px dashed #333; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { margin: 0; font-size: 28px; text-transform: uppercase; letter-spacing: 2px; color: #003178; }
            .header h2 { margin: 5px 0 10px; font-size: 16px; color: #666; }
            .info-box { margin-bottom: 30px; display: flex; justify-content: space-between; }
            .info-box div { flex: 1; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f8f9fa; text-transform: uppercase; font-size: 13px; color: #555; }
            .total { text-align: right; font-size: 22px; font-weight: bold; padding-top: 15px; color: #003178; }
            .footer { text-align: center; margin-top: 50px; font-style: italic; color: #666; border-top: 1px solid #eee; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>AURA K</h1>
            <h2>HÓA ĐƠN BÁN HÀNG VÀ ĐÓNG GÓI</h2>
            <div style="text-align: center; margin: 15px 0;">
              <svg id="barcode"></svg>
            </div>
            <p>Mã đơn: <strong>${safeCode}</strong> | Ngày in: ${escapeHtml(new Date().toLocaleString('vi-VN'))}</p>
          </div>
          <div class="info-box">
            <div>
              <p><strong>Khách hàng:</strong> ${safeCustomerName}</p>
              <p><strong>Số điện thoại:</strong> ${safePhone}</p>
              <p><strong>Email liên hệ:</strong> ${safeEmail}</p>
              <p><strong>Địa chỉ giao hàng:</strong> ${safeAddress}</p>
              ${safeNote ? `<p><strong>Ghi chú:</strong> <em>${safeNote}</em></p>` : ''}
            </div>
            <div style="text-align: right;">
              <p><strong>Ngày đặt hàng:</strong> ${safeDate} - ${safeTime}</p>
              <p><strong>Trạng thái thanh toán:</strong> ${safePaymentStatus}</p>
              <p><strong>Nhân viên đóng gói:</strong> ${safeStaffName}</p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th width="5%">STT</th>
                <th width="40%">Sản phẩm</th>
                <th width="15%">Size</th>
                <th width="10%">SL</th>
                <th width="15%">Đơn giá</th>
                <th width="15%">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              ${selectedOrder.items && selectedOrder.items.length > 0 ? selectedOrder.items.map((item, idx) => {
                const itemName = escapeHtml(item.name);
                const itemSize = escapeHtml(item.size || 'Mặc định');
                const unitPrice = Number(item.unit_price || item.product_price || 0);
                const lineTotal = unitPrice * item.quantity;
                return `
                <tr>
                  <td>${idx + 1}</td>
                  <td><strong>${itemName}</strong></td>
                  <td>${itemSize}</td>
                  <td style="font-weight:bold; text-align:center;">${item.quantity}</td>
                  <td>${unitPrice.toLocaleString('vi-VN')}đ</td>
                  <td>${lineTotal.toLocaleString('vi-VN')}đ</td>
                </tr>
              `;
              }).join('') : '<tr><td colspan="6" style="text-align:center">Chưa có thông tin sản phẩm</td></tr>'}
            </tbody>
          </table>
          <div class="total">
            <p style="font-size: 14px; color: #555; font-weight: normal; margin: 5px 0;">Tạm tính: ${Number(selectedOrder.subtotal || 0).toLocaleString('vi-VN')}đ</p>
            <p style="font-size: 14px; color: #555; font-weight: normal; margin: 5px 0;">Phí vận chuyển: ${Number(selectedOrder.shippingFee || 0).toLocaleString('vi-VN')}đ</p>
            ${selectedOrder.discount > 0 ? `<p style="font-size: 14px; color: #555; font-weight: normal; margin: 5px 0;">Giảm giá: -${Number(selectedOrder.discount).toLocaleString('vi-VN')}đ</p>` : ''}
            <p style="margin-top: 10px;">Tổng thanh toán: ${escapeHtml(selectedOrder.total)}</p>
          </div>
          <div class="footer">
            <p>Cảm ơn quý khách đã mua sắm tại AURA K!</p>
            <p>Nếu có vấn đề về đơn hàng, vui lòng liên hệ: support@aurak.com</p>
          </div>
          <script>
            window.onload = function() {
              if (typeof JsBarcode !== 'undefined') {
                JsBarcode("#barcode", "${safeCode}", {
                  format: "CODE128",
                  width: 1.5,
                  height: 40,
                  displayValue: false,
                  margin: 0
                });
              }
              setTimeout(function() { window.print(); }, 300);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
  };

  // Lọc danh sách đơn hàng dựa trên ô Tìm kiếm và Dropdown
  const filteredOrders = orders.filter(order => {
    const code = order.code || '';
    const customerName = order.customerName || '';
    let matchSearch = !searchQuery || code.toLowerCase().includes(searchQuery.toLowerCase()) || customerName.toLowerCase().includes(searchQuery.toLowerCase());
    let matchStatus = statusFilter === 'all' || order.raw_status === statusFilter;
    
    // Lọc theo trạng thái thanh toán
    let matchPayment = true;
    if (paymentFilter !== 'all') {
      const pStatus = (order.paymentStatus || '').toLowerCase();
      if (paymentFilter === 'paid') {
        matchPayment = pStatus.includes('đã thanh toán') || pStatus.includes('đã tt');
      } else if (paymentFilter === 'unpaid') {
        matchPayment = !pStatus.includes('đã thanh toán') && !pStatus.includes('đã tt');
      }
    }

    // Lọc theo tháng
    let matchMonth = true;
    if (monthFilter) {
      const orderDateStr = order.created_at || order.createdAt;
      if (orderDateStr) {
        const d = new Date(orderDateStr);
        const orderMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        matchMonth = orderMonth === monthFilter;
      } else if (order.date) {
        const parts = order.date.split(/[-/]/); // Xử lý cả DD-MM-YYYY hoặc DD/MM/YYYY
        if (parts.length >= 3) {
          // Xác định vị trí của năm (4 chữ số)
          const yearIsAt0 = parts[0].length === 4;
          const yearIsAt2 = parts[2].length === 4;
          const year = yearIsAt2 ? parts[2] : (yearIsAt0 ? parts[0] : parts[2]);
          // DD/MM/YYYY: month = parts[1]
          // YYYY/MM/DD: month = parts[1] (cùng chỉ số)
          const month = parts[1];
          matchMonth = `${year}-${month.padStart(2, '0')}` === monthFilter;
        }
      }
    }

    return matchSearch && matchStatus && matchPayment && matchMonth;
  });

  // Orders that match all filters EXCEPT status filter (used for tab badge counts)
  const baseFilteredOrders = orders.filter(order => {
    const code = order.code || '';
    const customerName = order.customerName || '';
    let matchSearch = !searchQuery || code.toLowerCase().includes(searchQuery.toLowerCase()) || customerName.toLowerCase().includes(searchQuery.toLowerCase());

    let matchPayment = true;
    if (paymentFilter !== 'all') {
      const pStatus = (order.paymentStatus || '').toLowerCase();
      if (paymentFilter === 'paid') {
        matchPayment = pStatus.includes('đã thanh toán') || pStatus.includes('đã tt');
      } else if (paymentFilter === 'unpaid') {
        matchPayment = !pStatus.includes('đã thanh toán') && !pStatus.includes('đã tt');
      }
    }

    let matchMonth = true;
    if (monthFilter) {
      const orderDateStr = order.created_at || order.createdAt;
      if (orderDateStr) {
        const d = new Date(orderDateStr);
        const orderMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        matchMonth = orderMonth === monthFilter;
      } else if (order.date) {
        const parts = order.date.split(/[-/]/);
        if (parts.length >= 3) {
          const yearIsAt0 = parts[0].length === 4;
          const yearIsAt2 = parts[2].length === 4;
          const year = yearIsAt2 ? parts[2] : (yearIsAt0 ? parts[0] : parts[2]);
          const month = parts[1];
          matchMonth = `${year}-${month.padStart(2, '0')}` === monthFilter;
        }
      }
    }

    return matchSearch && matchPayment && matchMonth;
  });

  // Chức năng Xuất báo cáo (Tải file CSV)
  const handleExportReport = () => {
    if (filteredOrders.length === 0) {
      toast.error('Không có dữ liệu để xuất!');
      return;
    }

    // 1. Tạo header cho file CSV
    const headers = ['Mã đơn hàng', 'Khách hàng', 'Email', 'Ngày đặt', 'Giờ đặt', 'Tổng tiền', 'Tạm tính', 'Phí vận chuyển', 'Giảm giá', 'Trạng thái thanh toán', 'Trạng thái đơn hàng'];

    // 2. Chuyển đổi dữ liệu sang định dạng CSV
    const csvData = filteredOrders.map(order => {
      return [
        `"${order.code || ''}"`,
        `"${(order.customerName || '').replace(/"/g, '""')}"`,
        `"${order.email || ''}"`,
        `"${order.date || ''}"`,
        `"${order.time || ''}"`,
        `"${String(order.total || '').replace(/"/g, '""')}"`,
        order.subtotal || 0,
        order.shippingFee || 0,
        order.discount || 0,
        `"${order.paymentStatus || ''}"`,
        `"${order.status || ''}"`
      ].join(',');
    });

    // 3. Ghép header và dữ liệu
    const csvString = [headers.join(','), ...csvData].join('\n');

    // 4. Thêm BOM (\uFEFF) để Excel đọc được tiếng Việt (UTF-8) không bị lỗi font
    const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    // 5. Tạo thẻ a ẩn để kích hoạt tải file
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `bao_cao_don_hang_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Đã tải xuống báo cáo thành công!');
  };

  // Logic phân trang
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstItem, indexOfLastItem);

  // Xác định sản phẩm đang được chọn trong Form để lấy danh sách kích cỡ (Nếu có)
  const formMatchedProduct = productsList.find(p => p.name === newOrderForm.productName);
  const formProductVariants = formMatchedProduct?.variants || [];

  // Khối Component cho thanh Tìm kiếm đưa lên Header của AdminLayout
  const headerCenterContent = (
    <div className="max-w-md w-full relative group">
      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors text-sm">search</span>
      <input 
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          setCurrentPage(1); // Reset về trang 1 khi tìm kiếm
        }}
        className="w-full bg-slate-100 border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none" 
        placeholder="Tìm kiếm mã đơn, khách hàng..." 
        type="text" 
      />
    </div>
  );

  return (
    <AdminLayout title="Quản lý Đơn hàng" headerCenterContent={headerCenterContent}>
      <div className="p-8 max-w-7xl mx-auto space-y-8">
          {/* Header Section */}
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-3xl font-extrabold text-blue-900 font-headline tracking-tight">Quản lý đơn hàng</h2>
              <p className="text-slate-500 mt-1 font-body">Theo dõi và cập nhật trạng thái đơn hàng thời gian thực.</p>
            </div>
            <div className="flex space-x-3">
              <button onClick={handleExportReport} className="flex items-center space-x-2 px-5 py-2.5 bg-white text-primary font-semibold rounded-xl border border-primary/10 hover:bg-slate-50 transition-all shadow-sm">
                <span className="material-symbols-outlined text-lg">file_download</span>
                <span>Xuất báo cáo</span>
              </button>
              {isAdmin && (
                <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-[#003178] to-[#0d47a1] text-white font-semibold rounded-xl hover:brightness-110 transition-all shadow-md shadow-blue-900/10">
                  <span className="material-symbols-outlined text-lg">add</span>
                  <span>Tạo đơn mới</span>
                </button>
              )}
            </div>
          </div>

          {/* Stats Grid (Bento Style) */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Total Orders */}
            <div className="bg-gradient-to-br from-blue-50/50 to-white p-6 rounded-3xl shadow-sm border border-blue-100/50 relative overflow-hidden group hover:shadow-md transition-all duration-300">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>package_2</span>
                </div>
              </div>
              <p className="text-slate-500 text-sm font-medium">Tổng đơn hàng</p>
              <h3 className="text-2xl font-black text-blue-900 mt-1 font-headline">{stats.totalOrders}</h3>
              <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
                <span className="material-symbols-outlined text-8xl">package_2</span>
              </div>
            </div>
            {/* New Orders */}
            <div className="bg-gradient-to-br from-amber-50/50 to-white p-6 rounded-3xl shadow-sm border border-amber-100/50 relative overflow-hidden group hover:shadow-md transition-all duration-300">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>pending_actions</span>
                </div>
                <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">Mới</span>
              </div>
              <p className="text-slate-500 text-sm font-medium">Đơn hàng mới</p>
              <h3 className="text-2xl font-black text-blue-900 mt-1 font-headline">{stats.newOrders}</h3>
              <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
                <span className="material-symbols-outlined text-8xl">pending_actions</span>
              </div>
            </div>
            {/* Revenue */}
            <div className="bg-gradient-to-br from-emerald-50/50 to-white p-6 rounded-3xl shadow-sm border border-emerald-100/50 relative overflow-hidden group hover:shadow-md transition-all duration-300">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>payments</span>
                </div>
              </div>
              <p className="text-slate-500 text-sm font-medium">Doanh thu tháng</p>
              <h3 className="text-2xl font-black text-blue-900 mt-1 font-headline">
                {stats.revenueMonth > 1000000 ? `${(stats.revenueMonth / 1000000).toFixed(1)}M` : `${(stats.revenueMonth || 0).toLocaleString('vi-VN')}đ`}
              </h3>
              <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
                <span className="material-symbols-outlined text-8xl">payments</span>
              </div>
            </div>
            {/* Cancelled */}
            <div className="bg-gradient-to-br from-red-50/50 to-white p-6 rounded-3xl shadow-sm border border-red-100/50 relative overflow-hidden group hover:shadow-md transition-all duration-300">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-red-50 text-red-700 rounded-xl">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>cancel</span>
                </div>
              </div>
              <p className="text-slate-500 text-sm font-medium">Đơn bị hủy</p>
              <h3 className="text-2xl font-black text-blue-900 mt-1 font-headline">{stats.cancelledOrders}</h3>
              <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
                <span className="material-symbols-outlined text-8xl">cancel</span>
              </div>
            </div>
          </div>

          {/* Filters Section */}
          <div className="bg-white p-5 rounded-3xl flex flex-wrap gap-4 items-center shadow-sm border border-slate-200/60">
            <div className="flex items-center space-x-2 text-slate-500 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
              <span className="material-symbols-outlined">filter_list</span>
              <span className="text-sm font-semibold uppercase tracking-wider">Bộ lọc</span>
            </div>
            <div className="h-8 w-px bg-slate-300 hidden md:block"></div>
            <select 
              value={paymentFilter}
              onChange={(e) => {
                setPaymentFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-white border-none rounded-xl text-sm py-2 pl-4 pr-10 focus:ring-2 focus:ring-primary/20 shadow-sm min-w-[160px] outline-none cursor-pointer"
            >
              <option value="all">Thanh toán: Tất cả</option>
              <option value="paid">Đã thanh toán</option>
              <option value="unpaid">Chờ xử lý / Chưa thanh toán</option>
            </select>
            <div className="relative">
              <input 
                value={monthFilter}
                onChange={(e) => {
                  setMonthFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-white border-none rounded-xl text-sm py-2 pl-4 pr-4 focus:ring-2 focus:ring-primary/20 shadow-sm outline-none" 
                type="month" 
              />
            </div>
            <button onClick={() => { 
              setStatusFilter('all'); 
              setPaymentFilter('all');
              setMonthFilter(''); // Xóa bộ lọc sẽ hiện toàn bộ đơn hàng
              setSearchQuery(''); 
              setCurrentPage(1); 
            }} className="ml-auto text-sm text-primary font-bold hover:underline">Xóa bộ lọc</button>
          </div>

          {/* Orders Table Section */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden">
            {/* Giao diện Thanh Tabs Phân loại Đơn hàng */}
            <div className="px-6 pt-5 border-b border-slate-200/60 flex overflow-x-auto custom-scrollbar gap-8 items-end bg-slate-50/30">
              {[
                { id: 'all', label: 'Tất cả' },
                { id: 'pending', label: 'Chờ xác nhận', badge: baseFilteredOrders.filter(o => o.raw_status === 'pending').length },
                { id: 'processing', label: 'Đang xử lý', badge: baseFilteredOrders.filter(o => o.raw_status === 'processing').length },
                { id: 'shipped', label: 'Đang giao', badge: baseFilteredOrders.filter(o => o.raw_status === 'shipped').length },
                { id: 'delivered', label: 'Đã giao (Chờ XN)', badge: baseFilteredOrders.filter(o => o.raw_status === 'delivered').length },
                { id: 'completed', label: 'Thành công' },
                { id: 'at_risk', label: 'Rủi ro', badge: baseFilteredOrders.filter(o => o.raw_status === 'at_risk').length },
                { id: 'cancelled', label: 'Đã hủy' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => { setStatusFilter(tab.id); setCurrentPage(1); }}
                  className={`pb-4 text-sm font-bold whitespace-nowrap border-b-2 transition-all flex items-center gap-2.5 ${
                    statusFilter === tab.id 
                      ? 'border-blue-600 text-blue-700' 
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                  }`}
                >
                  {tab.label}
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className={`px-2 py-0.5 text-[10px] rounded-full shadow-sm font-extrabold ${
                      statusFilter === tab.id ? 'bg-blue-600 text-white' : 'bg-red-500 text-white animate-pulse'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200/60 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ID Đơn hàng</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Khách hàng</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ngày đặt</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng tiền</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Thanh toán</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr><td colSpan="7" className="text-center py-12 text-slate-500 font-medium"><div className="flex flex-col items-center justify-center space-y-3"><span className="material-symbols-outlined animate-spin text-3xl">refresh</span><p>Đang tải dữ liệu...</p></div></td></tr>
                  ) : currentOrders.length > 0 ? (
                    currentOrders.map((order) => (
                    <tr key={order.id} onDoubleClick={() => openModal(order)} className="hover:bg-blue-50/50 transition-colors group cursor-pointer border-b border-slate-50 last:border-none">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-bold text-blue-900">{order.code}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full ${order.bgClass} flex items-center justify-center text-[10px] font-bold ${order.textClass}`}>
                            {order.initials}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{order.customerName}</p>
                            <p className="text-[11px] text-slate-500">{order.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm text-slate-600">{order.date}</p>
                        <p className="text-[11px] text-slate-400">{order.time}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-bold text-blue-900">{order.total}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          order.paymentStatus?.includes('Đã thanh toán') || order.paymentStatus?.includes('Đã TT') ? 'bg-green-100 text-green-700' :
                          order.paymentStatus === 'Đang đợi người trả' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {order.paymentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          order.status === 'Thành công' ? 'bg-green-100 text-green-700' :
                          order.status === 'Đã giao' ? 'bg-blue-100 text-blue-700' :
                          order.status === 'Rủi ro' ? 'bg-red-100 text-red-700 animate-pulse' :
                          order.status === 'Đang giao' ? 'bg-amber-100 text-amber-700' :
                          order.status === 'Đã hủy' ? 'bg-red-100 text-red-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex justify-end space-x-2">
                          <button onClick={() => openModal(order)} className="p-2 text-slate-400 hover:text-primary transition-colors" title="Xem chi tiết">
                            <span className="material-symbols-outlined">visibility</span>
                          </button>
                          {isAdmin && (
                            <button onClick={() => openModal(order)} className="p-2 text-slate-400 hover:text-primary transition-colors" title="Cập nhật trạng thái">
                              <span className="material-symbols-outlined">edit_note</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="text-center py-12 text-slate-500 font-medium">
                        <div className="flex flex-col items-center justify-center">
                          <span className="material-symbols-outlined text-4xl mb-2 opacity-50">inbox</span>
                          <p>Chưa có đơn hàng nào.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div className="px-6 py-4 bg-slate-50/50 flex justify-between items-center border-t border-slate-200/60">
              <p className="text-xs text-slate-500 font-medium">Hiển thị {currentOrders.length} trên tổng số {filteredOrders.length} đơn hàng</p>
              <div className="flex items-center space-x-2">
                <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg border border-slate-200 hover:bg-white text-slate-400 disabled:opacity-50 transition-colors">
                  <span className="material-symbols-outlined text-lg">chevron_left</span>
                </button>
                <span className="text-xs font-bold text-slate-600 px-2">Trang {currentPage} / {totalPages || 1}</span>
                <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages || totalPages === 0} className="p-1.5 rounded-lg border border-slate-200 hover:bg-white text-slate-400 disabled:opacity-50 transition-colors">
                  <span className="material-symbols-outlined text-lg">chevron_right</span>
                </button>
              </div>
            </div>
          </div>

          {/* Additional Insights (Editorial Style) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
            <div className="bg-blue-50 p-8 rounded-3xl border border-blue-100 relative overflow-hidden">
              <div className="relative z-10">
                <h4 className="text-xl font-bold text-primary font-headline">Đơn hàng cần xử lý gấp</h4>
                <p className="text-slate-600 mt-2 max-w-sm">
                  {stats.newOrders > 0 
                    ? `Bạn đang có ${stats.newOrders} đơn hàng mới đang chờ xác nhận để tiến hành đóng gói và giao hàng.` 
                    : `Tuyệt vời! Hiện tại bạn không có đơn hàng nào bị tồn đọng.`}
                </p>
                <button 
                  onClick={() => {
                    setStatusFilter(stats.newOrders > 0 ? 'pending' : 'all');
                    setCurrentPage(1);
                    window.scrollTo({ top: 350, behavior: 'smooth' });
                  }}
                  className="mt-6 px-6 py-2 bg-primary text-white font-bold rounded-xl text-sm hover:translate-x-1 transition-transform shadow-sm"
                >
                  {stats.newOrders > 0 ? 'Xử lý ngay' : 'Xem danh sách đơn'}
                </button>
              </div>
              <div className="absolute right-0 top-0 h-full w-1/3 opacity-10">
                <span className="material-symbols-outlined text-[180px] leading-none" style={{ fontVariationSettings: "'FILL' 1" }}>support_agent</span>
              </div>
            </div>
            
            <div className="bg-slate-100 p-8 rounded-3xl relative overflow-hidden">
              <div className="relative z-10">
                <h4 className="text-xl font-bold text-slate-700 font-headline">Cập nhật hệ thống</h4>
                <p className="text-slate-600 mt-2 max-w-sm">Phiên bản 2.4 đã sẵn sàng với tính năng tích hợp trực tiếp với đơn vị vận chuyển mới.</p>
                <button className="mt-6 px-6 py-2 bg-slate-200 text-slate-800 font-bold rounded-xl text-sm hover:translate-x-1 transition-transform">
                  Khám phá tính năng
                </button>
              </div>
              <div className="absolute right-4 bottom-4 opacity-5">
                <span className="material-symbols-outlined text-[120px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
              </div>
            </div>
          </div>
        </div>

      {/* Contextual FAB (Nút nổi ở góc phải dưới) */}
      <div className="fixed bottom-8 right-8 z-50">
        <button onClick={() => setIsCreateModalOpen(true)} className="w-14 h-14 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform group">
          <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
          <span className="absolute right-full mr-4 bg-slate-900 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Tạo đơn hàng nhanh
          </span>
        </button>
      </div>

      {/* Modal Chi Tiết Đơn Hàng */}
      {isModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-[100] flex justify-end bg-slate-900/40 backdrop-blur-sm transition-opacity">
          <div className="bg-white shadow-2xl w-full max-w-lg h-full overflow-hidden flex flex-col animate-fade-in-up">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-white">
              <h3 className="font-extrabold text-xl text-slate-900">Chi tiết {selectedOrder.code}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 rounded-full transition-colors flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/50">
              <div className="flex justify-between border-b pb-4 border-gray-200">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Khách hàng</p>
                  <p className="font-bold text-slate-900 text-base mt-1">{selectedOrder.customerName}</p>
                  <p className="text-sm text-slate-500">{selectedOrder.phone ? `${selectedOrder.phone} • ` : ''}{selectedOrder.email}</p>
                  {selectedOrder.shippingAddress && <p className="text-sm text-slate-700 mt-1"><span className="font-semibold">Địa chỉ:</span> {selectedOrder.shippingAddress}</p>}
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Ngày đặt</p>
                  <p className="font-bold text-slate-900 text-sm mt-1">{selectedOrder.date}</p>
                  <p className="text-xs text-slate-500">{selectedOrder.time}</p>
                </div>
              </div>
              
              {/* Thanh trạng thái ngang (Stepper) */}
              <div className="py-6 border-b border-gray-200">
                {updateStatus === 'cancelled' || updateStatus === 'at_risk' || selectedOrder.status === 'cancelled' || selectedOrder.status === 'Đã hủy' || selectedOrder.status === 'Rủi ro' ? (
                  <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex flex-col items-center justify-center text-red-600">
                    <span className="material-symbols-outlined text-4xl mb-2">{updateStatus === 'at_risk' || selectedOrder.status === 'Rủi ro' ? 'warning' : 'cancel'}</span>
                    <h3 className="font-bold text-lg">{updateStatus === 'at_risk' || selectedOrder.status === 'Rủi ro' ? 'Đơn hàng báo sự cố/rủi ro' : 'Đơn hàng đã bị hủy'}</h3>
                  </div>
                ) : (
                  <div className="relative flex justify-between items-center w-full max-w-md mx-auto">
                    <div className="absolute left-0 top-5 -translate-y-1/2 w-full h-1 bg-slate-200 z-0"></div>
                    <div 
                      className="absolute left-0 top-5 -translate-y-1/2 h-1 bg-primary transition-all duration-700 ease-in-out z-0"
                      style={{ 
                        width: 
                          ['pending', 'processing', 'shipped', 'delivered', 'completed'].indexOf(updateStatus) === 0 ? '0%' :
                          ['pending', 'processing', 'shipped', 'delivered', 'completed'].indexOf(updateStatus) === 1 ? '25%' :
                          ['pending', 'processing', 'shipped', 'delivered', 'completed'].indexOf(updateStatus) === 2 ? '50%' :
                          ['pending', 'processing', 'shipped', 'delivered', 'completed'].indexOf(updateStatus) === 3 ? '75%' :
                          ['pending', 'processing', 'shipped', 'delivered', 'completed'].indexOf(updateStatus) === 4 ? '100%' : '0%'
                      }}
                    ></div>
                    
                    {[
                      { id: 'pending', label: 'Chờ duyệt', icon: 'inventory_2' },
                      { id: 'processing', label: 'Đang xử lý', icon: 'autorenew' },
                      { id: 'shipped', label: 'Đang giao', icon: 'local_shipping' },
                      { id: 'delivered', label: 'Đã giao', icon: 'inbox' },
                      { id: 'completed', label: 'Thành công', icon: 'check_circle' },
                    ].map((step, index) => {
                      const currentIndex = ['pending', 'processing', 'shipped', 'delivered', 'completed'].indexOf(updateStatus);
                      const isCompleted = index <= currentIndex;
                      const isCurrent = index === currentIndex;

                      return (
                        <div key={step.id} className="relative z-10 flex flex-col items-center gap-2">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 transition-colors duration-500 bg-white ${isCompleted ? 'border-primary text-primary' : 'border-slate-200 text-slate-300'} ${isCurrent ? 'ring-4 ring-primary/20 shadow-md' : ''}`}>
                            <span className="material-symbols-outlined text-lg">{step.icon}</span>
                          </div>
                          <span className={`text-[9px] font-bold uppercase tracking-wider text-center ${isCompleted ? 'text-primary' : 'text-slate-400'}`}>{step.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Khối hiển thị chi tiết sản phẩm */}
              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div className="border-b pb-4 border-gray-200">
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-3">Sản phẩm đã đặt</p>
                  <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex gap-3 items-center">
                        <img src={getImageUrl(item.image_url)} alt={item.name} className="w-12 h-12 object-cover rounded-md border border-gray-200" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-900 line-clamp-1">{item.name}</p>
                          <p className="text-xs text-slate-500">Size: {item.size} x {item.quantity}</p>
                        </div>
                        <p className="text-sm font-bold text-slate-900">{(Number(item.unit_price || item.product_price || 0) * Number(item.quantity || 1)).toLocaleString('vi-VN')}đ</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment receipt display section */}
              {['bank_transfer', 'credit_card'].includes(selectedOrder.paymentMethod) && (
                <div className="border-b pb-4 border-gray-200 mt-4">
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-2">Hình thức thanh toán</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-800">
                      {selectedOrder.paymentMethod === 'bank_transfer' ? 'Chuyển khoản Ngân hàng (Vietcombank)' : 'Ví điện tử MoMo'}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${selectedOrder.paymentReceipt ? 'bg-amber-100 text-amber-700 animate-pulse' : 'bg-red-100 text-red-700'}`}>
                      {selectedOrder.paymentReceipt ? 'Đã tải ảnh biên lai' : 'Chưa gửi biên lai'}
                    </span>
                  </div>
                  {selectedOrder.paymentReceipt && (
                    <div className="mt-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <p className="text-xs text-slate-500 mb-2">Ảnh chụp giao dịch chuyển khoản thành công:</p>
                      <a
                        href={getImageUrl(selectedOrder.paymentReceipt)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block relative group overflow-hidden rounded-lg border border-slate-200 max-h-60 bg-white"
                      >
                        <img
                          src={getImageUrl(selectedOrder.paymentReceipt)}
                          alt="Biên lai thanh toán"
                          className="w-full object-contain max-h-60 group-hover:scale-102 transition-transform cursor-zoom-in"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <span className="text-white text-xs font-semibold flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">zoom_in</span> Xem ảnh gốc
                          </span>
                        </div>
                      </a>
                    </div>
                  )}

                  {isAdmin && ['pending', 'processing'].includes(selectedOrder.raw_status) && (
                    <button
                      onClick={() => handleRequestRepayment(selectedOrder.id)}
                      disabled={isUpdating}
                      className="mt-4 w-full py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 hover:text-amber-800 border border-amber-300 hover:border-amber-400 font-bold rounded-xl transition-all text-xs flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-base">receipt_long</span>
                      Khách hàng chưa thanh toán, vui lòng thanh toán lại
                    </button>
                  )}
                </div>
              )}

              {isAdmin && (
                <div className="flex justify-between items-center bg-gray-50 border border-gray-200 p-4 rounded-xl mt-4">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Cập nhật trạng thái</p>
                    <select 
                      value={updateStatus} 
                      onChange={(e) => setUpdateStatus(e.target.value)}
                      className="bg-white border border-gray-300 text-sm rounded-lg px-3 py-1.5 outline-none font-semibold text-slate-800 focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer"
                    >
                      <option value="pending">Chờ xác nhận</option>
                      <option value="processing">Đang xử lý</option>
                      <option value="shipped">Đang giao</option>
                      <option value="delivered">Đã giao (Chờ XN)</option>
                      <option value="completed">Nhận hàng thành công</option>
                      <option value="at_risk">Báo cáo Rủi ro</option>
                      <option value="cancelled">Đã hủy</option>
                    </select>
                  </div>
                  <button onClick={handleUpdateStatus} disabled={isUpdating || updateStatus === selectedOrder.raw_status} className="px-5 py-2.5 bg-primary text-white font-bold rounded-lg hover:bg-opacity-90 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                    {isUpdating ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                </div>
              )}

              <div className="bg-blue-50 p-4 rounded-xl">
                <div className="flex justify-between items-center mb-2 text-sm text-slate-600">
                  <span>Tạm tính:</span>
                  <span className="font-semibold">{Number(selectedOrder.subtotal || 0).toLocaleString('vi-VN')}đ</span>
                </div>
                <div className="flex justify-between items-center mb-2 text-sm text-slate-600">
                  <span>Phí vận chuyển:</span>
                  <span className="font-semibold">{Number(selectedOrder.shippingFee || 0).toLocaleString('vi-VN')}đ</span>
                </div>
                {selectedOrder.discount > 0 && (
                  <div className="flex justify-between items-center mb-3 text-sm text-green-600">
                    <span>Giảm giá:</span>
                    <span className="font-semibold">-{Number(selectedOrder.discount).toLocaleString('vi-VN')}đ</span>
                  </div>
                )}
                <div className="border-t border-blue-200/50 pt-3 flex justify-between items-center">
                  <span className="font-bold text-primary">Tổng thanh toán:</span>
                  <span className="text-xl font-extrabold text-primary">{selectedOrder.total}</span>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <button onClick={handlePrintInvoice} className="px-5 py-2.5 flex items-center gap-2 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition-colors shadow-sm">
                <span className="material-symbols-outlined text-sm">print</span> In hóa đơn
              </button>
              <button onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 bg-slate-200 text-slate-800 font-bold rounded-xl hover:bg-slate-300 transition-colors">Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tạo Đơn Hàng Mới */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-8">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-200 animate-fade-in-up flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-slate-50">
              <h3 className="font-bold text-lg text-slate-900">Tạo đơn hàng thủ công</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-500 hover:text-slate-900 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              <form id="create-order-form" onSubmit={handleCreateOrder} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Tên khách hàng *</label>
                    <input type="text" required value={newOrderForm.customerName} onChange={(e) => setNewOrderForm({...newOrderForm, customerName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="Nhập tên khách hàng" />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Số điện thoại *</label>
                    <input type="text" required value={newOrderForm.phone} onChange={(e) => setNewOrderForm({...newOrderForm, phone: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="Nhập số điện thoại" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Địa chỉ giao hàng *</label>
                    <input type="text" required value={newOrderForm.address} onChange={(e) => setNewOrderForm({...newOrderForm, address: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="Nhập địa chỉ đầy đủ" />
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4 mt-4">
                  <h4 className="text-sm font-bold text-slate-800 mb-3">Thông tin sản phẩm</h4>
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-12 md:col-span-5">
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Tên sản phẩm *</label>
                      <input 
                        type="text" 
                        list="product-list"
                        required
                        value={newOrderForm.productName} 
                        onChange={(e) => {
                          const val = e.target.value;
                          const matched = productsList.find(p => p.name === val);
                          setNewOrderForm({
                            ...newOrderForm, 
                            productName: val,
                            price: matched ? matched.price : newOrderForm.price, // Tự động điền giá nếu chọn đúng sản phẩm
                            size: '' // Reset Kích cỡ khi đổi sản phẩm
                          });
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" 
                        placeholder="Chọn hoặc nhập tên sản phẩm..." 
                      />
                      <datalist id="product-list">
                        {productsList.map(p => (
                          <option key={p.id} value={p.name} />
                        ))}
                      </datalist>
                    </div>
                    <div className="col-span-12 md:col-span-3">
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Kích cỡ</label>
                      {formProductVariants.length > 0 ? (
                        <select 
                          value={newOrderForm.size} 
                          onChange={(e) => setNewOrderForm({...newOrderForm, size: e.target.value})} 
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer text-ellipsis"
                        >
                          <option value="">-- Chọn --</option>
                          {formProductVariants.map((v, i) => (
                            <option key={i} value={v.size_name || v.size_id}>
                              {v.size_name || `Size ${v.size_id}`} {v.quantity > 0 ? `(Tồn: ${v.quantity})` : '(Hết hàng)'}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <>
                          <input 
                            type="text" 
                            list="common-sizes"
                            value={newOrderForm.size} 
                            onChange={(e) => setNewOrderForm({...newOrderForm, size: e.target.value})} 
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" 
                            placeholder="Chọn hoặc nhập (VD: M, L...)" 
                          />
                          <datalist id="common-sizes">
                            {sizesList.map(s => (
                              <option key={s.id} value={s.name} />
                            ))}
                          </datalist>
                        </>
                      )}
                    </div>
                    <div className="col-span-6 md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Đơn giá (đ) *</label>
                      <input type="number" required min="0" value={newOrderForm.price} onChange={(e) => setNewOrderForm({...newOrderForm, price: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="0" />
                    </div>
                    <div className="col-span-6 md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Số lượng *</label>
                      <input type="number" required min="1" value={newOrderForm.quantity} onChange={(e) => setNewOrderForm({...newOrderForm, quantity: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="1" />
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4 mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Phí vận chuyển (đ)</label>
                    <input type="number" min="0" value={newOrderForm.shippingFee} onChange={(e) => setNewOrderForm({...newOrderForm, shippingFee: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Phương thức thanh toán</label>
                    <select value={newOrderForm.paymentMethod} onChange={(e) => setNewOrderForm({...newOrderForm, paymentMethod: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer">
                      <option value="cod">Thanh toán khi nhận hàng (COD)</option>
                      <option value="bank_transfer">Chuyển khoản ngân hàng</option>
                      <option value="credit_card">Thẻ tín dụng</option>
                    </select>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-xl mt-4">
                  <div className="flex justify-between items-center text-sm text-slate-600 mb-1">
                    <span>Tạm tính:</span>
                    <span className="font-semibold">{(Number(newOrderForm.price) * Number(newOrderForm.quantity)).toLocaleString('vi-VN')}đ</span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-slate-600 mb-2">
                    <span>Phí vận chuyển:</span>
                    <span className="font-semibold">{Number(newOrderForm.shippingFee).toLocaleString('vi-VN')}đ</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-blue-200 pt-2">
                    <span className="font-bold text-primary">Tổng cộng:</span>
                    <span className="text-lg font-extrabold text-primary">{((Number(newOrderForm.price) * Number(newOrderForm.quantity)) + Number(newOrderForm.shippingFee)).toLocaleString('vi-VN')}đ</span>
                  </div>
                </div>
              </form>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 bg-white">
              <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-5 py-2.5 bg-slate-200 text-slate-800 font-bold rounded-lg hover:bg-slate-300 transition-colors">Hủy bỏ</button>
              <button type="submit" form="create-order-form" disabled={isCreating} className="px-6 py-2.5 bg-primary text-white font-bold rounded-lg hover:bg-opacity-90 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2">
                {isCreating ? 'Đang tạo...' : 'Xác nhận Tạo đơn'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminOrders;