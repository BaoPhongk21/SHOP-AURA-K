import React, { useState } from 'react';
import { EmptyState, Pagination } from '../../components/UI/Card';
import { OrderStatusPill, PaymentStatusPill } from '../../components/UI/StatCard';

const OrderTable = ({
  orders = [],
  loading = false,
  onOrderClick = () => {},
  searchQuery = '',
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Lọc đơn hàng dựa trên tìm kiếm
  const filteredOrders = orders.filter((order) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (order.order_code && order.order_code.toLowerCase().includes(query)) ||
      (order.code && order.code.toLowerCase().includes(query)) ||
      (order.customer_name && order.customer_name.toLowerCase().includes(query)) ||
      (order.customerName && order.customerName.toLowerCase().includes(query)) ||
      (order.customer_email && order.customer_email.toLowerCase().includes(query)) ||
      (order.email && order.email.toLowerCase().includes(query))
    );
  });

  // Tính toán phân trang
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50/80 border-b border-slate-100">
            <tr>
              <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Mã đơn hàng</th>
              <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Khách hàng</th>
              <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Thời gian</th>
              <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Tổng tiền</th>
              <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Thanh toán</th>
              <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan="6" className="px-5 py-12 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <span className="material-symbols-outlined animate-spin text-3xl text-blue-600">progress_activity</span>
                    <p className="text-slate-500 text-sm font-medium">Đang tải dữ liệu...</p>
                  </div>
                </td>
              </tr>
            ) : paginatedOrders.length > 0 ? (
              paginatedOrders.map((order, idx) => (
                <tr
                  key={order.id || idx}
                  onClick={() => onOrderClick(order)}
                  className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                >
                  {/* Mã đơn hàng */}
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-bold text-blue-700 bg-blue-50 border border-blue-100 group-hover:bg-blue-100 transition-colors">
                      <span className="material-symbols-outlined text-sm">receipt</span>
                      {order.order_code || order.code || `#ORD-${order.id}`}
                    </span>
                  </td>

                  {/* Khách hàng */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-sm shrink-0">
                        {(order.customer_name || order.customerName || 'C').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">
                          {order.customer_name || order.customerName || 'N/A'}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {order.customer_email || order.email || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Thời gian */}
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-semibold text-slate-800">
                      {order.date || (order.created_at
                        ? new Date(order.created_at).toLocaleDateString('vi-VN')
                        : 'N/A')}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {order.time || (order.created_at
                        ? new Date(order.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                        : '')}
                    </p>
                  </td>

                  {/* Tổng tiền */}
                  <td className="px-5 py-3.5 text-right">
                    <p className="text-sm font-extrabold text-slate-900">
                      {Number(order.total_amount || order.total || 0).toLocaleString('vi-VN')}đ
                    </p>
                  </td>

                  {/* Thanh toán */}
                  <td className="px-5 py-3.5">
                    <PaymentStatusPill status={order.paymentStatus || order.payment_status} />
                  </td>

                  {/* Trạng thái */}
                  <td className="px-5 py-3.5">
                    <OrderStatusPill status={order.status || order.raw_status} />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="px-5 py-12">
                  <EmptyState
                    icon="inbox"
                    title={searchQuery ? `Không tìm thấy đơn hàng phù hợp` : 'Chưa có đơn hàng nào'}
                    description={searchQuery ? `Không có kết quả cho "${searchQuery}"` : 'Các đơn hàng mới sẽ xuất hiện ở đây.'}
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
        totalItems={filteredOrders.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};

export default OrderTable;