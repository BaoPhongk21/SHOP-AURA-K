import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Html5QrcodeScanner } from 'html5-qrcode';
import AdminLayout from './AdminLayout';
import { getImageUrl } from '../Register/api.config';
import { AuthContext } from '../../context/AuthContext';

import { API_BASE_URL } from '../../config/api.config';

const AdminInventory = () => {
  const { user } = useContext(AuthContext);
  const userRole = user?.role || 'customer';
  const isAdmin = userRole === 'admin';
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('stock'); // stock, inbound, history
  const [inboundList, setInboundList] = useState([]); // List of items being received
  const [products, setProducts] = useState([]);
  const [history, setHistory] = useState([]);
  const [categories, setCategories] = useState([]); // New state for categories
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalStock: 0, lowStockCount: 0, outOfStockCount: 0, totalValue: 0 });
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states for Update
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [updateValue, setUpdateValue] = useState(0);
  const [updateType, setUpdateType] = useState('add'); // IN, OUT, ADJUST
  const [reason, setReason] = useState('');

  // States for Location/Settings Update (now two-tiered)
  const [selectedZone, setSelectedZone] = useState('');
  const [isSettingModalOpen, setIsSettingModalOpen] = useState(false);
  const [newLocation, setNewLocation] = useState('');
  const [newMinStock, setNewMinStock] = useState(10);
  const [warehouseLocations, setWarehouseLocations] = useState([]);

  // States for Location CRUD
  const [isLocModalOpen, setIsLocModalOpen] = useState(false);
  const [editLoc, setEditLoc] = useState(null);
  const [locZone, setLocZone] = useState('');
  const [locShelf, setLocShelf] = useState('');
  const [locDesc, setLocDesc] = useState('');

  // Ref cho Import file
  const fileInputRef = useRef(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;


  // Scanner state
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const scannerRef = useRef(null);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/products`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setProducts(data.data.products);
        calculateStats(data.data.products);
      }
    } catch (error) {
      toast.error('Lỗi khi tải dữ liệu kho hàng');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/categories`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) setCategories(data.data);
    } catch (error) {
      console.error('Lỗi khi tải danh mục:', error);
    }
  };

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/inventory/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setHistory(data.data);
      }
    } catch (error) {
      console.error('Lỗi tải lịch sử:', error);
    }
  };

  const calculateStats = (productList) => {
    let totalStock = 0;
    let lowStock = 0;
    let outOfStock = 0;
    let value = 0;

    productList.forEach(p => {
      const stock = Number(p.total_stock) || 0;
      totalStock += stock;
      if (stock === 0) outOfStock++;
      // Check individual variants for low stock based on their min_stock_level
      const hasLowStockVariant = p.variants.some(v => v.quantity <= (v.min_stock_level || 10) && v.quantity > 0);
      if (hasLowStockVariant) lowStock++;
      value += stock * Number(p.price);
    });

    setStats({ totalStock, lowStockCount: lowStock, outOfStockCount: outOfStock, totalValue: value });
  };

  const fetchLocations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/inventory/locations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setWarehouseLocations(data.data);
      }
    } catch (error) {
      console.error('Lỗi tải danh sách vị trí:', error);
    }
  };

  const openAddLocModal = () => {
    setEditLoc(null); setLocZone(''); setLocShelf(''); setLocDesc(''); setIsLocModalOpen(true);
  };

  const openEditLocModal = (loc) => {
    setEditLoc(loc); setLocZone(loc.zone); setLocShelf(loc.shelf); setLocDesc(loc.description); setIsLocModalOpen(true);
  };

  const handleSaveLoc = async () => {
    if (!locZone || !locShelf) return toast.error('Vui lòng nhập Khu và Kệ');
    try {
      const token = localStorage.getItem('token');
      const method = editLoc ? 'PUT' : 'POST';
      const url = editLoc ? `${API_BASE_URL}/api/v1/admin/inventory/locations/${editLoc.id}` : `${API_BASE_URL}/api/v1/admin/inventory/locations`;
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ zone: locZone, shelf: locShelf, description: locDesc }) });
      const data = await res.json();
      if (data.success) { toast.success(data.message); setIsLocModalOpen(false); fetchLocations(); } else toast.error(data.message);
    } catch (e) { toast.error('Lỗi khi lưu vị trí'); }
  };

  const handleDeleteLoc = async (id) => {
    if (!window.confirm('Chắc chắn xóa vị trí lưu trữ này? Các sản phẩm trong vị trí này sẽ cần cập nhật lại vị trí.')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/inventory/locations/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) { toast.success(data.message); fetchLocations(); } else toast.error(data.message);
    } catch (e) { toast.error('Lỗi khi xóa vị trí'); }
  };

  useEffect(() => {
    fetchCategories(); // Fetch categories on mount
    fetchLocations();
    if (activeTab === 'stock') fetchInventory();
    if (activeTab === 'history') fetchHistory();
  }, [activeTab]);

  const handleUpdateStock = async () => {
    if (!selectedVariant) return;
    if (updateValue <= 0 && updateType !== 'set') {
      toast.error('Vui lòng nhập số lượng hợp lệ');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/inventory/stock`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          variant_id: selectedVariant.id,
          quantity: Number(updateValue),
          type: updateType,
          reason: reason || (updateType === 'add' ? 'Nhập kho bổ sung' : updateType === 'subtract' ? 'Xuất kho điều chỉnh' : 'Cân đối kho')
        })
      });

      const data = await response.json();
      if (data.success) {
        toast.success(data.message);
        setIsModalOpen(false);
        setReason('');
        fetchInventory();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('Lỗi khi cập nhật kho hàng');
    }
  };

  const handleUpdateLocation = async () => {
    if (!selectedVariant) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/inventory/variant/${selectedVariant.id}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          location: newLocation,
          min_stock_level: Number(newMinStock)
        })
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Cập nhật vị trí và định mức thành công!');
        setIsSettingModalOpen(false);
        fetchInventory();
      }
    } catch (error) {
      toast.error('Lỗi khi cập nhật vị trí');
    }
  };

  const addToInboundList = (product, variant) => {
    if (!product || !variant) return;
    const existing = inboundList.find(item => item.variant_id === variant.id);
    if (existing) {
      setInboundList(inboundList.map(item =>
        item.variant_id === variant.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setInboundList([...inboundList, {
        variant_id: variant.id,
        product_name: product.name,
        size_name: variant.size_name,
        color_name: variant.color_name,
        sku: variant.sku || product.sku,
        quantity: 1,
        current_stock: variant.quantity
      }]);
    }
    toast.success(`Đã thêm ${product.name} (${variant.size_name}) vào danh sách nhập`);
  };

  const handleProcessInbound = async () => {
    if (inboundList.length === 0) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/inventory/inbound`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ items: inboundList })
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Đã nhập kho thành công toàn bộ danh sách!');
        setInboundList([]);
        setActiveTab('stock');
        fetchInventory();
      }
    } catch (error) {
      toast.error('Lỗi khi xử lý nhập kho');
    } finally {
      setLoading(false);
    }
  };

  const openUpdateModal = (product, variant) => {
    setSelectedProduct(product);
    setSelectedVariant(variant);
    setUpdateValue(0);
    setUpdateType('add');
    setIsModalOpen(true);
  };

  const openSettingModal = (product, variant) => {
    setSelectedProduct(product);
    setSelectedVariant(variant);
    // Parse existing location into zone and shelf ("Khu A - A1" => zone="Khu A", shelf="A1")
    const [zonePart, shelfPart] = (variant.location || '').split(' - ');
    setSelectedZone(zonePart || '');
    setNewLocation(shelfPart || '');
    setNewMinStock(variant.min_stock_level || 10);
    setIsSettingModalOpen(true);
  };

  // Filter available shelves based on the selected zone (size)
  const availableShelvesForZone = warehouseLocations.filter(loc =>
    loc.zone === selectedZone
  );

  const handleUpdateSettings = async () => {
    if (!selectedVariant) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const locationString = selectedZone && newLocation
        ? `${selectedZone} - ${newLocation}`
        : (selectedZone || newLocation || '');
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/inventory/variant/${selectedVariant.id}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          location: locationString,
          min_stock_level: Number(newMinStock) || 0
        })
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Cập nhật cấu hình biến thể thành công!');
        setIsSettingModalOpen(false);
        fetchInventory(); // Reload data
      } else {
        toast.error(data.message || 'Lỗi khi cập nhật cấu hình');
      }
    } catch (error) {
      toast.error('Lỗi khi cập nhật cấu hình');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Lấy danh sách sản phẩm theo trang hiện tại
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const exportToCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += "SKU,Product Name,Size,Current Stock,Min Stock,Location,Price\n";

    products.forEach(p => {
      p.variants.forEach(v => {
        const sku = v.sku || `${p.sku || p.id}-${v.size_name}`;
        const name = `"${p.name}"`;
        const size = [v.size_name, v.color_name].filter(Boolean).join(' - ') || '';
        const stock = v.quantity || 0;
        const minStock = v.min_stock_level || 10;
        const loc = `"${v.location || ''}"`;
        const price = p.price || 0;

        csvContent += `${sku},${name},${size},${stock},${minStock},${loc},${price}\n`;
      });
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `inventory_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Xuất file kho thành công!");
  };

  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const lines = text.split('\\n');
      const inboundItems = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const row = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        if (row.length >= 4) {
          const sku = row[0].replace(/"/g, '').trim();
          const stockStr = row[3].replace(/"/g, '').trim();
          const quantity = parseInt(stockStr, 10);

          if (sku && !isNaN(quantity) && quantity > 0) {
            let foundVariant = null;
            let foundProduct = null;
            for (const p of products) {
              const variant = p.variants.find(v => (v.sku || `${p.sku || p.id}-${v.size_name}`) === sku);
              if (variant) {
                foundVariant = variant;
                foundProduct = p;
                break;
              }
            }

            if (foundVariant && foundProduct) {
              inboundItems.push({
                variant_id: foundVariant.id,
                product_name: foundProduct.name,
                size_name: foundVariant.size_name,
                color_name: foundVariant.color_name,
                sku: sku,
                quantity: quantity,
                current_stock: foundVariant.quantity
              });
            }
          }
        }
      }

      if (inboundItems.length > 0) {
        setInboundList(prev => {
          const newList = [...prev];
          inboundItems.forEach(item => {
            const existing = newList.find(x => x.variant_id === item.variant_id);
            if (existing) {
              existing.quantity += item.quantity;
            } else {
              newList.push(item);
            }
          });
          return newList;
        });
        setActiveTab('inbound');
        toast.success(`Đã thêm ${inboundItems.length} mã vào danh sách nhập từ file CSV.`);
      } else {
        toast.error("Không tìm thấy dữ liệu hợp lệ trong file CSV.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Xử lý khi quét mã thành công
  const onScanSuccess = (decodedText) => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(e => console.warn("Scanner clear failed", e));
    }
    setIsScannerOpen(false);
    toast.success(`Đã quét mã: ${decodedText}`);

    // Tìm sản phẩm hoặc biến thể khớp với mã quét
    let foundProduct = null;
    let foundVariant = null;

    for (const p of products) {
      if (p.sku === decodedText || String(p.id) === decodedText) {
        foundProduct = p;
        foundVariant = p.variants[0];
        break;
      }
      const variant = p.variants.find(v => v.sku === decodedText);
      if (variant) {
        foundProduct = p;
        foundVariant = variant;
        break;
      }
    }

    if (foundProduct && foundVariant) {
      openUpdateModal(foundProduct, foundVariant);
    } else {
      toast.error('Không tìm thấy sản phẩm với mã này trong kho!');
      setSearchQuery(decodedText);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa vĩnh viễn sản phẩm này khỏi hệ thống?')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        toast.success("Đã xóa sản phẩm thành công");
        fetchInventory();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Lỗi khi xóa sản phẩm');
    }
  };

  const startScanner = () => {
    setIsScannerOpen(true);
    // Timeout để đảm bảo DOM đã render xong div reader
    setTimeout(() => {
      const scanner = new Html5QrcodeScanner("reader", {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      });
      scanner.render(onScanSuccess, (err) => {
        // Lỗi quét (khi chưa thấy mã) - không cần toast
      });
      scannerRef.current = scanner;
    }, 300);
  };

  const closeScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear();
    }
    setIsScannerOpen(false);
  };

  return (
    <AdminLayout title="Hệ thống Quản lý Kho (WMS)">
      <div className="p-5 max-w-7xl mx-auto space-y-6">

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl w-fit border border-slate-200">
          <button
            onClick={() => setActiveTab('stock')}
            className={`px-6 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'stock' ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:bg-white/50'}`}
          >
            <span className="material-symbols-outlined text-base">inventory_2</span> Tồn kho thực tế
          </button>
          <button
            onClick={() => setActiveTab('inbound')}
            className={`px-6 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'inbound' ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:bg-white/50'}`}
          >
            <span className="material-symbols-outlined text-base">add_business</span> Nhập kho (Inbound)
            {inboundList.length > 0 && <span className="bg-red-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-[8px]">{inboundList.length}</span>}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'history' ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:bg-white/50'}`}
          >
            <span className="material-symbols-outlined text-base">history</span> Lịch sử biến động
          </button>
          <button
            onClick={() => setActiveTab('locations')}
            className={`px-6 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'locations' ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:bg-white/50'}`}
          >
            <span className="material-symbols-outlined text-base">domain</span> Quản lý Khu vực
          </button>
        </div>

        {activeTab === 'stock' ? (
          <>
            {/* WMS Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Tổng tồn kho</span>
                <span className="text-2xl font-black text-blue-900 font-headline">{stats.totalStock.toLocaleString()} cái</span>
                <div className="flex items-center gap-1 text-emerald-600 text-[10px] mt-1 font-bold">
                  <span className="material-symbols-outlined text-xs">check_circle</span>
                  <span>Đã kiểm kê</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center border-l-4 border-l-amber-500">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Dưới định mức an toàn</span>
                <span className="text-2xl font-black text-amber-600 font-headline">{stats.lowStockCount} mã hàng</span>
                <div className="flex items-center gap-1 text-amber-600 text-[10px] mt-1 font-bold">
                  <span className="material-symbols-outlined text-xs">report_problem</span>
                  <span>Cần nhập thêm hàng</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center border-l-4 border-l-red-500">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Cháy hàng (Out of stock)</span>
                <span className="text-2xl font-black text-red-600 font-headline">{stats.outOfStockCount} sản phẩm</span>
                <div className="flex items-center gap-1 text-red-600 text-[10px] mt-1 font-bold">
                  <span className="material-symbols-outlined text-xs">error</span>
                  <span>Đã hết hàng thực tế</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Giá trị luân chuyển</span>
                <span className="text-2xl font-black text-emerald-600 font-headline">{stats.totalValue.toLocaleString('vi-VN')}đ</span>
                <div className="flex items-center gap-1 text-emerald-600 text-[10px] mt-1 font-bold">
                  <span className="material-symbols-outlined text-xs">account_balance_wallet</span>
                  <span>Vốn tồn kho</span>
                </div>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400">search</span>
                <input
                  type="text"
                  placeholder="Tìm theo SKU, tên sản phẩm hoặc vị trí..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-primary"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button onClick={fetchInventory} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all text-xs font-bold text-slate-600 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">sync</span> Làm mới
              </button>

              {/* Import/Export buttons */}
              {isAdmin && (
                <button onClick={() => fileInputRef.current.click()} className="px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl transition-all text-xs font-bold flex items-center gap-2 border border-emerald-200">
                  <span className="material-symbols-outlined text-sm">upload_file</span> Nhập từ file Excel
                </button>
              )}
              <input type="file" accept=".csv" ref={fileInputRef} onChange={handleImportCSV} className="hidden" />
              <button onClick={exportToCSV} className="px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl transition-all text-xs font-bold flex items-center gap-2 border border-emerald-200">
                <span className="material-symbols-outlined text-sm">download</span> Tải file mẫu CSV
              </button>

              <button onClick={() => navigate('/admin/products')} className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-xl transition-all text-xs font-bold flex items-center gap-2 border border-blue-700">
                <span className="material-symbols-outlined text-sm">inventory_2</span> Quản lý Sản phẩm
              </button>

              {isAdmin && (
                <button onClick={startScanner} className="px-4 py-2 bg-primary text-white rounded-xl hover:brightness-110 transition-all text-xs font-bold flex items-center gap-2 shadow-sm shadow-blue-900/20">
                  <span className="material-symbols-outlined text-sm">qr_code_scanner</span> Quét mã vạch (Nhập/Xuất)
                </button>
              )}
            </div>

            {/* Inbound/Outbound Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-4 py-3 text-[9px] font-bold text-slate-500 uppercase tracking-widest">Thông tin hàng hóa</th>
                      <th className="px-4 py-3 text-[9px] font-bold text-slate-500 uppercase tracking-widest text-center">Vị trí (Kệ)</th>
                      <th className="px-4 py-3 text-[9px] font-bold text-slate-500 uppercase tracking-widest text-center">Tồn kho / Định mức</th>
                      <th className="px-4 py-3 text-[9px] font-bold text-slate-500 uppercase tracking-widest text-center">Trạng thái</th>
                      <th className="px-4 py-3 text-[9px] font-bold text-slate-500 uppercase tracking-widest text-center">Xử lý kho</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {loading ? (
                      <tr><td colSpan="5" className="text-center py-8 text-slate-400 text-xs italic">Đang tải dữ liệu WMS...</td></tr>
                    ) : currentProducts.length > 0 ? currentProducts.map(product => (
                      <tr key={product.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                              <img src={getImageUrl(product.image_url)} alt="" className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-blue-900">{product.name}</p>
                              <p className="text-[9px] font-mono text-slate-500 uppercase font-bold">{product.sku || `SKU-${product.id}`}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-col gap-1 items-center">
                            {product.variants.map((v, idx) => (
                              <span key={idx} className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[9px] font-bold border border-blue-100">
                                {[v.size_name, v.color_name].filter(Boolean).join(' - ') || 'Phân loại'}: {v.location || 'Chưa gán'}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-2 items-center">
                            {product.variants.map((v, idx) => (
                              <div key={idx} className="flex items-center gap-3 w-full max-w-[120px]">
                                <span className="text-[10px] font-bold text-slate-600 min-w-[30px] whitespace-nowrap overflow-hidden text-ellipsis">{[v.size_name, v.color_name].filter(Boolean).join(' - ') || 'Loại'}:</span>
                                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${v.quantity <= v.min_stock_level ? 'bg-amber-500' : 'bg-primary'}`}
                                    style={{ width: `${Math.min(100, (v.quantity / (v.min_stock_level * 2)) * 100)}%` }}
                                  ></div>
                                </div>
                                <span className={`text-[10px] font-black ${v.quantity <= v.min_stock_level ? 'text-amber-600' : 'text-blue-900'}`}>
                                  {v.quantity}/{v.min_stock_level}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${product.total_stock === 0 ? 'bg-red-50 text-red-600' :
                            product.variants.some(v => v.quantity <= v.min_stock_level) ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                            }`}>
                            {product.total_stock === 0 ? 'Hết hàng' : product.variants.some(v => v.quantity <= v.min_stock_level) ? 'Cần nhập' : 'Ổn định'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                        <div className="flex gap-1 justify-end flex-wrap max-w-[120px]">
                          {isAdmin && (
                            <button onClick={() => openUpdateModal(product, product.variants[0])} className="p-1.5 bg-slate-50 hover:bg-primary hover:text-white rounded-lg transition-all text-slate-400" title="Nhập/Xuất kho nhanh">
                              <span className="material-symbols-outlined text-sm">swap_vert</span>
                            </button>
                          )}
                          {isAdmin && (
                            <button onClick={() => openSettingModal(product, product.variants[0])} className="p-1.5 bg-slate-50 hover:bg-amber-600 hover:text-white rounded-lg transition-all text-slate-400" title="Phân loại & Vị trí">
                              <span className="material-symbols-outlined text-sm">settings</span>
                            </button>
                          )}
                          <button onClick={() => navigate('/admin/products')} className="p-1.5 bg-slate-50 hover:bg-blue-600 hover:text-white rounded-lg transition-all text-slate-400" title="Chỉnh sửa sản phẩm">
                            <span className="material-symbols-outlined text-sm">edit</span>
                          </button>
                          {isAdmin && (
                            <button onClick={() => handleDeleteProduct(product.id)} className="p-1.5 bg-slate-50 hover:bg-red-600 hover:text-white rounded-lg transition-all text-slate-400" title="Xóa sản phẩm">
                              <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                          )}
                          {isAdmin && (
                            <button onClick={() => addToInboundList(product, product.variants[0])} className="p-1.5 bg-slate-50 hover:bg-emerald-600 hover:text-white rounded-lg transition-all text-slate-400" title="Thêm vào danh sách nhập">
                              <span className="material-symbols-outlined text-sm">add_shopping_cart</span>
                            </button>
                          )}
                        </div>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan="5" className="text-center py-10 text-slate-400 text-xs">Không có sản phẩm nào phù hợp.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination & Legend */}
            <div className="flex flex-col md:flex-row justify-between items-center mt-4 gap-4">
              {/* Legend */}
              <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 flex gap-6 text-[10px]">
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-blue-900 uppercase">Tầng 1: Khu vực (Theo Size)</span>
                  <span className="text-slate-600"><strong className="text-blue-700">Khu A:</strong> Size S</span>
                  <span className="text-slate-600"><strong className="text-blue-700">Khu B:</strong> Size M</span>
                  <span className="text-slate-600"><strong className="text-blue-700">Khu C:</strong> Size L</span>
                </div>
                <div className="flex flex-col gap-1 mt-[14px]">
                  <span className="text-slate-600"><strong className="text-blue-700">Khu D:</strong> Size XL</span>
                  <span className="text-slate-600"><strong className="text-blue-700">Khu F:</strong> Free Size, XXL+</span>
                </div>
                <div className="flex flex-col gap-1 border-l border-blue-200 pl-6">
                  <span className="font-bold text-blue-900 uppercase">Tầng 2: Kệ/Ngăn (Theo Danh mục)</span>
                  <span className="text-slate-600"><strong className="text-blue-700">Số 1:</strong> Áo thun & Polo</span>
                  <span className="text-slate-600"><strong className="text-blue-700">Số 2:</strong> Quần dài</span>
                  <span className="text-slate-600"><strong className="text-blue-700">Số 3:</strong> Phụ kiện</span>
                </div>
                <div className="flex flex-col gap-1 mt-[14px]">
                  <span className="text-slate-600"><strong className="text-blue-700">Số 4:</strong> Áo khoác & Hoodie</span>
                  <span className="text-slate-600"><strong className="text-blue-700">Số 5:</strong> Váy & Đầm</span>
                  <span className="text-slate-600"><strong className="text-blue-700">Số 6:</strong> Đồ thể thao</span>
                </div>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl shadow-sm border border-slate-100">
                  <button
                    onClick={() => paginate(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-primary disabled:opacity-50 transition-all"
                  >
                    <span className="material-symbols-outlined text-sm">chevron_left</span>
                  </button>
                  {Array.from({ length: totalPages }).map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => paginate(idx + 1)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${currentPage === idx + 1 ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-slate-500 hover:bg-slate-50 hover:text-primary'}`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => paginate(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-primary disabled:opacity-50 transition-all"
                  >
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                  </button>
                </div>
              )}
            </div>
          </>
        ) : activeTab === 'inbound' ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-blue-900 font-headline">Phiếu nhập kho (Inbound Process)</h3>
                <p className="text-xs text-slate-500">Quét hoặc chọn sản phẩm để tạo danh sách nhập kho hàng loạt.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Product Selection */}
              <div className="lg:col-span-1 space-y-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Tìm kiếm & Thêm nhanh</label>
                  <div className="relative mb-4">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400">search</span>
                    <input
                      type="text"
                      placeholder="Nhập SKU hoặc tên..."
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-primary"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {filteredProducts.slice(0, 10).map(p => (
                      <div key={p.id} className="p-2 border border-slate-50 rounded-xl hover:bg-slate-50 flex items-center justify-between group cursor-pointer" onClick={() => addToInboundList(p, p.variants[0])}>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-slate-100 rounded border border-slate-200 overflow-hidden">
                            <img src={getImageUrl(p.image_url)} className="w-full h-full object-cover" alt="" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-blue-900 line-clamp-1">{p.name}</p>
                            <p className="text-[9px] text-slate-400">{p.sku}</p>
                          </div>
                        </div>
                        <div className="w-6 h-6 rounded bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                          <span className="material-symbols-outlined text-sm">add</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Inbound List Table */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-3 text-[9px] font-bold text-slate-500 uppercase">Hàng hóa</th>
                        <th className="px-4 py-3 text-[9px] font-bold text-slate-500 uppercase text-center">Tồn hiện tại</th>
                        <th className="px-4 py-3 text-[9px] font-bold text-slate-500 uppercase text-center">Số lượng nhập</th>
                        <th className="px-4 py-3 text-[9px] font-bold text-slate-500 uppercase text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {inboundList.length > 0 ? inboundList.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/30">
                          <td className="px-4 py-3">
                            <p className="text-[11px] font-bold text-blue-900">{item.product_name}</p>
                            <p className="text-[10px] text-slate-500">Phân loại: {[item.size_name, item.color_name].filter(Boolean).join(' - ')} | SKU: {item.sku}</p>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-xs font-bold text-slate-400">{item.current_stock} cái</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={(e) => { e.stopPropagation(); setInboundList(inboundList.map((it, i) => i === idx ? { ...it, quantity: Math.max(1, it.quantity - 1) } : it)) }} className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">-</button>
                              <input
                                type="number"
                                className="w-12 text-center bg-transparent border-b border-slate-200 text-xs font-black outline-none"
                                value={item.quantity}
                                onChange={(e) => setInboundList(inboundList.map((it, i) => i === idx ? { ...it, quantity: Number(e.target.value) } : it))}
                              />
                              <button onClick={(e) => { e.stopPropagation(); setInboundList(inboundList.map((it, i) => i === idx ? { ...it, quantity: it.quantity + 1 } : it)) }} className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">+</button>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => setInboundList(inboundList.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 transition-colors">
                              <span className="material-symbols-outlined text-lg">delete</span>
                            </button>
                          </td>
                        </tr>
                      )) : (
                        <tr><td colSpan="4" className="text-center py-20 text-slate-400 text-xs italic">Chưa có sản phẩm nào trong phiếu nhập.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            {isAdmin && (
                <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border">
                  <div className="text-sm">
                    <span className="text-slate-500">Tổng mã SP: </span><strong className="text-primary">{inboundList.length}</strong>
                    <span className="text-slate-500 ml-4">Tổng SL nhập: </span><strong className="text-emerald-600">{inboundList.reduce((acc, it) => acc + parseInt(it.quantity || 0), 0)}</strong>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setInboundList([])} className="px-5 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-200">Xóa trắng</button>
                    <button
                      onClick={handleProcessInbound}
                      disabled={inboundList.length === 0 || loading}
                      className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-xl text-sm shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center gap-2"
                    >
                      Xác nhận Nhập kho
                    </button>
                  </div>
                </div>
              )}
          </div>
        ) : activeTab === 'locations' ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-blue-900 font-headline">Cơ sở dữ liệu Vị trí kho</h3>
                <p className="text-xs text-slate-500 mt-1">Thêm, sửa, xóa các Khu vực (Kệ/Ngăn) để chuẩn hóa quá trình nhập xuất.</p>
              </div>
              {isAdmin && (
                <button onClick={openAddLocModal} className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm shadow-blue-900/20 hover:brightness-110">
                  <span className="material-symbols-outlined text-sm">add</span> Thêm Khu Vực
                </button>
              )}
            </div>

            {/* Quy tắc xếp kho */}
            <div className="mb-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
              <h4 className="text-xs font-bold text-amber-800 uppercase tracking-widest mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">rule</span> Quy tắc phân chia Kệ/Ngăn (2 Tầng)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-amber-900">
                <div>
                  <p className="font-bold mb-1">Tầng 1: Khu vực</p>
                  <ul className="list-disc pl-4 space-y-0.5 opacity-80">
                    <li><strong className="font-bold">Khu A:</strong> Dành cho Size S</li>
                    <li><strong className="font-bold">Khu B:</strong> Dành cho Size M</li>
                    <li><strong className="font-bold">Khu C:</strong> Dành cho Size L</li>
                    <li><strong className="font-bold">Khu D:</strong> Dành cho Size XL</li>
                    <li><strong className="font-bold">Khu F:</strong> Dành cho Size XXL, Free Size...</li>
                  </ul>
                </div>
                <div>
                  <p className="font-bold mb-1">Tầng 2: Ngăn</p>
                  <ul className="list-disc pl-4 space-y-0.5 opacity-80">
                    <li><strong className="font-bold">Ngăn 1:</strong> Áo thun & Polo</li>
                    <li><strong className="font-bold">Ngăn 2:</strong> Quần dài</li>
                    <li><strong className="font-bold">Ngăn 3:</strong> Phụ kiện</li>
                    <li><strong className="font-bold">Ngăn 4:</strong> Áo khoác & Hoodie</li>
                    <li><strong className="font-bold">Ngăn 5:</strong> Váy & Đầm</li>
                    <li><strong className="font-bold">Ngăn 6:</strong> Đồ thể thao</li>
                  </ul>
                </div>
              </div>
              <p className="text-[10px] mt-3 font-medium opacity-70 italic text-amber-800">
                Ví dụ: "Áo thun Size S" sẽ ở vị trí Khu A - A1. "Phụ kiện Free Size" sẽ nằm ở Khu F - F3.
              </p>
            </div>

            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Mã Khu vực</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Số Kệ/Ngăn</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Mô tả chi tiết</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {warehouseLocations.length > 0 ? warehouseLocations.map(loc => (
                    <tr key={loc.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-bold text-blue-900">{loc.zone}</td>
                      <td className="px-4 py-3 font-mono text-slate-600 font-bold">{loc.shelf}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{loc.description}</td>
                      <td className="px-4 py-3 text-right">
                      {isAdmin && (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => openEditLocModal(loc)} className="p-1.5 text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 rounded-lg transition-colors"><span className="material-symbols-outlined text-sm">edit</span></button>
                          <button onClick={() => handleDeleteLoc(loc.id)} className="p-1.5 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 rounded-lg transition-colors"><span className="material-symbols-outlined text-sm">delete</span></button>
                        </div>
                      )}
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="4" className="text-center py-8 text-slate-400 text-xs">Chưa có dữ liệu vị trí.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="text-sm font-bold text-blue-900">Lịch sử giao dịch kho 7 ngày qua</h3>
              <button onClick={fetchHistory} className="text-xs text-primary font-bold hover:underline">Làm mới lịch sử</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-4 py-3 text-[9px] font-bold text-slate-500 uppercase tracking-widest">Thời gian</th>
                    <th className="px-4 py-3 text-[9px] font-bold text-slate-500 uppercase tracking-widest">Hành động</th>
                    <th className="px-4 py-3 text-[9px] font-bold text-slate-500 uppercase tracking-widest">Sản phẩm / SKU</th>
                    <th className="px-4 py-3 text-[9px] font-bold text-slate-500 uppercase tracking-widest text-center">Số lượng</th>
                    <th className="px-4 py-3 text-[9px] font-bold text-slate-500 uppercase tracking-widest">Người thực hiện / Lý do</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {history.length > 0 ? history.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-[10px] font-bold text-slate-700">{new Date(item.created_at).toLocaleDateString('vi-VN')}</p>
                        <p className="text-[9px] text-slate-400">{new Date(item.created_at).toLocaleTimeString('vi-VN')}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${item.type === 'IN' ? 'bg-emerald-50 text-emerald-600' :
                          item.type === 'OUT' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                          }`}>
                          {item.type === 'IN' ? 'Nhập kho' : item.type === 'OUT' ? 'Xuất kho' : 'Điều chỉnh'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-bold text-blue-900">{item.product_name} ({[item.size_name, item.color_name].filter(Boolean).join(' - ')})</p>
                        <p className="text-[9px] font-mono text-slate-400">{item.sku}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-black ${item.type === 'IN' ? 'text-emerald-600' : item.type === 'OUT' ? 'text-red-600' : 'text-blue-900'}`}>
                          {item.type === 'IN' ? '+' : item.type === 'OUT' ? '-' : ''}{item.quantity}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[10px] font-bold text-slate-600">{item.performed_by}</p>
                        <p className="text-[10px] text-slate-400 line-clamp-1 italic">{item.reason}</p>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="5" className="text-center py-10 text-slate-400 text-xs italic">Chưa có lịch sử giao dịch nào.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modern Update Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-primary p-6 text-white flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold font-headline">Nghiệp vụ kho bãi (WMS)</h3>
                <p className="text-[10px] opacity-80 uppercase font-bold tracking-widest mt-0.5">Sản phẩm: {selectedProduct?.name}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/20 p-1.5 rounded-full transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Chọn phân loại</label>
                  <select
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
                    value={selectedVariant?.id}
                    onChange={(e) => {
                      const v = selectedProduct.variants.find(v => v.id == e.target.value);
                      setSelectedVariant(v);
                      setUpdateValue(v.quantity);
                    }}
                  >
                    {selectedProduct?.variants.map((v, idx) => (
                      <option key={idx} value={v.id}>{[v.size_name, v.color_name].filter(Boolean).join(' - ')} (Tồn: {v.quantity} | Kệ: {v.location})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Loại giao dịch</label>
                  <div className="flex p-1 bg-slate-100 rounded-xl gap-1">
                    <button onClick={() => setUpdateType('add')} className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${updateType === 'add' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500'}`}>Nhập</button>
                    <button onClick={() => setUpdateType('subtract')} className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${updateType === 'subtract' ? 'bg-white shadow-sm text-red-600' : 'text-slate-500'}`}>Xuất</button>
                    <button onClick={() => setUpdateType('set')} className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${updateType === 'set' ? 'bg-white shadow-sm text-primary' : 'text-slate-500'}`}>Cân bằng</button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Số lượng biến động</label>
                  <input
                    type="number"
                    value={updateValue}
                    onChange={(e) => setUpdateValue(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-blue-900 outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Ghi chú / Lý do</label>
                  <input
                    type="text"
                    placeholder="Nhập lý do nhập/xuất..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                  />
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex gap-3">
                <span className="material-symbols-outlined text-blue-600">info</span>
                <p className="text-[10px] text-blue-700 leading-relaxed">
                  <strong>Lưu ý:</strong> Mọi thao tác nhập/xuất kho sẽ được ghi lại vào hệ thống lịch sử để kiểm tra định kỳ. Hãy đảm bảo bạn đã đối chiếu số lượng thực tế tại kệ <strong>{selectedVariant?.location}</strong>.
                </p>
              </div>

              <button
                onClick={handleUpdateStock}
                className="w-full py-3 bg-primary hover:bg-blue-800 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-900/20 active:scale-[0.98] transition-all"
              >
                Xác nhận Giao dịch Kho
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scanner Modal */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-white/20">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold font-headline">Quét mã vạch / QR</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Đưa mã vào khung hình để kiểm tra kho</p>
              </div>
              <button onClick={closeScanner} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-4 bg-slate-50">
              <div id="reader" className="overflow-hidden rounded-2xl border-4 border-white shadow-inner bg-black min-h-[300px]"></div>
              <div className="mt-6 flex items-center gap-4 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-blue-600/30">
                  <span className="material-symbols-outlined text-xl">tips_and_updates</span>
                </div>
                <p className="text-[11px] text-blue-700 leading-relaxed font-medium">
                  Hệ thống tự động nhận diện <strong>SKU</strong> hoặc <strong>Mã vạch</strong> sản phẩm để truy xuất thông tin tồn kho ngay lập tức.
                </p>
              </div>
            </div>
            <div className="p-6 bg-white border-t border-slate-100 text-center">
              <button onClick={closeScanner} className="px-8 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-200 transition-all">Hủy bỏ</button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-slate-800 p-4 text-white flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold font-headline">Cấu hình biến thể</h3>
                <p className="text-[10px] opacity-80 uppercase tracking-widest mt-0.5">{selectedProduct?.name} ({selectedVariant?.size_name})</p>
              </div>
              <button onClick={() => setIsSettingModalOpen(false)} className="hover:bg-white/20 p-1.5 rounded-full transition-colors">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Khu vực (theo Size)</label>
                <select
                  value={selectedZone}
                  onChange={(e) => setSelectedZone(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-slate-400"
                >
                  <option value="">-- Chọn Khu vực --</option>
                  {/* Dynamically generate zones based on sizeToZoneMap or available warehouseLocations */}
                  {Array.from(new Set(warehouseLocations.map(loc => loc.zone))).map(zone => (
                    <option key={zone} value={zone}>{zone} (Size {zone === 'Khu A' ? 'S' : zone === 'Khu B' ? 'M' : zone === 'Khu C' ? 'L' : zone === 'Khu D' ? 'XL' : zone === 'Khu F' ? 'Free Size' : 'Khác'})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Kệ/Ngăn (theo Danh mục)</label>
                <select
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-slate-400"
                  disabled={!selectedZone}
                >
                  <option value="">-- Chọn Kệ/Ngăn --</option>
                  {/* Filter shelves based on selectedZone and map to categories */}
                  {availableShelvesForZone.map(loc => (
                    <option key={loc.id} value={loc.shelf}>
                      {loc.description} ({loc.zone}-{loc.shelf})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Định mức an toàn (Cảnh báo)</label>
                <input
                  type="number"
                  value={newMinStock}
                  onChange={(e) => setNewMinStock(e.target.value)}
                  min="0"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-slate-400"
                />
                <p className="text-[9px] text-slate-400 mt-1 italic">Hệ thống báo màu cam nếu tồn kho dưới mức này.</p>
              </div>

              <button
                onClick={handleUpdateSettings}
                disabled={loading}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white rounded-lg font-bold text-xs shadow-md active:scale-[0.98] transition-all mt-2"
              >
                {loading ? 'Đang lưu...' : 'Lưu cấu hình'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Location CRUD Modal */}
      {isLocModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-slate-800 p-4 text-white flex justify-between items-center">
              <h3 className="text-sm font-bold font-headline">{editLoc ? 'Cập nhật Vị trí' : 'Thêm Vị trí lưu trữ'}</h3>
              <button onClick={() => setIsLocModalOpen(false)} className="hover:bg-white/20 p-1.5 rounded-full transition-colors">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Khu (VD: A)</label>
                  <input type="text" value={locZone} onChange={(e) => setLocZone(e.target.value.toUpperCase())} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-slate-400" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Kệ (VD: A1)</label>
                  <input type="text" value={locShelf} onChange={(e) => setLocShelf(e.target.value.toUpperCase())} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-slate-400" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Mô tả hiển thị</label>
                <input type="text" value={locDesc} onChange={(e) => setLocDesc(e.target.value)} placeholder="VD: Kệ này chuyên đựng các loại áo thun Nam" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-slate-400" />
              </div>
              <button onClick={handleSaveLoc} className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-xs shadow-md active:scale-[0.98] transition-all mt-2">
                {editLoc ? 'Lưu cập nhật' : 'Thêm mới'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminInventory;
