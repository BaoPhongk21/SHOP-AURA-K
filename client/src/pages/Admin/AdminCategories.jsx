import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import AdminLayout from './AdminLayout';

import { API_BASE_URL } from '../../config/api.config';

const AdminCategories = () => {
  const { user } = useContext(AuthContext);
  const userRole = user?.role || 'customer';
  const isAdmin = userRole === 'admin';

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    is_active: true
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/categories`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) setCategories(result.data || []);
    } catch (error) {
      toast.error('Lỗi khi lấy dữ liệu danh mục');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleOpenModal = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        slug: category.slug,
        description: category.description || '',
        is_active: category.is_active
      });
    } else {
      setEditingCategory(null);
      setFormData({ name: '', slug: '', description: '', is_active: true });
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa danh mục này?')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/categories/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        toast.success(result.message);
        fetchCategories();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Lỗi khi xóa danh mục');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const url = editingCategory 
        ? `${API_BASE_URL}/api/v1/admin/categories/${editingCategory.id}` 
        : `${API_BASE_URL}/api/v1/admin/categories`;
      const method = editingCategory ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      const result = await response.json();
      if (result.success) {
        toast.success(result.message);
        setIsModalOpen(false);
        fetchCategories();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Lỗi khi lưu danh mục');
    }
  };

  const headerCenterContent = (
    <div className="hidden md:flex items-center text-sm font-bold text-on-surface-variant uppercase tracking-wider bg-surface-container-low px-4 py-2 rounded-lg">
      <span className="material-symbols-outlined text-base mr-2">category</span>
      Danh mục Sản phẩm
    </div>
  );

  return (
    <AdminLayout title="Quản lý Danh mục" headerCenterContent={headerCenterContent}>
      <div className="p-8 max-w-7xl w-full mx-auto space-y-8">
        <header className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-black text-on-surface tracking-tight font-headline">Quản lý Danh mục</h2>
            <p className="text-on-surface-variant mt-1">Phân loại và cấu trúc cây thư mục sản phẩm của hệ thống.</p>
          </div>
          {isAdmin && (
            <button 
              onClick={() => handleOpenModal()} 
              className="bg-primary text-white px-6 py-2.5 rounded-lg font-bold text-sm shadow-md hover:brightness-110 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">add</span> Thêm Danh Mục Mới
            </button>
          )}
        </header>

        <div className="bg-surface rounded-2xl shadow-sm border border-surface-container overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-lowest border-b border-surface-container">
                  <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">ID</th>
                  <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">Tên Danh Mục</th>
                  <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">Đường dẫn (Slug)</th>
                  <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest text-center">Trạng thái</th>
                  {isAdmin && <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest text-right">Thao tác</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {loading ? (
                  <tr><td colSpan={isAdmin ? "5" : "4"} className="text-center py-10 text-on-surface-variant">Đang tải dữ liệu...</td></tr>
                ) : categories.length > 0 ? categories.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(cat => (
                  <tr key={cat.id} className="hover:bg-surface-container-lowest transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-slate-500">#{cat.id}</td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-on-surface">{cat.name}</p>
                      {cat.description && <p className="text-xs text-on-surface-variant line-clamp-1">{cat.description}</p>}
                    </td>
                    <td className="px-6 py-4 text-xs text-blue-600 font-mono bg-blue-50/50 rounded inline-block mt-3 ml-6">{cat.slug}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${cat.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {cat.is_active ? 'Hiển thị' : 'Đang ẩn'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleOpenModal(cat)} className="p-2 bg-surface-container hover:bg-primary hover:text-white rounded-lg transition-colors text-on-surface-variant">
                            <span className="material-symbols-outlined text-sm">edit</span>
                          </button>
                          <button onClick={() => handleDelete(cat.id)} className="p-2 bg-surface-container hover:bg-error hover:text-white rounded-lg transition-colors text-error">
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                )) : (
                  <tr><td colSpan={isAdmin ? "5" : "4"} className="text-center py-10 text-on-surface-variant text-sm">Chưa có danh mục nào.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {categories.length > itemsPerPage && (
            <div className="p-4 border-t border-surface-container flex items-center justify-between bg-surface-container-lowest">
              <p className="text-xs text-on-surface-variant font-medium">Hiển thị {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, categories.length)} trên tổng {categories.length} danh mục</p>
              <div className="flex gap-2 items-center">
                <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="p-2 hover:bg-surface-container rounded-lg disabled:opacity-50 transition-colors">
                  <span className="material-symbols-outlined text-sm">chevron_left</span>
                </button>
                <span className="text-xs font-bold text-on-surface-variant">Trang {currentPage} / {Math.ceil(categories.length / itemsPerPage)}</span>
                <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(categories.length / itemsPerPage)))} disabled={currentPage === Math.ceil(categories.length / itemsPerPage)} className="p-2 hover:bg-surface-container rounded-lg disabled:opacity-50 transition-colors">
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Thêm/Sửa */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-surface rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-center p-6 border-b border-surface-container bg-surface-container-lowest">
                <h3 className="text-lg font-bold text-on-surface">{editingCategory ? 'Chỉnh sửa Danh mục' : 'Thêm Danh mục mới'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-on-surface-variant hover:text-error transition-colors p-1 bg-surface-container hover:bg-error/10 rounded-full">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <form onSubmit={handleSave} className="p-6 space-y-5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-on-surface-variant uppercase">Tên Danh Mục</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      // Tự động tạo slug từ tên
                      const slug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 -]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-+/, '').replace(/-+$/, '');
                      setFormData({...formData, name, slug});
                    }}
                    className="w-full px-4 py-2 bg-surface-container-lowest border border-surface-container rounded-lg focus:border-primary outline-none transition-all text-sm font-medium"
                    placeholder="VD: Áo thun nam"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-on-surface-variant uppercase">Đường dẫn (Slug)</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.slug}
                    onChange={(e) => setFormData({...formData, slug: e.target.value})}
                    className="w-full px-4 py-2 bg-surface-container-lowest border border-surface-container rounded-lg focus:border-primary outline-none transition-all text-sm font-medium text-blue-600 font-mono"
                    placeholder="VD: ao-thun-nam"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-on-surface-variant uppercase">Mô tả (Không bắt buộc)</label>
                  <textarea 
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-4 py-2 bg-surface-container-lowest border border-surface-container rounded-lg focus:border-primary outline-none transition-all text-sm font-medium min-h-[80px]"
                    placeholder="Mô tả ngắn về danh mục này..."
                  ></textarea>
                </div>
                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={formData.is_active} onChange={(e) => setFormData({...formData, is_active: e.target.checked})} />
                    <div className="w-11 h-6 bg-surface-container peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                  <span className="text-sm font-bold text-on-surface">Hiển thị trên cửa hàng</span>
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 bg-surface-container hover:bg-surface-container-high text-on-surface font-bold rounded-lg transition-colors">Hủy</button>
                  <button type="submit" className="flex-1 py-2.5 bg-primary hover:bg-blue-700 text-white font-bold rounded-lg transition-all shadow-md active:scale-[0.98]">{editingCategory ? 'Lưu thay đổi' : 'Tạo mới'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminCategories;
