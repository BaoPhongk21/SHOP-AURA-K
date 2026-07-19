import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import AdminLayout from './AdminLayout';
import { API_BASE_URL } from '../../config/api.config';
import { getImageUrl } from '../Register/api.config';

const AdminAnalytics = () => {
    // State cho Analytics
    const [stats, setStats] = useState({ totalRevenue: 0, totalOrders: 0, newCustomers: 0, totalProducts: 0 });
    const [chartData, setChartData] = useState([]);
    const [topProducts, setTopProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('month'); // Mặc định xem theo tháng
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // Thêm state lưu ngày chọn
    const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    // Tính toán AOV (Giá trị trung bình đơn hàng)
    const aov = (stats?.totalOrders || 0) > 0 ? Math.round((stats?.totalRevenue || 0) / (stats?.totalOrders || 1)) : 0;

    // Tính trung bình doanh thu của các mốc thời gian để làm mốc đổi màu
    const avgRevenue = chartData.length > 0 ? chartData.reduce((sum, d) => sum + (d.revenue || 0), 0) / chartData.length : 0;

    // Chức năng Xuất báo cáo (Tải file CSV)
    const handleExportReport = () => {
        if (!chartData || chartData.length === 0) {
            toast.error('Không có dữ liệu để xuất!');
            return;
        }

        const headers = ['Thời gian', 'Doanh thu (VNĐ)', 'Lợi nhuận (VNĐ)'];
        const csvData = chartData.map(d => {
            const profit = d.profit || d.revenue * 0.35;
            return `"${d.name}","${d.revenue}","${profit}"`;
        });

        const csvString = [headers.join(','), ...csvData].join('\n');
        const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `bao_cao_doanh_thu_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success('Đã tải xuống báo cáo thành công!');
    };

    useEffect(() => {
        const fetchAnalytics = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                const params = new URLSearchParams({
                    timeRange,
                    date: selectedDate,
                    startDate,
                    endDate
                });
                const response = await fetch(`${API_BASE_URL}/api/v1/admin/dashboard?${params.toString()}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                if (data.success && data.data) {
                    setStats(data.data.stats || { totalRevenue: 0, totalOrders: 0, newCustomers: 0, totalProducts: 0 });

                    const formattedChartData = (data.data.chartData || []).map(d => {
                        const rev = Number(d.revenue) || 0;
                        return { ...d, name: d.name || d.date || 'N/A', revenue: rev, profit: d.profit ? Number(d.profit) : Math.round(rev * 0.30) };
                    });
                    setChartData(formattedChartData);
                    setTopProducts(data.data.topProducts || []);
                }
            } catch (error) {
                console.error('Lỗi khi lấy dữ liệu analytics:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, [timeRange, selectedDate, startDate, endDate]);

    // Khối Component riêng cho ô Lọc ngày tháng trên Header của Analytics
    const setPresetRange = (rangeType) => {
        const today = new Date();
        const endDateStr = today.toISOString().split('T')[0];

        let startDateStr = endDateStr;
        if (rangeType === 'week') {
            const start = new Date(today);
            start.setDate(today.getDate() - 6);
            startDateStr = start.toISOString().split('T')[0];
        } else if (rangeType === 'month') {
            const start = new Date(today);
            start.setDate(today.getDate() - 29);
            startDateStr = start.toISOString().split('T')[0];
        }

        setStartDate(startDateStr);
        setEndDate(endDateStr);
        setTimeRange(rangeType);
        setSelectedDate(endDateStr);
    };

    const headerCenterContent = (
        <div className="hidden md:flex items-center bg-slate-100 border border-slate-200 rounded-full p-0.5 ml-auto shadow-inner">
            <button onClick={() => setPresetRange('day')} className={`px-3 py-1 text-[11px] font-bold rounded-full transition-all ${timeRange === 'day' ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-primary'}`}>Hôm nay</button>
            <button onClick={() => setPresetRange('week')} className={`px-3 py-1 text-[11px] font-bold rounded-full transition-all ${timeRange === 'week' ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-primary'}`}>7 ngày qua</button>
            <button onClick={() => setPresetRange('month')} className={`px-3 py-1 text-[11px] font-bold rounded-full transition-all ${timeRange === 'month' ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-primary'}`}>30 ngày qua</button>
            <div className="relative flex items-center border-l border-slate-300 ml-1 pl-1 gap-1">
                <span className="text-[10px] text-slate-400 font-bold ml-1">Tùy chọn:</span>
                <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                        setStartDate(e.target.value);
                        if (endDate && e.target.value > endDate) setEndDate(e.target.value);
                        setTimeRange('custom');
                    }}
                    className="px-1 py-1 text-[11px] font-bold text-slate-500 hover:text-primary rounded-lg hover:bg-slate-200 transition-all outline-none bg-transparent cursor-pointer"
                />
                <span className="text-slate-400">-</span>
                <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                        setEndDate(e.target.value);
                        if (startDate && e.target.value < startDate) setStartDate(e.target.value);
                        setTimeRange('custom');
                    }}
                    className="px-1 py-1 text-[11px] font-bold text-slate-500 hover:text-primary rounded-lg hover:bg-slate-200 transition-all outline-none bg-transparent cursor-pointer"
                />
            </div>
        </div>
    );

    return (
        <AdminLayout title="Phân tích & Báo cáo" headerCenterContent={headerCenterContent}>
            <div className="p-5 space-y-6 max-w-[1600px] mx-auto">
                {/* Quick Stats Grid */}
                <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Stat Card 1 */}
                    <div className="bg-surface-container-lowest p-5 rounded-xl transition-all hover:translate-y-[-4px] shadow-sm border border-surface-container">
                        <div className="flex justify-between items-start mb-3">
                            <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                                <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>payments</span>
                            </div>
                            <span className="text-[9px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                <span className="material-symbols-outlined text-[10px]">trending_up</span> 12%
                            </span>
                        </div>
                        <p className="text-[10px] font-semibold text-outline mb-0.5">Doanh thu</p>
                        <h3 className="text-xl font-extrabold text-on-surface font-headline">{loading ? '...' : `${Number(stats?.totalRevenue || 0).toLocaleString('vi-VN')}đ`}</h3>
                        <div className="mt-3 h-1 w-full bg-surface-container rounded-full overflow-hidden">
                            <div className="h-full bg-primary w-[75%]"></div>
                        </div>
                    </div>
                    {/* Stat Card 2 */}
                    <div className="bg-surface-container-lowest p-5 rounded-xl transition-all hover:translate-y-[-4px] shadow-sm border border-surface-container">
                        <div className="flex justify-between items-start mb-3">
                            <div className="p-1.5 bg-tertiary-fixed text-on-tertiary-fixed-variant rounded-lg">
                                <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance_wallet</span>
                            </div>
                            <span className="text-[9px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                <span className="material-symbols-outlined text-[10px]">trending_up</span> 8%
                            </span>
                        </div>
                        <p className="text-[10px] font-semibold text-outline mb-0.5">Lợi nhuận (30%)</p>
                        <h3 className="text-xl font-extrabold text-on-surface font-headline">{loading ? '...' : `${Number((stats?.totalRevenue || 0) * 0.30).toLocaleString('vi-VN')}đ`}</h3>
                        <div className="mt-3 h-1 w-full bg-surface-container rounded-full overflow-hidden">
                            <div className="h-full bg-tertiary-fixed-dim w-[60%]"></div>
                        </div>
                    </div>
                    {/* Stat Card 3 */}
                    <div className="bg-surface-container-lowest p-5 rounded-xl transition-all hover:translate-y-[-4px] shadow-sm border border-surface-container">
                        <div className="flex justify-between items-start mb-3">
                            <div className="p-1.5 bg-secondary-container text-on-secondary-container rounded-lg">
                                <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>shopping_cart</span>
                            </div>
                            <span className="text-[9px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                <span className="material-symbols-outlined text-[10px]">trending_up</span> 15%
                            </span>
                        </div>
                        <p className="text-[10px] font-semibold text-outline mb-0.5">Đơn hàng</p>
                        <h3 className="text-xl font-extrabold text-on-surface font-headline">{loading ? '...' : Number(stats?.totalOrders || 0).toLocaleString('vi-VN')}</h3>
                        <div className="mt-3 h-1 w-full bg-surface-container rounded-full overflow-hidden">
                            <div className="h-full bg-secondary w-[85%]"></div>
                        </div>
                    </div>
                    {/* Stat Card 4 */}
                    <div className="bg-surface-container-lowest p-5 rounded-xl transition-all hover:translate-y-[-4px] shadow-sm border border-surface-container">
                        <div className="flex justify-between items-start mb-3">
                            <div className="p-1.5 bg-outline-variant/30 text-on-surface rounded-lg">
                                <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>person_add</span>
                            </div>
                            <span className="text-[9px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                <span className="material-symbols-outlined text-[10px]">trending_up</span> 5%
                            </span>
                        </div>
                        <p className="text-[10px] font-semibold text-outline mb-0.5">Khách hàng mới</p>
                        <h3 className="text-xl font-extrabold text-on-surface font-headline">{loading ? '...' : Number(stats?.newCustomers || 0).toLocaleString('vi-VN')}</h3>
                        <div className="mt-3 h-1 w-full bg-surface-container rounded-full overflow-hidden">
                            <div className="h-full bg-on-surface-variant w-[45%]"></div>
                        </div>
                    </div>
                </section>

                {/* Main Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Large Line Chart Container */}
                    <section className="lg:col-span-2 bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-surface-container">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-base font-bold font-headline">Biểu đồ Doanh thu & Lợi nhuận</h3>
                                <p className="text-[10px] text-outline">Dữ liệu phân tích dựa trên khoảng thời gian được chọn</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-primary"></span>
                                    <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter">Doanh thu</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-tertiary-fixed-dim"></span>
                                    <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter">Lợi nhuận</span>
                                </div>
                            </div>
                        </div>
                        {/* Recharts Chart */}
                        <div className="relative h-[350px] w-full mt-4">
                            {loading ? (
                                <div className="flex items-center justify-center h-full w-full text-slate-500 font-medium">Đang tải biểu đồ...</div>
                            ) : chartData && chartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={350}>
                                    <ComposedChart
                                        data={chartData}
                                        margin={{ top: 20, right: 10, left: 10, bottom: 10 }}
                                    >
                                        <defs>
                                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#003178" stopOpacity={0.9} />
                                                <stop offset="95%" stopColor="#003178" stopOpacity={0.3} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e1e3e4" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#737783', fontWeight: 500 }} dy={15} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#737783', fontWeight: 500 }} tickFormatter={(value) => value >= 1000000 ? `${(value / 1000000)}M` : value > 0 ? `${value / 1000}k` : '0'} dx={-10} />
                                        <Tooltip
                                            cursor={{ fill: '#f3f4f5', opacity: 0.6 }}
                                            formatter={(value, name) => [
                                                `${Number(value).toLocaleString('vi-VN')}đ`,
                                                name === 'revenue' ? 'Doanh thu' : 'Lợi nhuận'
                                            ]}
                                            contentStyle={{ borderRadius: '12px', border: '1px solid #e1e3e4', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                                            labelStyle={{ fontWeight: 'bold', color: '#191c1d', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid #edeeef' }}
                                        />
                                        <Bar dataKey="revenue" name="revenue" radius={[6, 6, 0, 0]} barSize={36} isAnimationActive={true} animationDuration={1000}>
                                            {chartData.map((entry, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={entry.revenue >= avgRevenue ? "url(#colorRevenue)" : "#93c5fd"}
                                                />
                                            ))}
                                        </Bar>
                                        <Line type="monotone" dataKey="profit" name="profit" stroke="#ffb596" strokeWidth={4} dot={{ r: 5, fill: '#ffffff', strokeWidth: 3, stroke: '#ffb596' }} activeDot={{ r: 8, fill: '#ffb596', stroke: '#ffffff' }} isAnimationActive={true} animationDuration={1500} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full w-full text-slate-500 font-medium">Không có dữ liệu phân tích</div>
                            )}
                        </div>
                    </section>

                    {/* Behavior Metrics */}
                    <section className="space-y-6">
                        <div className="bg-primary text-white rounded-2xl p-5 relative overflow-hidden">
                            <div className="relative z-10">
                                <p className="text-xs font-medium opacity-80 mb-0.5">Tỷ lệ chuyển đổi (CR)</p>
                                <h3 className="text-3xl font-black font-headline">3.85%</h3>
                                <p className="text-[9px] mt-3 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">arrow_upward</span>
                                    +0.4% so với tháng trước
                                </p>
                            </div>
                            <div className="absolute right-[-15px] bottom-[-15px] opacity-20 transform rotate-12">
                                <span className="material-symbols-outlined text-[100px]">ads_click</span>
                            </div>
                        </div>
                        <div className="bg-surface-container-highest rounded-2xl p-5">
                            <p className="text-xs font-medium text-on-surface-variant mb-0.5">Giá trị đơn hàng TB (AOV)</p>
                            <h3 className="text-2xl font-black font-headline text-primary">{loading ? '...' : `${aov.toLocaleString('vi-VN')} đ`}</h3>
                            <div className="mt-4 flex items-center justify-between">
                                <div className="flex -space-x-2">
                                    <div className="w-6 h-6 rounded-full bg-surface border-2 border-white"></div>
                                    <div className="w-6 h-6 rounded-full bg-surface-dim border-2 border-white"></div>
                                    <div className="w-6 h-6 rounded-full bg-outline-variant border-2 border-white"></div>
                                </div>
                                <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Dựa trên {stats?.totalOrders || 0} đơn</span>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Bottom Row: Products & Customers */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Top Products Analysis */}
                    <section className="bg-surface-container-lowest rounded-2xl p-6 border border-surface-container shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-base font-bold font-headline">Top 5 sản phẩm bán chạy</h3>
                            <Link to="/admin/products" className="text-[10px] font-bold text-primary flex items-center gap-1 hover:underline">
                                Xem tất cả
                                <span className="material-symbols-outlined text-xs">chevron_right</span>
                            </Link>
                        </div>
                         <div className="space-y-5">
                            {loading ? (
                                <div className="space-y-3">
                                    {[1,2,3,4,5].map(i => (
                                        <div key={i} className="flex items-center gap-4 animate-pulse">
                                            <div className="w-12 h-12 rounded-lg bg-slate-200 flex-shrink-0"></div>
                                            <div className="flex-1 space-y-2">
                                                <div className="h-3 bg-slate-200 rounded w-3/4"></div>
                                                <div className="h-2 bg-slate-200 rounded w-1/2"></div>
                                            </div>
                                            <div className="w-16 space-y-2">
                                                <div className="h-3 bg-slate-200 rounded"></div>
                                                <div className="h-2 bg-slate-200 rounded"></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : topProducts.length > 0 ? (
                                topProducts.slice(0, 5).map((prod, idx) => (
                                    <div key={prod.id || idx} className="flex items-center gap-4 group hover:bg-slate-50 p-2 rounded-xl transition-colors">
                                        <div className="relative flex-shrink-0">
                                            <span className="absolute -top-1 -left-1 w-5 h-5 bg-primary text-white text-[9px] font-black rounded-full flex items-center justify-center z-10">#{idx + 1}</span>
                                            <div className="w-12 h-12 rounded-lg bg-surface-container overflow-hidden border border-slate-100 shadow-sm">
                                                {prod.image_url ? (
                                                    <img
                                                        alt={prod.name}
                                                        className="w-full h-full object-cover"
                                                        src={getImageUrl(prod.image_url)}
                                                        onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }}
                                                    />
                                                ) : null}
                                                <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center" style={{display: prod.image_url ? 'none' : 'flex'}}>
                                                    <span className="material-symbols-outlined text-slate-400 text-lg">inventory_2</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-bold text-on-surface line-clamp-1">{prod.name}</h4>
                                            <p className="text-[10px] text-outline">SKU-{String(prod.id).padStart(4,'0')}</p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-sm font-bold text-primary">{prod.total_sold} đơn</p>
                                            <p className="text-[10px] font-semibold text-outline">{Number((prod.total_sold || 0) * (prod.price || 0)).toLocaleString('vi-VN')}đ</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center py-8 text-on-surface-variant gap-2">
                                    <span className="material-symbols-outlined text-4xl opacity-40">bar_chart</span>
                                    <p className="text-sm">Chưa có dữ liệu trong khoảng thời gian này</p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Customer Analysis */}
                    <section className="bg-surface-container-lowest rounded-2xl p-6 border border-surface-container shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-base font-bold font-headline">Phân tích khách hàng</h3>
                            <div className="p-1.5 bg-surface rounded-full">
                                <span className="material-symbols-outlined text-xs text-outline">more_vert</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-8 items-center">
                            <div className="relative flex justify-center items-center">
                                {/* Donut Chart Mockup */}
                                <svg className="w-32 h-32 transform -rotate-90">
                                    <circle className="text-primary-fixed" cx="64" cy="64" fill="transparent" r="54" stroke="currentColor" strokeWidth="20"></circle>
                                    <circle className="text-primary" cx="64" cy="64" fill="transparent" r="54" stroke="currentColor" strokeDasharray="339" strokeDashoffset="100" strokeWidth="20"></circle>
                                </svg>
                                <div className="absolute text-center">
                                    <p className="text-xs font-bold text-on-surface">70%</p>
                                    <p className="text-[8px] text-outline uppercase">Mới</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-primary"></span> Khách hàng mới
                                    </span>
                                    <span className="text-xs font-black">70%</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-primary-fixed"></span> Khách hàng cũ
                                    </span>
                                    <span className="text-xs font-black">30%</span>
                                </div>
                                <div className="pt-4 border-t border-outline-variant/10">
                                    <p className="text-[10px] font-bold text-outline uppercase tracking-wider mb-3">Phân bổ địa lý</p>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-[11px] font-medium">
                                            <span>TP. Hồ Chí Minh</span>
                                            <span className="font-bold">45%</span>
                                        </div>
                                        <div className="w-full bg-surface h-1 rounded-full">
                                            <div className="bg-primary w-[45%] h-full rounded-full"></div>
                                        </div>
                                        <div className="flex items-center justify-between text-[11px] font-medium">
                                            <span>Hà Nội</span>
                                            <span className="font-bold">32%</span>
                                        </div>
                                        <div className="w-full bg-surface h-1 rounded-full">
                                            <div className="bg-primary w-[32%] h-full rounded-full"></div>
                                        </div>
                                        <div className="flex items-center justify-between text-[11px] font-medium">
                                            <span>Đà Nẵng</span>
                                            <span className="font-bold">12%</span>
                                        </div>
                                        <div className="w-full bg-surface h-1 rounded-full">
                                            <div className="bg-primary w-[12%] h-full rounded-full"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Geographic Visual Block */}
                <section className="bg-surface-container-low rounded-2xl p-8 overflow-hidden relative min-h-[400px]">
                    <div className="relative z-10 max-w-sm">
                        <h3 className="text-xl font-bold font-headline mb-2 text-primary">Thị trường trọng điểm</h3>
                        <p className="text-sm text-on-surface-variant leading-relaxed">Phân tích mật độ đơn hàng và xu hướng tiêu dùng theo từng khu vực địa lý tại Việt Nam trong quý II.</p>
                        <div className="mt-8 grid grid-cols-2 gap-4">
                            <div className="bg-white/60 backdrop-blur p-4 rounded-xl">
                                <h4 className="text-[10px] font-bold uppercase text-outline">Khu vực Bắc</h4>
                                <p className="text-lg font-black text-on-surface">324.5M</p>
                            </div>
                            <div className="bg-white/60 backdrop-blur p-4 rounded-xl">
                                <h4 className="text-[10px] font-bold uppercase text-outline">Khu vực Nam</h4>
                                <p className="text-lg font-black text-on-surface">512.8M</p>
                            </div>
                        </div>
                    </div>
                    {/* Simulated Map/Geo Image */}
                    <div className="absolute inset-0 z-0 opacity-30 pointer-events-none">
                        <img alt="Bản đồ phân bổ" className="w-full h-full object-cover" src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1920&q=80" />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-surface-container-low via-surface-container-low/90 to-transparent pointer-events-none"></div>
                </section>
            </div>

            {/* FAB for quick action (Export) */}
            <button onClick={handleExportReport} title="Xuất dữ liệu biểu đồ" className="fixed bottom-8 right-8 bg-primary text-white p-4 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-transform flex items-center justify-center z-50">
                <span className="material-symbols-outlined">download</span>
            </button>
        </AdminLayout>
    );
};

export default AdminAnalytics;