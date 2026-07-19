import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import AdminLayout from './AdminLayout';

import { API_BASE_URL } from '../../config/api.config';

const AdminVouchers = () => {
  const { user } = useContext(AuthContext);

  const userRole = user?.role ? String(user.role).toLowerCase().trim() : '';
  const isAdmin = userRole === 'admin';
  const [searchQuery, setSearchQuery] = useState('');

  // States cho Bộ lọc
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // States lưu dữ liệu từ API
  const [vouchers, setVouchers] = useState([]);
  const [stats, setStats] = useState({ totalVouchers: 0, activeVouchers: 0, usedToday: 0, totalSaved: 0 });
  const [loading, setLoading] = useState(true);

  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // States cho Form Thêm/Sửa
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState(null);
  const [formData, setFormData] = useState({
    code: '', discount_type: 'fixed', discount_value: '', min_order_value: '',
    start_date: '', end_date: '', usage_limit: '', is_active: true,
    max_discount_amount: '', limit_per_user: 1, min_rank_required: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  };

  // Lấy dữ liệu Vouchers từ API
  const fetchVouchers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/vouchers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success && result.data) {
        setVouchers(result.data.vouchers || []);
        setStats(result.data.stats || { totalVouchers: 0, activeVouchers: 0, usedToday: 0, totalSaved: 0 });
      }
    } catch (error) {
      console.error('Lỗi khi lấy dữ liệu mã giảm giá:', error);
      toast.error('Không thể tải danh sách mã giảm giá');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
  }, []);

  // Lọc và Phân trang
  const filteredVouchers = vouchers.filter(v => {
    const matchSearch = !searchQuery || v.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'all' || v.status === statusFilter;
    const matchType = typeFilter === 'all' || v.raw_type === typeFilter;

    return matchSearch && matchStatus && matchType;
  });
  const totalPages = Math.ceil(filteredVouchers.length / itemsPerPage);
  const currentVouchers = filteredVouchers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Hàm Xóa API
  const handleDelete = async (id, code) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa mã ${code}?`)) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/v1/admin/vouchers/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        if (result.success) {
          toast.success(`Đã xóa mã ${code}`);
          fetchVouchers(); // Tải lại danh sách sau khi xóa
        } else {
          toast.error(result.message || 'Lỗi khi xóa mã giảm giá');
        }
      } catch (error) {
        toast.error('Lỗi hệ thống khi xóa');
      }
    }
  };

  // Mở Modal Thêm/Sửa
  const openModal = (voucher = null) => {
    if (voucher) {
      setEditingVoucher(voucher);
      setFormData({
        code: voucher.code || '', discount_type: voucher.raw_type || 'fixed', discount_value: voucher.raw_value || '',
        min_order_value: voucher.raw_min_order_value || '', start_date: formatDateForInput(voucher.raw_start_date),
        end_date: formatDateForInput(voucher.raw_end_date), usage_limit: voucher.usage_limit || '', is_active: voucher.raw_is_active,
        max_discount_amount: voucher.max_discount_amount || '', limit_per_user: voucher.limit_per_user || 1,
        min_rank_required: voucher.min_rank_required || ''
      });
    } else {
      setEditingVoucher(null);
      setFormData({
        code: '', discount_type: 'fixed', discount_value: '', min_order_value: '',
        start_date: new Date().toISOString().split('T')[0], end_date: '', usage_limit: '', is_active: true,
        max_discount_amount: '', limit_per_user: 1, min_rank_required: ''
      });
    }
    setIsModalOpen(true);
  };

  // Hàm Lưu (Submit Form)
  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const method = editingVoucher ? 'PUT' : 'POST';
      const url = editingVoucher ? `${API_BASE_URL}/api/v1/admin/vouchers/${editingVoucher.id}` : `${API_BASE_URL}/api/v1/admin/vouchers`;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          ...formData,
          discount_value: Number(formData.discount_value),
          min_order_value: formData.min_order_value ? Number(formData.min_order_value) : null,
          usage_limit: formData.usage_limit ? Number(formData.usage_limit) : null,
          max_discount_amount: formData.max_discount_amount ? Number(formData.max_discount_amount) : null,
          limit_per_user: Number(formData.limit_per_user || 1),
          min_rank_required: formData.min_rank_required || null
        })
      });
      const result = await response.json();
      if (result.success) {
        toast.success(result.message);
        setIsModalOpen(false);
        fetchVouchers();
      } else toast.error(result.message);
    } catch (error) {
      toast.error('Lỗi hệ thống khi lưu.');
    } finally { setIsSaving(false); }
  };

  const headerCenterContent = (
    <div className="max-w-md w-full relative group">
      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors text-sm">search</span>
      <input
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full bg-slate-100 border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
        placeholder="Tìm kiếm chiến dịch, mã code..."
        type="text"
      />
    </div>
  );

  return (
    <AdminLayout title="Quản lý Mã giảm giá" headerCenterContent={headerCenterContent}>
      <>
        <div className="p-8 max-w-7xl mx-auto space-y-8">

          {/* KPI Section (Bento Grid) */}
          <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white shadow-sm p-6 rounded-xl border border-gray-200 hover:border-primary/30 transition-all duration-300 group">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                  <span className="material-symbols-outlined">analytics</span>
                </div>
              </div>
              <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Tổng mã giảm giá</p>
              <h3 className="text-2xl font-bold text-blue-900 mt-1 font-headline">{loading ? '...' : stats.totalVouchers}</h3>
            </div>
            <div className="bg-white shadow-sm p-6 rounded-xl border border-gray-200 hover:border-primary/30 transition-all duration-300 group">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                  <span className="material-symbols-outlined">check_circle</span>
                </div>
                <span className="text-xs font-bold text-emerald-600">Đang chạy</span>
              </div>
              <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Mã đang hoạt động</p>
              <h3 className="text-2xl font-bold text-blue-900 mt-1 font-headline">{loading ? '...' : stats.activeVouchers}</h3>
            </div>
            <div className="bg-white shadow-sm p-6 rounded-xl border border-gray-200 hover:border-primary/30 transition-all duration-300 group">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                  <span className="material-symbols-outlined">shopping_cart_checkout</span>
                </div>
                <span className="text-xs font-bold text-slate-400">Hôm nay</span>
              </div>
              <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Lượt sử dụng</p>
              <h3 className="text-2xl font-bold text-blue-900 mt-1 font-headline">{loading ? '...' : stats.usedToday}</h3>
            </div>
            <div className="bg-white shadow-sm p-6 rounded-xl border border-gray-200 hover:border-primary/30 transition-all duration-300 group">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                  <span className="material-symbols-outlined">savings</span>
                </div>
                <span className="text-xs font-bold text-green-600">Tổng cộng</span>
              </div>
              <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Tiết kiệm cho khách</p>
              <h3 className="text-2xl font-bold text-blue-900 mt-1 font-headline">{loading ? '...' : `${Number(stats.totalSaved).toLocaleString('vi-VN')} ₫`}</h3>
            </div>
          </section>

          {/* Filters & Actions */}
          <section className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                  className="appearance-none px-4 py-2 pl-9 pr-8 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50 transition-all outline-none cursor-pointer"
                >
                  <option value="all">Trạng thái: Tất cả</option>
                  <option value="Đang hoạt động">Đang hoạt động</option>
                  <option value="Đã lên lịch">Đã lên lịch</option>
                  <option value="Đã hết hạn">Đã hết hạn</option>
                </select>
                <span className="material-symbols-outlined text-sm absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">filter_list</span>
                <span className="material-symbols-outlined text-sm absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">expand_more</span>
              </div>
              <div className="relative">
                <select
                  value={typeFilter}
                  onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
                  className="appearance-none px-4 py-2 pl-9 pr-8 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50 transition-all outline-none cursor-pointer"
                >
                  <option value="all">Loại: Tất cả</option>
                  <option value="fixed">Số tiền cố định (VNĐ)</option>
                  <option value="percent">Phần trăm (%)</option>
                  <option value="freeship">Freeship (Miễn phí vận chuyển)</option>
                </select>
                <span className="material-symbols-outlined text-sm absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">category</span>
                <span className="material-symbols-outlined text-sm absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">expand_more</span>
              </div>
              {(statusFilter !== 'all' || typeFilter !== 'all' || searchQuery !== '') && (
                <button
                  onClick={() => { setStatusFilter('all'); setTypeFilter('all'); setSearchQuery(''); setCurrentPage(1); }}
                  className="text-sm font-bold text-primary hover:underline ml-2"
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>
            {isAdmin && (
              <button onClick={() => openModal()} className="bg-primary text-white px-6 py-2.5 rounded-lg font-headline font-bold text-sm flex items-center gap-2 hover:bg-blue-800 active:scale-95 transition-all shadow-lg shadow-primary/20">
                <span className="material-symbols-outlined">add_circle</span>
                Tạo mã giảm giá mới
              </button>
            )}
          </section>

          {/* Coupon Table */}
          <section className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Mã Code</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Loại</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Giá trị / Trần %</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Hạng / Lượt dùng</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ngày hết hạn</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-slate-500">Đang tải dữ liệu...</td>
                  </tr>
                ) : currentVouchers.length > 0 ? currentVouchers.map((voucher) => (
                  <tr key={voucher.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-mono font-bold px-2 py-1 rounded ${voucher.status === 'Đã hết hạn' ? 'text-slate-400 bg-slate-100' : 'text-primary bg-primary/5'}`}>
                          {voucher.code}
                        </span>
                        <button 
                          onClick={() => { navigator.clipboard.writeText(voucher.code); toast.success('Đã copy mã!'); }}
                          className="p-1 rounded bg-slate-100 text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors"
                          title="Copy mã"
                        >
                          <span className="material-symbols-outlined text-sm">content_copy</span>
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{voucher.type}</td>
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {voucher.raw_type === 'percent' ? (
                        <div className="flex flex-col">
                          <span>{voucher.value}%</span>
                          {voucher.max_discount_amount && (
                            <span className="text-[10px] text-amber-600 font-bold">Tối đa: {Number(voucher.max_discount_amount).toLocaleString('vi-VN')}đ</span>
                          )}
                        </div>
                      ) : voucher.raw_type === 'freeship' ? (
                        <span className="text-emerald-600 font-bold">Freeship 100%</span>
                      ) : (
                        <span>{Number(voucher.value).toLocaleString('vi-VN')}₫</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-full max-w-[100px]">
                        <div className="flex justify-between text-[10px] mb-1 font-bold text-slate-600">
                          <span className={`uppercase ${voucher.min_rank_required ? 'text-amber-600' : 'text-slate-400'}`}>
                            {voucher.min_rank_required === 'diamond' ? 'Kim cương' :
                              voucher.min_rank_required === 'gold' ? 'Vàng' :
                                voucher.min_rank_required === 'silver' ? 'Bạc' :
                                  voucher.min_rank_required === 'bronze' ? 'Đồng' : 'Tất cả'}
                          </span>
                          <span>{Number(voucher.used || 0).toLocaleString('vi-VN')} / {voucher.usage_limit || '∞'}</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${voucher.status === 'Đã hết hạn' ? 'bg-slate-400' : 'bg-primary'}`}
                            style={{ width: voucher.usage_limit ? `${(voucher.used / voucher.usage_limit) * 100}%` : (voucher.used > 0 ? '40%' : '0%') }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${voucher.status === 'Đang hoạt động' ? 'bg-green-100 text-green-700' :
                          voucher.status === 'Đã lên lịch' ? 'bg-blue-100 text-blue-700' :
                            'bg-red-100 text-red-700'
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${voucher.status === 'Đang hoạt động' ? 'bg-green-500' :
                            voucher.status === 'Đã lên lịch' ? 'bg-blue-500' :
                              'bg-red-500'
                          }`}></span>
                        {voucher.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">{voucher.end_date ? new Date(voucher.end_date).toLocaleDateString('vi-VN') : 'N/A'}</td>
                    <td className="px-6 py-4 text-right">
                      {isAdmin && ( // Chỉ admin mới được sửa
                        <button onClick={() => openModal(voucher)} className="p-2 text-slate-400 hover:text-primary transition-colors" title="Chỉnh sửa/Xem">
                          <span className="material-symbols-outlined">{voucher.status === 'Đã hết hạn' ? 'visibility' : 'edit'}</span>
                        </button>
                      )}
                      {/* Chỉ Admin mới được phép xóa Voucher */}
                      {isAdmin && (
                        <button onClick={() => handleDelete(voucher.id, voucher.code)} className="p-2 text-slate-400 hover:text-error transition-colors" title="Xóa">
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-slate-500">Không tìm thấy mã giảm giá phù hợp.</td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center text-sm text-slate-500">
              <p>Hiển thị {filteredVouchers.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-{Math.min(currentPage * itemsPerPage, filteredVouchers.length)} trên tổng {filteredVouchers.length} mã giảm giá</p>
              <div className="flex gap-2">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-white transition-all disabled:opacity-50 text-slate-500" disabled={currentPage === 1}>
                  <span className="material-symbols-outlined text-sm">chevron_left</span>
                </button>
                <span className="px-3 py-1 font-bold text-slate-700">Trang {currentPage} / {totalPages || 1}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white transition-all border border-transparent hover:border-slate-200 disabled:opacity-50" disabled={currentPage === totalPages || totalPages === 0}>
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </button>
              </div>
            </div>
          </section>
        </div>
        {/* Floating Action for Mobile */}
        <div className="md:hidden fixed bottom-6 right-6 z-50">
          <button onClick={() => openModal()} className="w-14 h-14 bg-primary text-white rounded-full shadow-xl flex items-center justify-center active:scale-90 transition-transform">
            <span className="material-symbols-outlined">add</span>
          </button>
        </div>
      </>

      {/* Modal Thêm/Sửa Mã giảm giá */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-8">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-y-auto max-h-full border border-gray-200 animate-fade-in-up custom-scrollbar">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-slate-50 sticky top-0 z-10">
              <h3 className="font-bold text-lg text-slate-900">{editingVoucher ? 'Chỉnh sửa Mã giảm giá' : 'Tạo Mã giảm giá mới'}</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-slate-900 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Mã Code *</label>
                  <input type="text" required value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all uppercase font-mono" placeholder="VD: SUMMER20" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Trạng thái</label>
                  <select value={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'true' })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer">
                    <option value="true">Kích hoạt</option>
                    <option value="false">Tạm khóa</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Loại giảm giá</label>
                  <select
                    value={formData.discount_type}
                    onChange={(e) => {
                      const newType = e.target.value;
                      setFormData({
                        ...formData,
                        discount_type: newType,
                        discount_value: newType === 'freeship' ? 0 : formData.discount_value
                      });
                    }}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
                  >
                    <option value="fixed">Số tiền cố định (VNĐ)</option>
                    <option value="percent">Phần trăm (%)</option>
                    <option value="freeship">Miễn phí vận chuyển (Freeship)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    {formData.discount_type === 'freeship' ? 'Mức giảm (Tự động)' : 'Mức giảm *'}
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    disabled={formData.discount_type === 'freeship'}
                    value={formData.discount_type === 'freeship' ? 0 : formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-50 disabled:bg-slate-100"
                    placeholder={formData.discount_type === 'freeship' ? "Miễn phí 100%" : formData.discount_type === 'percent' ? "VD: 15" : "VD: 50000"}
                  />
                </div>
                {formData.discount_type === 'percent' && (
                  <div className="col-span-2 mt-2">
                    <label className="block text-xs font-bold text-amber-600 mb-1 uppercase tracking-wider">Số tiền giảm tối đa (Max Discount)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.max_discount_amount}
                      onChange={(e) => setFormData({ ...formData, max_discount_amount: e.target.value })}
                      className="w-full bg-white border border-amber-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                      placeholder="VD: 50000 (Để trống nếu không giới hạn trần)"
                    />
                    <p className="text-[10px] text-slate-500 mt-1 italic">* Giúp tránh thất thoát khi khách mua đơn hàng giá trị lớn.</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Yêu cầu Hạng thành viên</label>
                  <select
                    value={formData.min_rank_required}
                    onChange={(e) => setFormData({ ...formData, min_rank_required: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-900 outline-none cursor-pointer"
                  >
                    <option value="">Tất cả thành viên</option>
                    <option value="bronze">Hạng Đồng (Bronze)</option>
                    <option value="silver">Hạng Bạc (Silver)</option>
                    <option value="gold">Hạng Vàng (Gold)</option>
                    <option value="diamond">Hạng Kim cương (Diamond)</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tổng lượt</label>
                    <input type="number" min="0" value={formData.usage_limit} onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-xs text-slate-900 outline-none" placeholder="∞" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Lượt/KH</label>
                    <input type="number" min="1" required value={formData.limit_per_user} onChange={(e) => setFormData({ ...formData, limit_per_user: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-xs text-slate-900 outline-none" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Ngày bắt đầu</label>
                  <input type="date" required value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Ngày kết thúc *</label>
                  <input type="date" required value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-lg text-slate-600 font-semibold hover:bg-slate-100 transition-colors">Hủy bỏ</button>
                <button type="submit" disabled={isSaving} className="px-6 py-2.5 rounded-lg bg-primary text-white font-bold hover:bg-opacity-90 transition-colors shadow-sm disabled:opacity-70 disabled:cursor-wait flex items-center gap-2">
                  {isSaving ? 'Đang lưu...' : 'Lưu mã giảm giá'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminVouchers;