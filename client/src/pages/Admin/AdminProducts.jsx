import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import AdminLayout from './AdminLayout';
import { API_BASE_URL } from '../../config/api.config';
import { getImageUrl } from '../Register/api.config';
import {
  StatCard, Card, PageHeader, Modal, Button, Input, Select,
  Loading, EmptyState, Pagination, Badge, StockStatusPill
} from '../../components/UI/Card';

const AdminProducts = () => {
  const { user } = useContext(AuthContext);
  const userRole = user?.role ? String(user.role).toLowerCase().trim() : '';
  const isAdmin = userRole === 'admin';

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState({ totalProducts: 0, lowStockCount: 0, inventoryValue: 0 });
  const [inventoryLogs, setInventoryLogs] = useState([]);
  const [formOptions, setFormOptions] = useState({ categories: [], brands: [], skus: [], sizes: [], colors: [] });
  const [loading, setLoading] = useState(true);

  const [contacts, setContacts] = useState([]);
  const [unreadContactCount, setUnreadContactCount] = useState(0);
  const [showContactModal, setShowContactModal] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [activeTab, setActiveTab] = useState('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '', price: '', category_id: '', sku: '', brand: '',
    description: '', variants: []
  });
  const [imageFile, setImageFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef(null);

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/products`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const result = await response.json();

      if (result.success && result.data) {
        setProducts(result.data.products || []);
        setStats(result.data.stats || { totalProducts: 0, lowStockCount: 0, inventoryValue: 0 });
        setInventoryLogs(result.data.logs || []);
        setFormOptions(result.data.formOptions || { categories: [], brands: [], skus: [], sizes: [], colors: [] });
        setContacts(result.data.contacts || []);
        setUnreadContactCount(result.data.unreadContactCount || 0);
      }
    } catch (error) {
      console.error('Lỗi lấy danh sách sản phẩm:', error);
      toast.error('Không thể tải dữ liệu sản phẩm!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa sản phẩm này không?')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const result = await response.json();
      if (result.success) {
        toast.success(result.message);
        fetchProducts();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Lỗi hệ thống khi xóa!');
    }
  };

  const openModal = (product = null) => {
    if (product) {
      setEditingId(product.id);
      setFormData({
        name: product.name || '',
        price: product.price || '',
        category_id: product.category_id || '',
        sku: product.sku || '',
        brand: product.brand || '',
        description: product.description || '',
        variants: product.variants || [],
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '', price: '', category_id: '', sku: '', brand: '', description: '',
        variants: [{ size_id: '', color_id: '', quantity: '' }],
      });
    }
    setImageFile(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId ? `${API_BASE_URL}/api/v1/admin/products/${editingId}` : `${API_BASE_URL}/api/v1/admin/products`;

      const submitData = new FormData();
      submitData.append('name', formData.name);
      submitData.append('price', formData.price);
      submitData.append('category_id', formData.category_id);
      submitData.append('sku', formData.sku);
      submitData.append('brand', formData.brand);
      submitData.append('description', formData.description);
      submitData.append('variants', JSON.stringify(formData.variants));
      if (imageFile) submitData.append('image', imageFile);

      const response = await fetch(url, {
        method,
        headers: { 'Authorization': `Bearer ${token}` },
        body: submitData,
      });
      const result = await response.json();
      if (result.success) {
        toast.success(result.message);
        setIsModalOpen(false);
        fetchProducts();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Lỗi hệ thống khi lưu!');
    } finally {
      setIsSaving(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/contacts/${id}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, is_read: true } : c)));
        setUnreadContactCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) { console.error(err); }
  };

  const handleSendReply = async (id) => {
    if (!replyMessage.trim()) {
      toast.error('Vui lòng nhập nội dung phản hồi!');
      return;
    }
    setIsSendingReply(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/contacts/${id}/reply`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ replyMessage }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setReplyingTo(null);
        setReplyMessage('');
        setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, is_read: true } : c)));
        setUnreadContactCount((prev) => Math.max(0, prev - 1));
      } else toast.error(data.message);
    } catch (err) { toast.error('Lỗi kết nối máy chủ'); } finally { setIsSendingReply(false); }
  };

  const outOfStockCount = products.filter((p) => Number(p.total_stock) === 0).length;
  const lowStockCountFiltered = products.filter((p) => Number(p.total_stock) <= 5 && Number(p.total_stock) > 0).length;

  const handleAddVariant = () => {
    setFormData({ ...formData, variants: [...formData.variants, { size_id: '', color_id: '', quantity: '' }] });
  };

  const handleRemoveVariant = (index) => {
    const newVariants = [...formData.variants];
    newVariants.splice(index, 1);
    setFormData({ ...formData, variants: newVariants });
  };

  const handleVariantChange = (index, field, value) => {
    const newVariants = [...formData.variants];
    newVariants[index][field] = value;
    setFormData({ ...formData, variants: newVariants });
  };

  // Lọc và sắp xếp sản phẩm
  const filteredProducts = products
    .filter((product) => {
      let matchSearch = true;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        matchSearch =
          (product.name && product.name.toLowerCase().includes(query)) ||
          (product.sku && product.sku.toLowerCase().includes(query)) ||
          (product.category_name && product.category_name.toLowerCase().includes(query));
      }
      let matchTab = true;
      if (activeTab === 'out_of_stock') matchTab = Number(product.total_stock) === 0;
      if (activeTab === 'low_stock') matchTab = Number(product.total_stock) <= 5 && Number(product.total_stock) > 0;
      return matchSearch && matchTab;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price_asc': return Number(a.price) - Number(b.price);
        case 'price_desc': return Number(b.price) - Number(a.price);
        case 'stock_asc': return Number(a.total_stock || 0) - Number(b.total_stock || 0);
        case 'stock_desc': return Number(b.total_stock || 0) - Number(a.total_stock || 0);
        case 'name_asc': return (a.name || '').localeCompare(b.name || '');
        case 'newest':
        default:
          return new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0);
      }
    });

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);

  const handleExportReport = () => {
    if (products.length === 0) {
      toast.error('Không có dữ liệu để xuất!');
      return;
    }
    const headers = ['ID', 'Tên sản phẩm', 'SKU', 'Danh mục', 'Giá', 'Tổng Tồn kho', 'Hình ảnh', 'Mô tả', 'Ngày tạo'];
    const csvData = products.map((p) => [
      p.id,
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${p.sku || ''}"`,
      `"${p.category_name || ''}"`,
      p.price,
      p.total_stock,
      `"${p.image_url || ''}"`,
      `"${(p.description || '').replace(/"/g, '""')}"`,
      new Date(p.created_at || p.createdAt || Date.now()).toLocaleDateString('vi-VN'),
    ].join(','));
    const csvString = [headers.join(','), ...csvData].join('\n');
    const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `bao_cao_san_pham_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Đã tải xuống báo cáo thành công!');
  };

  const handleBulkImportClick = () => fileInputRef.current?.click();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv') && !isExcel) {
      toast.error('Vui lòng chọn file định dạng .csv hoặc Excel (.xlsx)');
      return;
    }
    handleUploadBulkFile(file);
    e.target.value = null;
  };

  const handleUploadBulkFile = async (file) => {
    const loadingToast = toast.loading(`Đang tải lên và xử lý file ${file.name}...`);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/products/import-bulk`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      const result = await response.json();
      if (result.success) {
        toast.success(result.message, { id: loadingToast });
        fetchProducts();
      } else {
        toast.error(result.message, { id: loadingToast });
      }
    } catch (error) {
      toast.error('Lỗi kết nối khi nhập kho!', { id: loadingToast });
    }
  };

  const headerCenterContent = (
    <div className="hidden md:flex max-w-md w-full relative group">
      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors text-sm">
        search
      </span>
      <input
        value={searchQuery}
        onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
        className="w-full bg-slate-100 border border-transparent rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none transition-all"
        placeholder="Tìm kiếm sản phẩm, SKU hoặc kho..."
        type="text"
      />
    </div>
  );

  const tabs = [
    { id: 'all', label: 'Tất cả', count: products.length, color: 'blue' },
    { id: 'out_of_stock', label: 'Hết hàng', count: outOfStockCount, color: 'slate' },
    { id: 'low_stock', label: 'Sắp hết hàng', count: lowStockCountFiltered, color: 'amber' },
  ];

  return (
    <AdminLayout title="Quản lý Sản phẩm & Tồn kho" headerCenterContent={headerCenterContent}>
      <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto">
        <PageHeader
          icon="inventory_2"
          title="Quản lý Sản phẩm & Tồn kho"
          subtitle="Theo dõi hàng hóa, biến thể và hòm thư khách hàng"
          actions={
            <>
              {isAdmin && (
                <>
                  <Button
                    onClick={handleExportReport}
                    variant="secondary"
                    icon="file_download"
                  >
                    Xuất báo cáo
                  </Button>
                  <input
                    type="file"
                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                  />
                  <Button
                    onClick={handleBulkImportClick}
                    variant="secondary"
                    icon="upload_file"
                  >
                    Nhập kho
                  </Button>
                  <Button
                    onClick={() => openModal()}
                    variant="primary"
                    icon="add"
                  >
                    Thêm sản phẩm
                  </Button>
                </>
              )}
            </>
          }
        />

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Tổng sản phẩm"
            value={stats.totalProducts}
            icon="inventory_2"
            color="blue"
            loading={loading}
          />
          <StatCard
            title="Cảnh báo sắp hết"
            value={stats.lowStockCount}
            icon="priority_high"
            color="amber"
            subtitle="Cần nhập kho"
            loading={loading}
          />
          <StatCard
            title="Giá trị tồn kho"
            value={`${(stats.inventoryValue || 0).toLocaleString('vi-VN')}đ`}
            icon="payments"
            color="emerald"
            loading={loading}
          />

          {/* Hòm thư Liên hệ Widget */}
          <button
            onClick={() => setShowContactModal(true)}
            className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl relative overflow-hidden text-left flex flex-col justify-between border border-slate-700 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
          >
            <div className={`absolute -top-10 -right-10 w-24 h-24 ${unreadContactCount > 0 ? 'bg-rose-500' : 'bg-blue-500'} rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition-opacity duration-700`}></div>
            <div className="relative z-10">
              <div className={`w-14 h-14 bg-gradient-to-tr ${unreadContactCount > 0 ? 'from-rose-500 to-orange-400 shadow-rose-500/30 animate-pulse' : 'from-blue-500 to-indigo-400 shadow-blue-500/30'} rounded-xl flex items-center justify-center mb-3 shadow-lg`}>
                <span className="material-symbols-outlined text-2xl text-white">mail</span>
                {unreadContactCount > 0 && (
                  <span className="absolute -mt-2 ml-9 bg-rose-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-slate-900">
                    {unreadContactCount}
                  </span>
                )}
              </div>
              <h4 className="font-bold text-base mb-1 tracking-tight">Hòm thư Liên hệ</h4>
              <p className="text-xs text-slate-400 max-w-[180px]">
                {unreadContactCount > 0
                  ? `Bạn có ${unreadContactCount} tin nhắn mới.`
                  : 'Chưa có tin nhắn mới nào.'}
              </p>
            </div>
            <div className="mt-3 relative z-10 flex items-center gap-2 text-xs font-bold text-blue-300 group-hover:gap-3 transition-all">
              Xem tin nhắn
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </div>
          </button>
        </div>

        {/* Main Products Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          {/* Tabs + Sort bar */}
          <div className="px-5 pt-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gradient-to-r from-slate-50/50 to-white">
            <div className="flex items-center gap-6 overflow-x-auto custom-scrollbar">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setCurrentPage(1); }}
                  className={`text-sm pb-3 -mb-px transition-all font-bold flex items-center gap-2 border-b-2 ${
                    activeTab === tab.id
                      ? `border-${tab.color}-500 text-${tab.color}-600`
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                  style={activeTab === tab.id ? {
                    borderColor: tab.color === 'blue' ? '#3b82f6' : tab.color === 'amber' ? '#f59e0b' : '#64748b',
                    color: tab.color === 'blue' ? '#2563eb' : tab.color === 'amber' ? '#d97706' : '#334155',
                  } : {}}
                >
                  {tab.label}
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 pb-2">
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                options={[
                  { value: 'newest', label: 'Mới nhất' },
                  { value: 'name_asc', label: 'Tên A → Z' },
                  { value: 'price_asc', label: 'Giá thấp → cao' },
                  { value: 'price_desc', label: 'Giá cao → thấp' },
                  { value: 'stock_asc', label: 'Tồn ít nhất' },
                  { value: 'stock_desc', label: 'Tồn nhiều nhất' },
                ]}
                className="min-w-[160px]"
                icon="sort"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/80 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Sản phẩm</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Danh mục</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Phân loại</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Đơn giá</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Tồn kho</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-5 py-12">
                      <Loading text="Đang tải sản phẩm..." />
                    </td>
                  </tr>
                ) : currentProducts.length > 0 ? (
                  currentProducts.map((prod) => (
                    <tr key={prod.id} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                            <img
                              className="h-full w-full object-cover"
                              alt={prod.name}
                              src={getImageUrl(prod.image_url)}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextSibling.style.display = 'flex';
                              }}
                            />
                            <span
                              className="material-symbols-outlined text-slate-400 h-full w-full flex items-center justify-center"
                              style={{ display: 'none' }}
                            >
                              inventory_2
                            </span>
                          </div>
                          <div className="max-w-[200px]">
                            <p className="font-bold text-sm text-slate-900 truncate" title={prod.name}>
                              {prod.name}
                            </p>
                            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-tight">
                              SKU: {prod.sku || `PRD-${prod.id}`}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-600 max-w-[120px] truncate">
                        {prod.category_name || <span className="text-slate-400 italic">Chưa phân loại</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {prod.variants && prod.variants.length > 0 ? (
                            prod.variants.slice(0, 2).map((v, i) => (
                              <span
                                key={i}
                                className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold border border-slate-200"
                                title={`Tồn kho: ${v.quantity}`}
                              >
                                {[v.size_name || (v.size_id ? `Size ${v.size_id}` : ''), v.color_name || (v.color_id ? `Màu ${v.color_id}` : '')].filter(Boolean).join(' - ') || 'Mặc định'}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 font-semibold">
                              Tất cả cỡ
                            </span>
                          )}
                          {prod.variants && prod.variants.length > 2 && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 font-bold">
                              +{prod.variants.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm font-bold text-slate-900 text-right">
                        {Number(prod.price).toLocaleString('vi-VN')}đ
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`text-sm font-extrabold px-2.5 py-1 rounded-lg ${
                          Number(prod.total_stock) === 0
                            ? 'bg-slate-100 text-slate-500'
                            : Number(prod.total_stock) <= 5
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {prod.total_stock}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <StockStatusPill quantity={Number(prod.total_stock)} />
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openModal(prod)}
                            className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                            title="Chỉnh sửa"
                          >
                            <span className="material-symbols-outlined text-lg">edit</span>
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(prod.id)}
                              className="p-2 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors"
                              title="Xóa"
                            >
                              <span className="material-symbols-outlined text-lg">delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-5 py-12">
                      <EmptyState
                        icon="inventory_2"
                        title="Không tìm thấy sản phẩm"
                        description={searchQuery ? `Không có kết quả cho "${searchQuery}"` : 'Hãy thêm sản phẩm mới để bắt đầu.'}
                        action={isAdmin && !searchQuery ? (
                          <Button onClick={() => openModal()} variant="primary" icon="add">
                            Thêm sản phẩm mới
                          </Button>
                        ) : null}
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredProducts.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </div>

        {/* Bottom: Stock Logs & Tips */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className="lg:col-span-2">
            <h3 className="text-lg font-bold tracking-tight mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-600">history</span>
              Hoạt động kho gần đây
            </h3>
            <Card padding={false}>
              <div className="p-2 space-y-1">
                {inventoryLogs.length > 0 ? (
                  inventoryLogs.slice(0, 6).map((log) => (
                    <div
                      key={log.id}
                      className={`flex items-center justify-between p-3 rounded-xl border-l-4 ${
                        log.type === 'import' ? 'border-emerald-500 bg-emerald-50/30' : 'border-blue-500 bg-blue-50/30'
                      } hover:shadow-sm transition-all`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          log.type === 'import' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                          <span className="material-symbols-outlined">
                            {log.type === 'import' ? 'add_box' : 'shopping_cart_checkout'}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{log.title}</p>
                          <p className="text-[11px] text-slate-500">
                            {log.actor} • {log.time ? new Date(log.time).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : 'N/A'}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-slate-400">#{log.id}</span>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-400">
                    <span className="material-symbols-outlined text-4xl opacity-30">history</span>
                    <p className="text-sm mt-2 font-medium">Chưa có hoạt động nào.</p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Tips Card */}
          <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-6 rounded-2xl text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 opacity-10">
              <span className="material-symbols-outlined text-[160px] -translate-x-4">lightbulb</span>
            </div>
            <div className="relative z-10">
              <h4 className="text-lg font-extrabold mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined">lightbulb</span>
                Tối ưu tồn kho
              </h4>
              <p className="text-sm opacity-90 leading-relaxed mb-6">
                {stats.lowStockCount > 0
                  ? `Hiện có ${stats.lowStockCount} sản phẩm sắp hết hàng. Hãy nhập thêm để tránh gián đoạn kinh doanh.`
                  : 'Tồn kho đang ở mức an toàn. Hãy kiểm tra định kỳ.'}
              </p>
              <button className="bg-white text-blue-700 px-4 py-2 rounded-xl text-xs font-bold hover:shadow-lg hover:shadow-black/20 transition-all">
                Xem gợi ý chi tiết →
              </button>
            </div>
            <div className="mt-6 pt-6 border-t border-white/20 relative z-10">
              <div className="flex justify-between items-center text-[10px] uppercase font-bold opacity-80 mb-2">
                <span>Mức độ ổn định</span>
                <span>
                  {stats.totalProducts > 0
                    ? Math.round(((stats.totalProducts - (stats.lowStockCount || 0)) / stats.totalProducts) * 100)
                    : 0}%
                </span>
              </div>
              <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-white h-full transition-all duration-700"
                  style={{
                    width: `${stats.totalProducts > 0
                      ? Math.round(((stats.totalProducts - (stats.lowStockCount || 0)) / stats.totalProducts) * 100)
                      : 0}%`
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Product Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Chỉnh sửa Sản phẩm' : 'Thêm Sản phẩm mới'}
        subtitle={editingId ? 'Cập nhật thông tin sản phẩm' : 'Tạo sản phẩm mới trong hệ thống'}
        icon="add_box"
        size="lg"
      >
        <form onSubmit={handleSave} className="p-6 space-y-5">
          <Input
            label="Tên sản phẩm"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Nhập tên sản phẩm..."
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="number"
              label="Giá bán (VNĐ)"
              required
              min="0"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="0"
              icon="payments"
            />
            <Select
              label="Danh mục"
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              options={[
                { value: '', label: '-- Chọn danh mục --' },
                ...formOptions.categories.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
            <Input
              label="Mã SKU"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
              placeholder="SKU..."
            />
            <Input
              label="Thương hiệu"
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              placeholder="Thương hiệu..."
            />
          </div>

          {/* Variants */}
          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-bold text-slate-700">Phân loại Kích cỡ & Số lượng</label>
              <Button type="button" onClick={handleAddVariant} variant="secondary" size="sm" icon="add">
                Thêm size
              </Button>
            </div>
            <div className="space-y-3">
              {formData.variants.map((variant, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <select
                    value={variant.size_id}
                    onChange={(e) => handleVariantChange(index, 'size_id', e.target.value)}
                    className="flex-1 bg-white border border-slate-200 text-slate-900 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">-- Kích cỡ --</option>
                    {formOptions.sizes?.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <select
                    value={variant.color_id}
                    onChange={(e) => handleVariantChange(index, 'color_id', e.target.value)}
                    className="flex-1 bg-white border border-slate-200 text-slate-900 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">-- Màu sắc --</option>
                    {formOptions.colors?.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="0"
                    placeholder="Số lượng"
                    value={variant.quantity}
                    onChange={(e) => handleVariantChange(index, 'quantity', e.target.value)}
                    className="w-28 bg-white border border-slate-200 text-slate-900 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveVariant(index)}
                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <span className="material-symbols-outlined text-base">delete</span>
                  </button>
                </div>
              ))}
              {formData.variants.length === 0 && (
                <p className="text-xs text-slate-400 italic text-center py-2">
                  Chưa có phân loại nào. Hãy thêm ít nhất 1 size.
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Mô tả sản phẩm</label>
            <textarea
              rows="4"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none font-medium"
              placeholder="Nhập mô tả chi tiết sản phẩm..."
            ></textarea>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Hình ảnh sản phẩm</label>
            <div className="flex items-center gap-4 mb-3">
              {formData.image_url && !imageFile && (
                <div className="relative">
                  <img
                    src={getImageUrl(formData.image_url)}
                    alt="Current"
                    className="w-16 h-16 object-cover rounded-lg border border-slate-200 shadow-sm"
                  />
                  <span className="absolute -top-2 -right-2 bg-slate-700 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                    Hiện tại
                  </span>
                </div>
              )}
              {imageFile && (
                <div className="relative">
                  <img
                    src={URL.createObjectURL(imageFile)}
                    alt="Preview"
                    className="w-16 h-16 object-cover rounded-lg border-2 border-blue-500 shadow-sm"
                  />
                  <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold shadow-sm">
                    Mới
                  </span>
                </div>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files[0])}
              className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all cursor-pointer"
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t">
            <Button type="button" onClick={() => setIsModalOpen(false)} variant="ghost">
              Hủy bỏ
            </Button>
            <Button type="submit" variant="primary" loading={isSaving} icon="save">
              {editingId ? 'Lưu thay đổi' : 'Tạo sản phẩm'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Contact Modal */}
      <Modal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        title="Hòm thư Khách hàng"
        subtitle={`${contacts.length} tin nhắn - ${unreadContactCount} chưa đọc`}
        icon="mail"
        size="lg"
      >
        <div className="p-6 space-y-4">
          {contacts.length > 0 ? (
            contacts.map((contact) => {
              const parsedAttachments = contact.attachments
                ? JSON.parse(contact.attachments)
                : { images: [], video: null };
              return (
                <div
                  key={contact.id}
                  className={`p-4 rounded-xl border ${
                    !contact.is_read
                      ? 'bg-blue-50/50 border-blue-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-slate-900 flex items-center gap-2">
                        {contact.name}
                        {!contact.is_read && (
                          <Badge color="info" size="sm">Mới</Badge>
                        )}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        <a href={`mailto:${contact.email}`} className="hover:text-blue-600 hover:underline">
                          {contact.email}
                        </a>
                        {' • '}
                        {contact.phone || 'Không có SĐT'}
                      </p>
                    </div>
                    <span className="text-xs text-slate-500 font-medium">
                      {new Date(contact.created_at || contact.createdAt).toLocaleString('vi-VN')}
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-lg text-sm text-slate-700 mt-3 border border-slate-200 whitespace-pre-wrap">
                    {contact.message}
                  </div>

                  {(parsedAttachments.images?.length > 0 || parsedAttachments.video) && (
                    <div className="mt-3 pt-3 border-t border-slate-200 flex gap-2 flex-wrap">
                      {parsedAttachments.images?.map((imgUrl, i) => (
                        <a
                          key={i}
                          href={imgUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="block w-20 h-20 rounded-md border overflow-hidden hover:opacity-80 transition-opacity"
                        >
                          <img src={imgUrl} alt="attachment" className="w-full h-full object-cover" />
                        </a>
                      ))}
                      {parsedAttachments.video && (
                        <video src={parsedAttachments.video} controls className="w-full max-w-sm rounded-md border" />
                      )}
                    </div>
                  )}

                  <div className="mt-3 flex justify-end gap-4">
                    {replyingTo !== contact.id && (
                      <button
                        onClick={() => { setReplyingTo(contact.id); setReplyMessage(''); }}
                        className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">reply</span>
                        Trả lời qua Email
                      </button>
                    )}
                    {!contact.is_read && (
                      <button
                        onClick={() => markAsRead(contact.id)}
                        className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                        Đánh dấu đã đọc
                      </button>
                    )}
                  </div>

                  {replyingTo === contact.id && (
                    <div className="mt-3 bg-white p-4 rounded-xl border border-blue-200 shadow-inner">
                      <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">
                        Nội dung phản hồi
                      </label>
                      <textarea
                        className="w-full text-sm p-3 border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none transition-all"
                        rows="4"
                        placeholder="Nhập nội dung phản hồi..."
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                      />
                      <div className="flex justify-end gap-3 mt-3">
                        <button
                          onClick={() => setReplyingTo(null)}
                          className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
                        >
                          Hủy
                        </button>
                        <Button
                          onClick={() => handleSendReply(contact.id)}
                          loading={isSendingReply}
                          variant="primary"
                          size="sm"
                          icon="send"
                        >
                          Gửi phản hồi
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <EmptyState
              icon="drafts"
              title="Hòm thư trống"
              description="Chưa có tin nhắn nào từ khách hàng."
            />
          )}
        </div>
      </Modal>
    </AdminLayout>
  );
};

export default AdminProducts;
