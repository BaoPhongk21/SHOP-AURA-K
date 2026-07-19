import React, { useState, useEffect, useContext } from 'react';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../../config/api.config';
import { getImageUrl } from '../Register/api.config';
import { AuthContext } from '../../context/AuthContext';

const PAGES = [
    { key: 'home', label: 'Trang chủ' },
    { key: 'products', label: 'Trang Sản phẩm' },
    { key: 'brands', label: 'Trang Thương hiệu' },
    { key: 'offers', label: 'Trang Ưu đãi' },
    { key: 'contact', label: 'Trang Liên hệ' }
];

const BannerManager = () => {
    const { user } = useContext(AuthContext);
    const isAdmin = user?.role === 'admin';

    const [activePage, setActivePage] = useState('home');
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        link_url: '',
        sort_order: 0,
        is_active: true
    });

    useEffect(() => {
        fetchBanners();
    }, [activePage]);

    const fetchBanners = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/v1/admin/banners`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                const filtered = (data.data || []).filter(b => b.page_key === activePage);
                setBanners(filtered);
            }
        } catch (e) {
            console.error('Lỗi lấy banner:', e);
            toast.error('Không thể tải danh sách banner.');
        } finally {
            setLoading(false);
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const resetForm = () => {
        setFormData({ title: '', link_url: '', sort_order: 0, is_active: true });
        setImageFile(null);
        setImagePreview(null);
        setEditingId(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!editingId && !imageFile) {
            toast.error('Vui lòng chọn ảnh banner.');
            return;
        }

        const submitData = new FormData();
        submitData.append('page_key', activePage);
        submitData.append('title', formData.title);
        submitData.append('link_url', formData.link_url);
        submitData.append('sort_order', String(formData.sort_order));
        submitData.append('is_active', formData.is_active ? 'true' : 'false');
        if (imageFile) submitData.append('image', imageFile);

        const token = localStorage.getItem('token');
        const url = editingId
            ? `${API_BASE_URL}/api/v1/admin/banners/${editingId}`
            : `${API_BASE_URL}/api/v1/admin/banners`;
        const method = editingId ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Authorization': `Bearer ${token}` },
                body: submitData
            });
            const data = await res.json();
            if (data.success) {
                toast.success(editingId ? 'Cập nhật banner thành công!' : 'Thêm banner thành công!');
                resetForm();
                fetchBanners();
            } else {
                toast.error(data.message || 'Lỗi khi lưu banner.');
            }
        } catch (err) {
            console.error(err);
            toast.error('Lỗi hệ thống khi lưu banner.');
        }
    };

    const handleEdit = (banner) => {
        setEditingId(banner.id);
        setFormData({
            title: banner.title || '',
            link_url: banner.link_url || '',
            sort_order: banner.sort_order || 0,
            is_active: banner.is_active
        });
        setImageFile(null);
        setImagePreview(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Bạn có chắc muốn xóa banner này?')) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/v1/admin/banners/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Đã xóa banner.');
                fetchBanners();
            } else {
                toast.error(data.message || 'Lỗi khi xóa banner.');
            }
        } catch (err) {
            console.error(err);
            toast.error('Lỗi hệ thống khi xóa banner.');
        }
    };

    const handleToggle = async (id) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/v1/admin/banners/${id}/toggle`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                toast.success(data.message);
                fetchBanners();
            }
        } catch (err) {
            console.error(err);
            toast.error('Lỗi khi thay đổi trạng thái.');
        }
    };

    return (
        <section className="lg:col-span-12 bg-surface p-6 rounded-xl shadow-sm border border-surface-container transition-colors duration-300">
            <div className="flex items-center space-x-3 mb-6">
                <span className="p-2 bg-purple-50 rounded-lg">
                    <span className="material-symbols-outlined text-purple-600">image</span>
                </span>
                <h3 className="text-lg font-bold text-primary font-headline">Quản lý Banner</h3>
            </div>

            {/* Tabs chọn trang */}
            <div className="flex flex-wrap gap-2 mb-6 border-b border-surface-container pb-3">
                {PAGES.map(p => (
                    <button
                        key={p.key}
                        onClick={() => { setActivePage(p.key); resetForm(); }}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activePage === p.key
                            ? 'bg-primary text-white shadow-md'
                            : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                        }`}
                    >
                        {p.label}
                    </button>
                ))}
            </div>

            {/* Form thêm/sửa */}
            {isAdmin && (
                <form onSubmit={handleSubmit} className="bg-surface-container-low p-4 rounded-lg mb-6 space-y-4">
                    <h4 className="text-sm font-bold text-on-surface">
                        {editingId ? '✏️ Cập nhật banner' : '➕ Thêm banner mới'}
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-1">
                            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider pl-1 block mb-1">
                                Ảnh banner {editingId ? '(để trống nếu không đổi)' : '*'}
                            </label>
                            <div className="border-2 border-dashed border-surface-container rounded-lg p-2 bg-surface-container-lowest">
                                {(imagePreview || (editingId && banners.find(b => b.id === editingId)?.image_url)) && (
                                    <img
                                        src={imagePreview || getImageUrl(banners.find(b => b.id === editingId)?.image_url)}
                                        alt="Preview"
                                        className="w-full h-32 object-cover rounded mb-2"
                                    />
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="text-xs w-full"
                                />
                                <p className="text-[10px] text-on-surface-variant mt-1">JPG, PNG, WEBP. Tối đa 100MB.</p>
                            </div>
                        </div>

                        <div className="md:col-span-2 space-y-3">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider pl-1">Tiêu đề (không bắt buộc)</label>
                                <input
                                    type="text"
                                    className="w-full bg-surface-container-lowest border border-surface-container focus:border-primary rounded-lg px-4 py-2 text-sm outline-none"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="VD: Khuyến mãi mùa hè"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider pl-1">Link liên kết (không bắt buộc)</label>
                                <input
                                    type="text"
                                    className="w-full bg-surface-container-lowest border border-surface-container focus:border-primary rounded-lg px-4 py-2 text-sm outline-none"
                                    value={formData.link_url}
                                    onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                                    placeholder="/products hoặc https://..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider pl-1">Thứ tự</label>
                                    <input
                                        type="number"
                                        className="w-full bg-surface-container-lowest border border-surface-container focus:border-primary rounded-lg px-4 py-2 text-sm outline-none"
                                        value={formData.sort_order}
                                        onChange={(e) => setFormData({ ...formData, sort_order: Number(e.target.value) })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider pl-1">Trạng thái</label>
                                    <div onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                                        className={`w-full h-[38px] rounded-lg flex items-center px-3 cursor-pointer transition-all ${formData.is_active ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-600'}`}>
                                        <span className="text-xs font-bold">
                                            {formData.is_active ? '✓ Đang hiển thị' : '✗ Đã ẩn'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-container">
                        {editingId && (
                            <button type="button" onClick={resetForm}
                                className="px-4 py-2 text-xs font-bold text-on-surface-variant hover:bg-surface-container rounded-lg transition-all">
                                Hủy
                            </button>
                        )}
                        <button type="submit"
                            className="px-5 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:brightness-110 active:scale-95 transition-all flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">save</span>
                            {editingId ? 'Cập nhật' : 'Thêm banner'}
                        </button>
                    </div>
                </form>
            )}

            {/* Danh sách banner */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-on-surface">
                        Danh sách banner trang <span className="text-primary">{PAGES.find(p => p.key === activePage)?.label}</span>
                        {' '}({banners.length})
                    </h4>
                </div>

                {loading ? (
                    <div className="text-center py-8 text-on-surface-variant">
                        <span className="material-symbols-outlined animate-spin">refresh</span> Đang tải...
                    </div>
                ) : banners.length === 0 ? (
                    <div className="text-center py-8 bg-surface-container-low rounded-lg border border-dashed border-surface-container">
                        <span className="material-symbols-outlined text-4xl text-slate-400">image_not_supported</span>
                        <p className="text-xs text-on-surface-variant mt-2">Chưa có banner nào cho trang này.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {banners.map(b => (
                            <div key={b.id}
                                className={`bg-surface border rounded-lg overflow-hidden shadow-sm transition-all ${b.is_active ? 'border-surface-container' : 'border-outline-variant/30 opacity-60 grayscale'}`}>
                                <div className="aspect-video bg-slate-100 relative overflow-hidden">
                                    <img
                                        src={getImageUrl(b.image_url)}
                                        alt={b.title || 'Banner'}
                                        className="w-full h-full object-cover"
                                        onError={(e) => { e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLz4='; }}
                                    />
                                    {!b.is_active && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                            <span className="text-white font-bold text-xs">ĐÃ ẨN</span>
                                        </div>
                                    )}
                                    <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded">
                                        STT: {b.sort_order}
                                    </div>
                                </div>
                                <div className="p-3 space-y-2">
                                    {b.title && (
                                        <p className="text-xs font-bold text-on-surface truncate" title={b.title}>{b.title}</p>
                                    )}
                                    {b.link_url && (
                                        <p className="text-[10px] text-primary truncate" title={b.link_url}>
                                            🔗 {b.link_url}
                                        </p>
                                    )}
                                    {isAdmin && (
                                        <div className="flex items-center gap-1 pt-2 border-t border-surface-container">
                                            <button onClick={() => handleToggle(b.id)}
                                                title={b.is_active ? 'Tắt' : 'Bật'}
                                                className={`flex-1 py-1.5 rounded text-xs font-bold transition-all ${b.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}>
                                                {b.is_active ? 'Hiển thị' : 'Đã ẩn'}
                                            </button>
                                            <button onClick={() => handleEdit(b)}
                                                title="Sửa"
                                                className="px-2 py-1.5 bg-blue-100 text-blue-700 rounded text-xs font-bold hover:bg-blue-200">
                                                <span className="material-symbols-outlined text-sm">edit</span>
                                            </button>
                                            <button onClick={() => handleDelete(b.id)}
                                                title="Xóa"
                                                className="px-2 py-1.5 bg-red-100 text-red-700 rounded text-xs font-bold hover:bg-red-200">
                                                <span className="material-symbols-outlined text-sm">delete</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
};

export default BannerManager;