import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import AdminLayout from './AdminLayout';
import OrderTable from './OrderTable';
import { AuthContext } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/api.config';
import { getImageUrl } from '../Register/api.config';
import {
  StatCard, Card, PageHeader, Modal, Badge, OrderStatusPill, Loading
} from '../../components/UI/Card';

const AdminDashboard = () => {
  const [stats, setStats] = useState({ totalRevenue: 0, totalOrders: 0, newCustomers: 0, totalProducts: 0, totalCustomers: 0 });
  const [recentOrders, setRecentOrders] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [timeRange, setTimeRange] = useState('week');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);

  useEffect(() => {
    let mounted = true;
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL || ''}/api/v1/admin/dashboard?timeRange=${timeRange}&date=${selectedDate}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!mounted) return;
        if (data && data.success && data.data) {
          const incomingStats = data.data.stats || {};
          setStats({
            totalRevenue: incomingStats.totalRevenue || 0,
            totalOrders: incomingStats.totalOrders || 0,
            newCustomers: incomingStats.newCustomers || 0,
            totalProducts: incomingStats.totalProducts || 0,
            totalCustomers: incomingStats.totalCustomers || incomingStats.newCustomers || 0,
          });
          setRecentOrders(data.data.recentOrders || []);
          const rawChart = data.data.chart || data.data.chartData || [];
          setChartData(rawChart.map((d) => ({ ...d, revenue: Number(d.revenue || 0) })));
          setTopProducts(data.data.topProducts || []);
        }
      } catch (err) {
        console.error('Fetch dashboard error', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchDashboardData();
    return () => { mounted = false; };
  }, [timeRange, selectedDate]);

  const openModal = async (order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
    if (!order.items || order.items.length === 0) {
      setIsLoadingDetail(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL || ''}/api/v1/orders/${order.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data && data.success && data.data) {
          setSelectedOrder((prev) => ({ ...prev, items: data.data.items || [] }));
        }
      } catch (err) {
        console.error('Fetch order detail error', err);
      } finally {
        setIsLoadingDetail(false);
      }
    }
  };

  const quickActions = [
    { label: 'Sản phẩm', sub: 'Quản lý & Kho', icon: 'inventory_2', path: '/admin/products', gradient: 'from-blue-500 to-blue-700' },
    { label: 'Đơn hàng', sub: 'Xử lý & Giao vận', icon: 'receipt_long', path: '/admin/orders', gradient: 'from-emerald-500 to-emerald-700' },
    { label: 'Mã giảm giá', sub: 'Chiến dịch', icon: 'local_offer', path: '/admin/vouchers', gradient: 'from-amber-500 to-orange-600' },
    { label: 'Khách hàng', sub: 'Tài khoản', icon: 'groups', path: '/admin/customers', gradient: 'from-purple-500 to-purple-700' },
  ];

  const headerCenterContent = (
    <div className="hidden md:flex max-w-md w-full relative group">
      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm group-focus-within:text-blue-600 transition-colors">
        search
      </span>
      <input
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full bg-slate-100 border border-transparent rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none text-slate-900 transition-all"
        placeholder="Tìm kiếm mã đơn, tên, email..."
        type="text"
      />
    </div>
  );

  const getDisplayDateText = () => {
    if (!selectedDate) return '';
    return new Date(selectedDate).toLocaleDateString('vi-VN', {
      weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  // Total customers (using totalCustomers from stats if exists, fallback to newCustomers)
  const totalCustomers = stats.totalCustomers || stats.newCustomers || 0;

  return (
    <AdminLayout title="Tổng quan hệ thống" headerCenterContent={headerCenterContent}>
      <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto">
        <PageHeader
          icon="dashboard"
          title="Tổng quan hệ thống"
          subtitle="Theo dõi hoạt động kinh doanh theo thời gian thực"
          actions={
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-blue-600 border border-blue-200 rounded-xl font-bold text-sm hover:bg-blue-50 transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-base">open_in_new</span>
              Về trang chủ
            </button>
          }
        />

        {/* Quick Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {quickActions.map((qa, idx) => (
            <div
              key={idx}
              onClick={() => navigate(qa.path)}
              className="group bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-blue-300 transition-all duration-300 cursor-pointer flex items-center gap-4 relative overflow-hidden"
            >
              <div className={`p-3 rounded-xl bg-gradient-to-br ${qa.gradient} text-white shadow-lg shrink-0`}>
                <span className="material-symbols-outlined text-2xl">{qa.icon}</span>
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-slate-900">{qa.label}</h4>
                <p className="text-xs text-slate-500 font-medium">{qa.sub}</p>
              </div>
              <span className="material-symbols-outlined absolute right-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all">
                arrow_forward
              </span>
            </div>
          ))}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Doanh thu"
            value={`${Number(stats.totalRevenue || 0).toLocaleString('vi-VN')}đ`}
            icon="payments"
            color="emerald"
            subtitle={`${getDisplayDateText()}`}
            trend="12%"
            trendUp={true}
            loading={loading}
          />
          <StatCard
            title="Đơn hàng"
            value={Number(stats.totalOrders || 0).toLocaleString('vi-VN')}
            icon="receipt_long"
            color="blue"
            subtitle="Tổng số đơn"
            trend="8%"
            trendUp={true}
            loading={loading}
          />
          <StatCard
            title="Khách hàng"
            value={Number(totalCustomers).toLocaleString('vi-VN')}
            icon="groups"
            color="purple"
            subtitle={`+${stats.newCustomers || 0} mới`}
            trend="5%"
            trendUp={true}
            loading={loading}
          />
          <StatCard
            title="Sản phẩm"
            value={Number(stats.totalProducts || 0).toLocaleString('vi-VN')}
            icon="inventory"
            color="amber"
            subtitle="Tổng SKU"
            loading={loading}
          />
        </div>

        {/* Chart & Top Products */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 bg-white p-6 shadow-sm border border-slate-200/80 rounded-2xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-3">
              <div>
                <h5 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600">monitoring</span>
                  Biểu đồ doanh thu
                </h5>
                <p className="text-xs text-slate-500 mt-1">{getDisplayDateText()}</p>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-medium"
                />
                {[
                  { id: 'day', label: 'Ngày' },
                  { id: 'week', label: '7 Ngày' },
                  { id: 'month', label: 'Tháng' },
                ].map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setTimeRange(r.id)}
                    className={`px-3 py-2 text-xs rounded-lg font-bold transition-all ${
                      timeRange === r.id
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="w-full h-72">
              {loading ? (
                <Loading text="Đang tải biểu đồ..." />
              ) : chartData && chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={290}>
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#64748b' }}
                      tickFormatter={(v) => (v >= 1000000 ? `${v / 1000000}Tr` : v > 0 ? `${v / 1000}k` : '0')}
                    />
                    <Tooltip
                      formatter={(value) => [`${Number(value).toLocaleString('vi-VN')}đ`, 'Doanh thu']}
                      contentStyle={{
                        borderRadius: 12,
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                        padding: 12,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      fill="url(#colorRevenue)"
                      dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 6, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                  <span className="material-symbols-outlined text-5xl opacity-30">show_chart</span>
                  <p className="text-sm font-medium">Không có dữ liệu</p>
                </div>
              )}
            </div>
          </div>

          <Card padding={false}>
            <div className="p-5 border-b border-slate-100">
              <div className="flex justify-between items-center">
                <div>
                  <h5 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-600">emoji_events</span>
                    Bán chạy nhất
                  </h5>
                  <p className="text-xs text-slate-500 mt-1">Top sản phẩm nổi bật</p>
                </div>
                <Link to="/admin/products" className="text-xs font-bold text-blue-600 hover:text-blue-700">
                  Xem tất cả →
                </Link>
              </div>
            </div>
            <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
              {loading ? (
                <Loading size="sm" />
              ) : topProducts.length > 0 ? (
                topProducts.slice(0, 5).map((p, i) => {
                  const max = topProducts[0]?.total_sold || 1;
                  const pct = Math.round(((p.total_sold || 0) / max) * 100);
                  const gradientColors = [
                    'from-amber-400 to-orange-500',
                    'from-slate-400 to-slate-500',
                    'from-orange-300 to-amber-400',
                    'from-blue-300 to-cyan-400',
                    'from-purple-300 to-pink-400',
                  ];
                  return (
                    <div
                      key={p.id || i}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group"
                    >
                      <div className="relative shrink-0">
                        <span className={`absolute -top-1 -left-1 w-5 h-5 bg-gradient-to-br ${gradientColors[i] || gradientColors[0]} text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-sm`}>
                          {i + 1}
                        </span>
                        <div className="w-11 h-11 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200 overflow-hidden">
                          {p.image_url ? (
                            <img
                              alt={p.name}
                              className="w-full h-full object-cover"
                              src={getImageUrl(p.image_url)}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <span
                            className="material-symbols-outlined text-slate-400"
                            style={{ display: p.image_url ? 'none' : 'flex' }}
                          >
                            inventory_2
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{p.name}</p>
                        <p className="text-xs text-slate-500">{p.total_sold || 0} đã bán</p>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-sm font-bold text-slate-700 shrink-0">
                        {Number(p.price || 0).toLocaleString('vi-VN')}đ
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <span className="material-symbols-outlined text-4xl mb-2 opacity-30">bar_chart</span>
                  <p className="text-sm font-medium">Chưa có dữ liệu</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Order Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
            <h5 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-600">receipt_long</span>
              Đơn hàng gần đây
            </h5>
            <Link to="/admin/orders" className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              Xem tất cả
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>
          <OrderTable
            orders={recentOrders}
            loading={loading}
            onOrderClick={openModal}
            searchQuery={searchQuery}
          />
        </div>
      </div>

      {/* Order Modal */}
      {isModalOpen && selectedOrder && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={`Đơn hàng ${selectedOrder.order_code || selectedOrder.code}`}
          subtitle="Chi tiết đơn hàng"
          size="md"
          icon="receipt_long"
          iconBg="from-blue-500 to-indigo-600"
          footer={
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-5 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
            >
              Đóng
            </button>
          }
        >
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-xs text-slate-500 uppercase font-bold mb-1">Khách hàng</p>
                <p className="font-bold text-slate-900">{selectedOrder.customerName || selectedOrder.customer_name}</p>
                <p className="text-sm text-slate-600">{selectedOrder.email || selectedOrder.customer_email}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl text-right">
                <p className="text-xs text-slate-500 uppercase font-bold mb-1">Ngày đặt</p>
                <p className="font-bold text-slate-900">
                  {selectedOrder.date || (selectedOrder.created_at
                    ? new Date(selectedOrder.created_at).toLocaleDateString('vi-VN')
                    : 'N/A')}
                </p>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-bold mb-3">Sản phẩm</p>
              {isLoadingDetail ? (
                <Loading text="Đang tải sản phẩm..." size="sm" />
              ) : selectedOrder.items && selectedOrder.items.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                  {selectedOrder.items.map((it, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50">
                      <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200 shrink-0 overflow-hidden">
                        {(it.image_url || it.imageUrl) ? (
                          <img
                            src={getImageUrl(it.image_url || it.imageUrl)}
                            alt={it.name || it.product_name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <span
                          className="material-symbols-outlined text-slate-400"
                          style={{ display: (it.image_url || it.imageUrl) ? 'none' : 'flex' }}
                        >
                          inventory_2
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-slate-900 truncate">{it.name || it.product_name}</p>
                        <p className="text-xs text-slate-500">
                          {it.quantity} × {Number(it.unit_price || it.price || 0).toLocaleString('vi-VN')}đ
                        </p>
                      </div>
                      <div className="font-bold text-sm text-slate-900">
                        {(Number(it.unit_price || it.price || 0) * Number(it.quantity || 1)).toLocaleString('vi-VN')}đ
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-4">Không có thông tin sản phẩm</p>
              )}
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100 flex justify-between items-center">
              <span className="font-bold text-slate-700">Tổng thanh toán</span>
              <span className="font-black text-2xl text-blue-700">
                {selectedOrder.total || `${Number(selectedOrder.total_amount || 0).toLocaleString('vi-VN')}đ`}
              </span>
            </div>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
};

export default AdminDashboard;
