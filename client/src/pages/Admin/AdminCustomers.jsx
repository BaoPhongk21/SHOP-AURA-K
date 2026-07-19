import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import AdminLayout from './AdminLayout';
import { API_BASE_URL } from '../../config/api.config';
import { getImageUrl } from '../Register/api.config';
const AdminCustomers = () => {
  const { user } = useContext(AuthContext);
  const userRole = user?.role ? String(user.role).toLowerCase().trim() : '';
  const isAdmin = userRole === 'admin';
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');

  // States cho Bộ lọc
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // States cho Tùy chỉnh Phân quyền (RBAC)
  const [showRoleDetails, setShowRoleDetails] = useState(false);
  const [activeRoleTab, setActiveRoleTab] = useState('Admin');

  // States for Modal and Form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'Khách hàng'
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingEmails, setIsSendingEmails] = useState(false);

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalUsers: 0, newThisMonth: 0, activeSessions: 0 });
  const [securityStats, setSecurityStats] = useState({ unverifiedPhones: 0 });

  // States cho Quyền hạn (Quản lý trạng thái các ô Checkbox) - Chỉ Admin và Staff
  const [rolePermissions, setRolePermissions] = useState({
    Admin: { products: true, orders: true, customers: true, reports: true, settings: true, vouchers: true, inventory: true },
    Staff: { orders: true, customers: true, products: false, reports: false, settings: false, vouchers: false, inventory: false }
  });
  const [isSavingRoles, setIsSavingRoles] = useState(false);

  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Số lượng người dùng mỗi trang

  // Gọi API lấy dữ liệu
  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const apiUrl = API_BASE_URL || '';
      const response = await fetch(`${apiUrl}/api/v1/admin/customers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        setCustomers(result.data.users);
        setStats(result.data.stats);
      }
    } catch (error) {
      console.error('Lỗi khi lấy dữ liệu người dùng:', error);
      toast.error('Không thể tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  };

  // Lấy dữ liệu Phân quyền từ DB
  const fetchPermissions = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = API_BASE_URL || '';
      const response = await fetch(`${apiUrl}/api/v1/admin/permissions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success && result.data) {
        setRolePermissions(result.data);
      }
    } catch (error) { console.error('Lỗi lấy phân quyền:', error); }
  };

  useEffect(() => {
    fetchCustomers();
    fetchPermissions();
  }, []);

  // Open Modal for Add/Edit
  const openModal = (customer = null) => {
    if (customer) {
      setEditingCustomer(customer);
      // Tách first_name / last_name an toàn (backend trả về first_name và last_name trực tiếp)
      const lastName = customer.last_name || '';
      const firstName = customer.first_name || '';
      setFormData({
        firstName: firstName,
        lastName: lastName,
        email: customer.email,
        password: '', // Don't show password for editing
        role: customer.role
      });
    } else {
      setEditingCustomer(null);
      setFormData({ firstName: '', lastName: '', email: '', password: '', role: 'Khách hàng' });
    }
    setIsModalOpen(true);
  };

  // Handle Form Save (Add/Edit)
  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const method = editingCustomer ? 'PUT' : 'POST';
      const apiUrl = API_BASE_URL || '';
      const url = editingCustomer
        ? `${apiUrl}/api/v1/admin/customers/${editingCustomer.id}`
        : `${apiUrl}/api/v1/admin/customers`;

      const body = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        role: formData.role,
      };
      if (!editingCustomer) {
        body.password = formData.password;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      const result = await response.json();

      if (result.success) {
        toast.success(result.message);
        setIsModalOpen(false);
        fetchCustomers(); // Reload data
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Lỗi hệ thống khi lưu người dùng.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Delete User
  const handleDelete = async (customerId, customerEmail) => {
    // Ngăn chặn admin tự xóa tài khoản của chính mình
    if (user && customerEmail === user.email) {
      toast.error('Lỗi: Bạn không thể tự xóa tài khoản của chính mình!');
      return;
    }
    if (!window.confirm('Bạn có chắc chắn muốn xóa người dùng này? Hành động này không thể hoàn tác.')) return;

    try {
      const token = localStorage.getItem('token');
      const apiUrl = API_BASE_URL || '';
      const response = await fetch(`${apiUrl}/api/v1/admin/customers/${customerId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        toast.success(result.message);
        fetchCustomers(); // Reload data
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Lỗi hệ thống khi xóa người dùng.');
    }
  };

  // Handle Toggle Status (Khóa / Mở khóa)
  const handleToggleStatus = async (customer) => {
    // Ngăn chặn admin tự khóa tài khoản của chính mình
    if (user && customer.email === user.email) {
      toast.error('Lỗi: Bạn không thể tự khóa tài khoản của chính mình!');
      return;
    }
    const actionText = customer.status === 'Hoạt động' ? 'tạm khóa' : 'mở khóa';
    if (!window.confirm(`Bạn có chắc chắn muốn ${actionText} tài khoản của người dùng này?`)) return;

    try {
      const token = localStorage.getItem('token');
      const apiUrl = API_BASE_URL || '';
      const response = await fetch(`${apiUrl}/api/v1/admin/customers/${customer.id}/toggle-status`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        toast.success(result.message);
        fetchCustomers(); // Reload data để cập nhật chấm xanh/đỏ
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Lỗi hệ thống khi cập nhật trạng thái.');
    }
  };

  // Mở modal báo cáo và gọi API lấy số liệu thật
  const handleOpenSecurityReport = async () => {
    setIsSecurityModalOpen(true);
    try {
      const token = localStorage.getItem('token');
      const apiUrl = API_BASE_URL || '';
      const response = await fetch(`${apiUrl}/api/v1/admin/security-report`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        setSecurityStats(result.data.stats);
      }
    } catch (error) {
      console.error('Lỗi khi lấy báo cáo bảo mật:', error);
    }
  };

  // Handle Send Security Reminders
  const handleSendSecurityReminders = async () => {
    setIsSendingEmails(true);
    try {
      const token = localStorage.getItem('token');
      const apiUrl = API_BASE_URL || '';
      const response = await fetch(`${apiUrl}/api/v1/admin/customers/security-reminders`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        toast.success(result.message || 'Đã gửi email nhắc nhở bảo mật thành công!');
        setIsSecurityModalOpen(false); // Tắt modal nếu đang mở
      } else {
        toast.error(result.message || 'Có lỗi xảy ra khi gửi email.');
      }
    } catch (error) {
      toast.error('Lỗi kết nối máy chủ khi gửi email.');
    } finally {
      setIsSendingEmails(false);
    }
  };

  // Handle Send Individual Security Reminder
  const handleSendIndividualReminder = async (customer) => {
    if (!window.confirm(`Bạn có muốn gửi email khuyến nghị đổi mật khẩu tới ${customer.email}?`)) return;
    if (isSendingEmails) return;
    const toastId = toast.loading(`Đang gửi email cho ${customer.name}...`);
    try {
      const token = localStorage.getItem('token');
      const apiUrl = API_BASE_URL || '';
      const response = await fetch(`${apiUrl}/api/v1/admin/security-reminder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId: customer.id, type: 'password_change_recommendation' })
      });
      const result = await response.json();
      if (result.success) {
        toast.success(result.message, { id: toastId });
      } else {
        toast.error(result.message || 'Có lỗi xảy ra khi gửi email.', { id: toastId });
      }
    } catch (error) {
      toast.error('Lỗi kết nối máy chủ khi gửi email.', { id: toastId });
    }
  };

  // Thay đổi trạng thái checkbox quyền hạn
  const handleRolePermissionChange = (role, permissionKey) => {
    setRolePermissions(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [permissionKey]: !prev[role][permissionKey]
      }
    }));
  };

  // Xử lý lưu phân quyền
  const handleSavePermissions = async () => {
    setIsSavingRoles(true);
    try {
      const token = localStorage.getItem('token');
      const apiUrl = API_BASE_URL || '';
      const response = await fetch(`${apiUrl}/api/v1/admin/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(rolePermissions)
      });
      const result = await response.json();
      if (result.success) {
        toast.success(result.message || 'Đã cập nhật phân quyền hệ thống thành công!');
        setShowRoleDetails(false);
      } else {
        toast.error(result.message || 'Lỗi cập nhật phân quyền');
      }
    } catch (error) {
      toast.error('Lỗi kết nối máy chủ');
    } finally {
      setIsSavingRoles(false);
    }
  };

  // Logic Lọc danh sách
  const filteredCustomers = customers.filter(customer => {
    const matchSearch = !searchQuery ||
      (customer.name && customer.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (customer.email && customer.email.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchRole = roleFilter === 'all' || customer.role === roleFilter;
    const matchStatus = statusFilter === 'all' || customer.status === statusFilter;
    return matchSearch && matchRole && matchStatus;
  });

  // Logic phân trang
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCustomers = filteredCustomers.slice(indexOfFirstItem, indexOfLastItem);

  // Chức năng Xuất báo cáo (Tải file CSV)
  const handleExportReport = () => {
    if (filteredCustomers.length === 0) {
      toast.error('Không có dữ liệu để xuất!');
      return;
    }

    // 1. Tạo header cho file CSV
    const headers = ['ID', 'Họ và tên', 'Email', 'Vai trò', 'Trạng thái', 'Ngày tham gia'];

    // 2. Chuyển đổi dữ liệu sang định dạng CSV
    const csvData = filteredCustomers.map(customer => {
      return [
        `"${customer.id || ''}"`,
        `"${(customer.name || '').replace(/"/g, '""')}"`,
        `"${customer.email || ''}"`,
        `"${customer.role || ''}"`,
        `"${customer.status || ''}"`,
        `"${customer.date || ''}"`
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
    link.setAttribute('download', `danh_sach_nguoi_dung_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Đã tải xuống danh sách thành công!');
  };

  // Map tên quyền từ tiếng Anh sang tiếng Việt cho dễ hiển thị
  const permissionLabels = {
    products: 'Quản lý Sản phẩm',
    orders: 'Quản lý Đơn hàng',
    customers: 'Quản lý Khách hàng',
    vouchers: 'Mã giảm giá',
    inventory: 'Kho hàng',
    reports: 'Báo cáo & Thống kê',
    settings: 'Cài đặt Hệ thống'
  };

  const headerCenterContent = (
    <div className="max-w-md w-full relative group">
      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors text-sm">search</span>
      <input
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          setCurrentPage(1); // Reset về trang 1
        }}
        className="w-full bg-slate-100 border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
        placeholder="Tìm kiếm người dùng, email..."
        type="text"
      />
    </div>
  );

  return (
    <AdminLayout title="Quản lý Người dùng" headerCenterContent={headerCenterContent}>
      <div className="p-5 max-w-7xl mx-auto">
        {/* Hero Stats / Bento Header */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="col-span-1 md:col-span-2 bg-gradient-to-br from-primary to-blue-800 p-6 rounded-2xl text-white flex flex-col justify-between shadow-md">
            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-1 font-headline">Quản lý Người dùng</h2>
              <p className="opacity-80 font-body text-xs max-w-sm">Kiểm soát quyền truy cập, tài khoản khách hàng và bảo mật hệ thống dữ liệu tại trung tâm điều hành.</p>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={handleOpenSecurityReport} className="bg-white/20 hover:bg-white/30 backdrop-blur-md px-4 py-2 rounded-lg text-xs font-semibold transition-all">
                Xem Báo cáo Bảo mật
              </button>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl flex flex-col justify-center shadow-sm border border-gray-100">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Tổng người dùng</span>
            <span className="text-3xl font-black text-blue-900 font-headline">{stats.totalUsers}</span>
            <div className="flex items-center gap-1 text-emerald-600 text-[10px] mt-1 font-bold">
              <span className="material-symbols-outlined text-xs">trending_up</span>
              <span>+{stats.newThisMonth} tháng này</span>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl flex flex-col justify-center shadow-sm border border-gray-100">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Phiên hoạt động</span>
            <span className="text-3xl font-black text-blue-900 font-headline">{stats.activeSessions}</span>
            <div className="flex items-center gap-1 text-slate-400 text-[10px] mt-1 font-bold">
              <span className="material-symbols-outlined text-xs">timer</span>
              <span>Đang truy cập hệ thống</span>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-blue-900 font-headline">Danh sách Tài khoản</h3>
            <span className="bg-blue-50 text-blue-900 text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Live</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleExportReport} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all font-semibold text-xs bg-white shadow-sm">
              <span className="material-symbols-outlined text-base">download</span>
              Xuất dữ liệu
            </button>
            {isAdmin && (
              <button onClick={() => openModal()} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-blue-800 text-white shadow-lg shadow-blue-900/20 hover:shadow-blue-900/40 active:scale-95 transition-all font-semibold text-xs">
                <span className="material-symbols-outlined text-base">person_add</span>
                Thêm người dùng
              </button>
            )}
          </div>
        </div>

        {/* Main Layout: 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Left: User Table (8/12) */}
          <div className="col-span-1 lg:col-span-8 space-y-6">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={roleFilter}
                onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
                className="bg-white border border-gray-200 text-xs font-medium text-slate-600 rounded-lg py-1.5 px-3 focus:ring-1 focus:ring-primary shadow-sm outline-none cursor-pointer"
              >
                <option value="all">Tất cả vai trò</option>
                <option value="Admin">Admin</option>
                <option value="Nhân viên">Nhân viên</option>
                <option value="Khách hàng">Khách hàng</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                className="bg-white border border-gray-200 text-xs font-medium text-slate-600 rounded-lg py-1.5 px-3 focus:ring-1 focus:ring-primary shadow-sm outline-none cursor-pointer"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="Hoạt động">Hoạt động</option>
                <option value="Tạm khóa">Tạm khóa</option>
              </select>
              <button
                onClick={() => { setRoleFilter('all'); setStatusFilter('all'); setSearchQuery(''); setCurrentPage(1); }}
                className="ml-auto text-primary text-xs font-bold hover:underline"
              >
                Xóa bộ lọc
              </button>
            </div>

            {/* Table Card */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-4 py-3 text-[9px] font-bold text-slate-500 uppercase tracking-widest">Người dùng</th>
                      <th className="px-4 py-3 text-[9px] font-bold text-slate-500 uppercase tracking-widest">Chức vụ</th>
                      <th className="px-4 py-3 text-[9px] font-bold text-slate-500 uppercase tracking-widest">Hạng</th>
                      <th className="px-4 py-3 text-[9px] font-bold text-slate-500 uppercase tracking-widest text-center">Chi tiêu</th>
                      <th className="px-4 py-3 text-[9px] font-bold text-slate-500 uppercase tracking-widest text-center">Trạng thái</th>
                      <th className="px-4 py-3 text-[9px] font-bold text-slate-500 uppercase tracking-widest text-center">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {loading ? (
                      <tr><td colSpan="7" className="text-center py-8 text-slate-500 text-sm">Đang tải dữ liệu...</td></tr>
                    ) : currentCustomers.length > 0 ? currentCustomers.map(customer => (
                      <tr key={customer.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {customer.avatar ? (
                              <img src={getImageUrl(customer.avatar)} alt={customer.name} className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }} />
                            ) : null}
                            <div className={`w-8 h-8 rounded-full ${customer.bgClass || 'bg-blue-50'} flex items-center justify-center ${customer.textClass || 'text-blue-600'} font-bold text-xs shrink-0`} style={{ display: customer.avatar ? 'none' : 'flex' }}>
                              {customer.initials || (customer.name ? customer.name.charAt(0).toUpperCase() : 'U')}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-blue-900">{customer.name}</p>
                              <p className="text-[10px] text-slate-500">{customer.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`material-symbols-outlined text-base ${
                              customer.role === 'Admin' ? 'text-blue-600' :
                              customer.role === 'Nhân viên' ? 'text-amber-600' :
                              'text-slate-400'
                            }`}>
                              {customer.role === 'Admin' ? 'verified_user' :
                               customer.role === 'Nhân viên' ? 'support_agent' :
                               'person'}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                              customer.role === 'Admin' ? 'bg-blue-100 text-blue-700' :
                              customer.role === 'Nhân viên' ? 'bg-amber-100 text-amber-700' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {customer.role === 'Admin' ? 'Admin' :
                               customer.role === 'Nhân viên' ? 'Nhân viên' :
                               'Khách hàng'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${customer.rank === 'diamond' ? 'bg-cyan-100 text-cyan-700' :
                              customer.rank === 'gold' ? 'bg-amber-100 text-amber-700' :
                                customer.rank === 'silver' ? 'bg-slate-200 text-slate-700' :
                                  'bg-orange-100 text-orange-700'
                            }`}>
                            {customer.rank === 'diamond' ? 'Kim cương' :
                              customer.rank === 'gold' ? 'Vàng' :
                                customer.rank === 'silver' ? 'Bạc' : 'Đồng'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <p className="text-[10px] font-bold text-blue-900">{Number(customer.total_spending || 0).toLocaleString('vi-VN')}đ</p>
                          <p className="text-[8px] text-slate-500">{customer.order_count || 0} đơn</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${customer.status === 'Hoạt động' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                              <span className={`text-[10px] font-semibold ${customer.status === 'Hoạt động' ? 'text-emerald-600' : 'text-red-600'}`}>
                                {customer.status}
                              </span>
                            </div>
                            <span className="text-[8px] text-slate-400 font-mono">{customer.date}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-0.5 transition-opacity">
                            {isAdmin ? (
                              <>
                                <button onClick={() => openModal(customer)} className="p-1.5 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors" title="Chỉnh sửa">
                                  <span className="material-symbols-outlined text-base">edit</span>
                                </button>
                                <button onClick={() => handleSendIndividualReminder(customer)} className="p-1.5 hover:bg-amber-100 text-amber-600 rounded-lg transition-colors" title="Gửi nhắc nhở bảo mật">
                                  <span className="material-symbols-outlined text-base">mail</span>
                                </button>
                                <button onClick={() => handleToggleStatus(customer)} className={`p-1.5 rounded-lg transition-colors ${customer.status === 'Hoạt động' ? 'hover:bg-red-100 text-red-600' : 'hover:bg-emerald-100 text-emerald-600'}`} title={customer.status === 'Hoạt động' ? 'Tạm khóa' : 'Mở khóa'}>
                                  <span className="material-symbols-outlined text-base">{customer.status === 'Hoạt động' ? 'lock' : 'lock_open'}</span>
                                </button>
                                <button onClick={() => handleDelete(customer.id, customer.email)} className="p-1.5 hover:bg-red-100 text-red-600 rounded-lg transition-colors" title="Xóa">
                                  <span className="material-symbols-outlined text-base">delete</span>
                                </button>
                              </>
                            ) : (
                              <span className="text-[10px] font-semibold text-slate-400">Chỉ xem</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan="7" className="text-center py-8 text-slate-500 text-sm">Không tìm thấy người dùng phù hợp.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-end bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="w-7 h-7 rounded-md flex items-center justify-center border border-slate-200 text-slate-400 hover:bg-white transition-colors disabled:opacity-50">
                    <span className="material-symbols-outlined text-sm">chevron_left</span>
                  </button>
                  <span className="text-[10px] font-bold text-slate-600 px-1">Trang {currentPage} / {totalPages || 1}</span>
                  <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages || totalPages === 0} className="w-7 h-7 rounded-md flex items-center justify-center border border-slate-200 text-slate-600 hover:bg-white transition-colors disabled:opacity-50">
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right: RBAC Quick Settings (4/12) */}
          <div className="col-span-1 lg:col-span-4 space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-lg font-bold text-blue-900 font-headline">Vai trò & Quyền hạn</h4>
              </div>

              {!showRoleDetails ? (
                <>
                  <div className="space-y-4">
                    {/* Role Item 1: Admin */}
                    <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/50">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-primary text-xl">verified_user</span>
                          <span className="font-bold text-blue-900">Admin</span>
                        </div>
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded uppercase">Full Access</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-[10px] bg-white text-slate-600 px-2 py-1 rounded border border-slate-200 shadow-sm">Quản lý sản phẩm</span>
                        <span className="text-[10px] bg-white text-slate-600 px-2 py-1 rounded border border-slate-200 shadow-sm">Quản lý đơn hàng</span>
                        <span className="text-[10px] bg-white text-slate-600 px-2 py-1 rounded border border-slate-200 shadow-sm">Quản lý khách hàng</span>
                        <span className="text-[10px] bg-white text-slate-600 px-2 py-1 rounded border border-slate-200 shadow-sm">Xem báo cáo</span>
                        <span className="text-[10px] bg-white text-slate-600 px-2 py-1 rounded border border-slate-200 shadow-sm">Cài đặt hệ thống</span>
                      </div>
                    </div>
                    
                    {/* Role Item 2: Staff */}
                    <div className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-all cursor-pointer group bg-white shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors text-xl">support_agent</span>
                          <span className="font-bold text-slate-700">Nhân viên</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {rolePermissions.Staff && Object.entries(rolePermissions.Staff).map(([key, val]) => (
                          val && permissionLabels[key] ? (
                            <span key={key} className="text-[10px] bg-slate-50 text-slate-600 px-2 py-1 rounded border border-slate-100">{permissionLabels[key]}</span>
                          ) : null
                        ))}
                        {rolePermissions.Staff && Object.values(rolePermissions.Staff).every(v => !v) && (
                          <span className="text-[10px] text-slate-400 italic">Chưa được cấp quyền</span>
                        )}
                      </div>
                    </div>

                    {/* Role Item 3: Customer - Chỉ view */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 cursor-not-allowed opacity-75">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-slate-400 text-xl">person</span>
                          <span className="font-bold text-slate-700">Khách hàng</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded uppercase">View Only</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-[10px] bg-white text-slate-600 px-2 py-1 rounded border border-slate-200">Không có quyền quản trị</span>
                      </div>
                    </div>
                  </div>
                  {isAdmin && (
                    <button onClick={() => setShowRoleDetails(true)} className="w-full mt-6 py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 text-sm font-bold hover:border-primary hover:text-primary hover:bg-blue-50/50 transition-all">
                      Tùy chỉnh phân quyền chi tiết
                    </button>
                  )}
                </>
              ) : (
                <div className="animate-fade-in-up">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
                    <div className="flex gap-4">
                      <button onClick={() => setActiveRoleTab('Admin')} className={`text-sm font-bold pb-2 border-b-2 transition-all ${activeRoleTab === 'Admin' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Admin</button>
                      <button onClick={() => setActiveRoleTab('Staff')} className={`text-sm font-bold pb-2 border-b-2 transition-all ${activeRoleTab === 'Staff' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Nhân viên</button>
                    </div>
                    <button onClick={() => setShowRoleDetails(false)} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 font-semibold mb-2">
                      <span className="material-symbols-outlined text-[14px]">arrow_back</span> Đóng
                    </button>
                  </div>

                  <div className="space-y-4">
                    {activeRoleTab === 'Admin' && (
                      <div className="space-y-3">
                        <p className="text-xs text-slate-500 mb-3">Quyền hạn cao nhất. Có quyền thực hiện mọi thao tác trên hệ thống.</p>
                        <label className="flex items-center justify-between p-3 rounded-lg border border-primary bg-blue-50/30 cursor-not-allowed">
                          <span className="text-sm font-semibold text-blue-900">Toàn quyền hệ thống</span>
                          <input type="checkbox" checked disabled className="w-4 h-4 text-primary rounded" />
                        </label>
                      </div>
                    )}
                    {activeRoleTab === 'Staff' && (
                      <div className="space-y-2 h-[250px] overflow-y-auto custom-scrollbar pr-2">
                        <label className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 transition-colors border border-slate-100">
                          <span className="text-sm font-semibold text-slate-700">Quản lý Đơn hàng</span>
                          <input type="checkbox" checked={rolePermissions.Staff.orders} onChange={() => handleRolePermissionChange('Staff', 'orders')} className="w-4 h-4 accent-primary rounded cursor-pointer" />
                        </label>
                        <label className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 transition-colors border border-slate-100">
                          <span className="text-sm font-semibold text-slate-700">Quản lý Khách hàng</span>
                          <input type="checkbox" checked={rolePermissions.Staff.customers} onChange={() => handleRolePermissionChange('Staff', 'customers')} className="w-4 h-4 accent-primary rounded cursor-pointer" />
                        </label>
                        <label className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 transition-colors border border-slate-100">
                          <span className="text-sm font-semibold text-slate-700">Quản lý Sản phẩm</span>
                          <input type="checkbox" checked={rolePermissions.Staff.products} onChange={() => handleRolePermissionChange('Staff', 'products')} className="w-4 h-4 accent-primary rounded cursor-pointer" />
                        </label>
                        <label className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 transition-colors border border-slate-100">
                          <span className="text-sm font-semibold text-slate-700">Mã giảm giá</span>
                          <input type="checkbox" checked={rolePermissions.Staff.vouchers} onChange={() => handleRolePermissionChange('Staff', 'vouchers')} className="w-4 h-4 accent-primary rounded cursor-pointer" />
                        </label>
                        <label className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 transition-colors border border-slate-100">
                          <span className="text-sm font-semibold text-slate-700">Kho hàng</span>
                          <input type="checkbox" checked={rolePermissions.Staff.inventory} onChange={() => handleRolePermissionChange('Staff', 'inventory')} className="w-4 h-4 accent-primary rounded cursor-pointer" />
                        </label>
                        <label className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 transition-colors border border-slate-100">
                          <span className="text-sm font-semibold text-slate-700">Báo cáo & Thống kê</span>
                          <input type="checkbox" checked={rolePermissions.Staff.reports} onChange={() => handleRolePermissionChange('Staff', 'reports')} className="w-4 h-4 accent-primary rounded cursor-pointer" />
                        </label>
                        <label className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 transition-colors border border-slate-100">
                          <span className="text-sm font-semibold text-slate-700">Cài đặt Hệ thống</span>
                          <input type="checkbox" checked={rolePermissions.Staff.settings} onChange={() => handleRolePermissionChange('Staff', 'settings')} className="w-4 h-4 accent-primary rounded cursor-pointer" />
                        </label>
                      </div>
                    )}
                  </div>
                  <button onClick={handleSavePermissions} disabled={isSavingRoles} className="w-full mt-4 px-4 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-blue-800 transition-colors shadow-sm disabled:opacity-70 flex justify-center items-center gap-2">
                    {isSavingRoles ? <><span className="material-symbols-outlined text-sm animate-spin">refresh</span> Đang lưu...</> : 'Lưu phân quyền'}
                  </button>
                </div>
              )}
            </div>

            {/* Security Alert Card */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-2xl text-white shadow-lg relative overflow-hidden">
              <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-8xl opacity-10">security</span>
              <h5 className="font-bold mb-3 flex items-center gap-2 text-amber-400">
                <span className="material-symbols-outlined text-xl">gpp_maybe</span>
                Cảnh báo bảo mật
              </h5>
              <p className="text-xs opacity-90 leading-relaxed mb-5 text-slate-200">Phát hiện một số tài khoản có mật khẩu yếu hoặc chưa bật 2FA. Hãy yêu cầu cập nhật ngay để đảm bảo an toàn hệ thống.</p>
              {isAdmin && (
                <button onClick={handleSendSecurityReminders} disabled={isSendingEmails} className="w-full bg-white text-slate-900 py-2.5 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors shadow-sm disabled:opacity-70 disabled:cursor-wait">
                  {isSendingEmails ? 'Đang gửi email...' : 'Gửi nhắc nhở bảo mật'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Thêm/Sửa Người dùng */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-8">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200 animate-fade-in-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-slate-50">
              <h3 className="font-bold text-lg text-slate-900">{editingCustomer ? 'Chỉnh sửa Người dùng' : 'Thêm Người dùng mới'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-slate-900 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Họ</label>
                  <input type="text" required value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className="w-full bg-slate-100 border border-slate-200 rounded-lg px-4 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" placeholder="Nguyễn" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Tên</label>
                  <input type="text" required value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className="w-full bg-slate-100 border border-slate-200 rounded-lg px-4 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" placeholder="Văn An" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
                <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full bg-slate-100 border border-slate-200 rounded-lg px-4 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" placeholder="email@example.com" />
              </div>
              {!editingCustomer && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Mật khẩu</label>
                  <input type="password" required value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full bg-slate-100 border border-slate-200 rounded-lg px-4 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" placeholder="••••••••" />
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Vai trò</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full bg-slate-100 border border-slate-200 rounded-lg px-4 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
                >
                  <option value="Khách hàng">Khách hàng</option>
                  <option value="Nhân viên">Nhân viên</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
              <div className="pt-4 flex items-center justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-lg text-slate-600 font-semibold hover:bg-slate-100 transition-colors">Hủy bỏ</button>
                <button type="submit" disabled={isSaving} className="px-6 py-2.5 rounded-lg bg-primary text-white font-bold hover:bg-opacity-90 transition-colors shadow-sm disabled:opacity-70 disabled:cursor-wait">
                  {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Báo cáo bảo mật */}
      {isSecurityModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-8">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200 animate-fade-in-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-slate-50">
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-500">security</span>
                Báo cáo Bảo mật Hệ thống
              </h3>
              <button onClick={() => setIsSecurityModalOpen(false)} className="text-slate-500 hover:text-slate-900 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-red-500 text-sm">block</span>
                    <p className="text-xs font-bold text-red-600 uppercase tracking-wider">Tài khoản rủi ro/Khóa</p>
                  </div>
                  <p className="text-3xl font-black text-red-700">{customers.filter(c => c.status !== 'Hoạt động').length}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-blue-500 text-sm">admin_panel_settings</span>
                    <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Quản trị viên (Admin)</p>
                  </div>
                  <p className="text-3xl font-black text-blue-700">{customers.filter(c => c.role === 'Admin').length}</p>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm text-slate-700 space-y-3">
                <h4 className="font-bold text-slate-900 border-b border-slate-200 pb-2 mb-2">Thông tin chi tiết</h4>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-amber-500 text-base mt-0.5">warning</span>
                  <div>
                    <p className="font-semibold text-slate-800">Cảnh báo: {securityStats.unverifiedPhones || 0} tài khoản chưa xác thực SĐT / chưa bật 2FA</p>
                    <p className="text-xs text-slate-500">Hệ thống ghi nhận các tài khoản chưa thực hiện xác thực Số điện thoại. Khuyến nghị gửi email nhắc nhở họ cập nhật bảo mật (Bật xác thực 2 lớp).</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-emerald-500 text-base mt-0.5">check_circle</span>
                  <div>
                    <p className="font-semibold text-slate-800">Không có dấu hiệu brute-force</p>
                    <p className="text-xs text-slate-500">Hệ thống ghi nhận tỷ lệ đăng nhập sai mật khẩu trong 24h qua ở mức an toàn (&lt; 2%).</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-between bg-white items-center">
              <button onClick={handleSendSecurityReminders} disabled={isSendingEmails} className="text-sm font-bold text-primary hover:underline disabled:opacity-50 disabled:no-underline flex items-center gap-2">
                {isSendingEmails ? <><span className="material-symbols-outlined text-sm animate-spin">refresh</span> Đang gửi...</> : 'Gửi nhắc nhở bảo mật'}
              </button>
              <button onClick={() => setIsSecurityModalOpen(false)} className="px-6 py-2.5 bg-slate-200 text-slate-800 font-bold rounded-lg hover:bg-slate-300 transition-colors">Đóng báo cáo</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminCustomers;