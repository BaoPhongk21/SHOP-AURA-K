import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import AdminLayout from './AdminLayout';

import { API_BASE_URL } from '../../config/api.config';

const AdminHelp = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFaq, setActiveFaq] = useState(null);
  const navigate = useNavigate();
  const hasNotifiedOffline = useRef(false);

  // State lưu trữ trạng thái kết nối
  const [systemStatus, setSystemStatus] = useState({
    api: 'Đang kiểm tra...',
    db: 'Đang kiểm tra...',
    isOnline: false
  });

  // Hàm tự động kiểm tra trạng thái Server
  useEffect(() => {
    window.scrollTo(0, 0);
    const checkStatus = async () => {
      try {
        await fetch(`${API_BASE_URL}/api/v1/admin/settings`, { method: 'GET' });

        setSystemStatus({ api: 'Hoạt động', db: 'Đã kết nối', isOnline: true });

        // Phục hồi lại kết nối sau khi sập -> Báo thành công và reset cờ
        if (hasNotifiedOffline.current) {
          toast.success('Hệ thống đã kết nối trực tuyến trở lại!', { duration: 4000 });
          hasNotifiedOffline.current = false;
        }
      } catch (error) {
        // Nếu fetch ném ra lỗi (Failed to fetch) nghĩa là Server đã tắt hoặc mất mạng
        setSystemStatus({ api: 'Ngoại tuyến', db: 'Mất kết nối', isOnline: false });

        // Chỉ bắn Toast cảnh báo 1 lần duy nhất, tránh việc 15 giây báo spam 1 lần
        if (!hasNotifiedOffline.current) {
          toast.error('CẢNH BÁO: Mất kết nối đến máy chủ API hoặc CSDL!', { duration: 6000, icon: '🚨' });
          hasNotifiedOffline.current = true;
        }
      }
    };

    // Kiểm tra ngay khi vào trang
    checkStatus();

    // Đặt lịch kiểm tra định kỳ mỗi 15 giây để cập nhật trạng thái tự động
    const intervalId = setInterval(checkStatus, 15000);
    return () => clearInterval(intervalId);
  }, []);

  const faqs = [
    {
      id: 1,
      question: 'Làm thế nào để xuất báo cáo doanh thu?',
      answer: 'Truy cập mục "Analytics" (Phân tích & Báo cáo), chọn khoảng thời gian bạn muốn (Ngày/Tuần/Tháng) ở góc trên, sau đó nhấn nút "Xuất báo cáo" (biểu tượng tải xuống) ở góc trên bên phải hoặc góc phải dưới cùng trang. File tải về sẽ có định dạng CSV.'
    },
    {
      id: 2,
      question: 'Tại sao tôi không thể xóa một người dùng?',
      answer: 'Hệ thống có cơ chế bảo vệ: Bạn không thể tự xóa tài khoản của chính mình hoặc tài khoản của một Quản trị viên (Admin) khác. Ngoài ra, việc xóa khách hàng có thể bị giới hạn nếu khách hàng đó đang có đơn hàng chưa hoàn tất.'
    },
    {
      id: 3,
      question: 'Cách tạo mã giảm giá giới hạn cho sự kiện?',
      answer: 'Vào mục "Vouchers" -> "Tạo mã giảm giá mới". Nhập Mã Code, chọn Loại giảm giá (Cố định/Phần trăm). Điều quan trọng là bạn cần thiết lập "Lượt sử dụng tối đa" và "Ngày hết hạn" để kiểm soát số lượng áp dụng cho sự kiện đó.'
    },
    {
      id: 4,
      question: 'Làm sao để thay đổi Logo và Banner của trang web?',
      answer: 'Bạn chỉ cần truy cập "Cài đặt" -> kéo xuống phần "Giao diện". Tại đây bạn có thể Tải lên trực tiếp từ máy tính hoặc dán đường dẫn (URL) của hình ảnh Logo/Banner mới. Đừng quên nhấn "Lưu thay đổi" nhé.'
    },
    {
      id: 5,
      question: 'Tôi phải làm gì khi khách hàng báo lỗi không thể thanh toán VNPay?',
      answer: 'Trước tiên hãy vào "Cài đặt" kiểm tra xem Phương thức thanh toán VNPay có đang bị "Tắt" hoặc "Bảo trì" hay không. Nếu trạng thái bình thường nhưng vẫn lỗi, có thể do key cấu hình VNPay bị sai hoặc hết hạn, vui lòng liên hệ Bộ phận Kỹ thuật.'
    }
  ];

  const toggleFaq = (id) => {
    setActiveFaq(activeFaq === id ? null : id);
  };

  const headerCenterContent = (
    <div className="max-w-md w-full relative group">
      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-hover:text-primary/70 group-focus-within:text-primary transition-colors duration-300 text-sm">search</span>
      <input
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full bg-surface-container-highest text-on-surface border-none rounded-lg pl-10 pr-4 py-2 text-sm hover:shadow-[0_0_15px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_0_15px_rgba(255,255,255,0.08)] hover:ring-1 hover:ring-primary/30 focus:ring-2 focus:ring-primary/20 transition-all duration-300 outline-none placeholder:text-on-surface-variant"
        placeholder="Tìm kiếm tài liệu, câu hỏi..."
        type="text"
      />
    </div>
  );

  return (
    <AdminLayout title="Trợ giúp & Hỗ trợ" headerCenterContent={headerCenterContent}>
      <div className="p-8 max-w-6xl mx-auto space-y-8 animate-fade-in-up">

        {/* Hero Section */}
        <div className="bg-gradient-to-r from-primary to-blue-800 rounded-3xl p-10 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <h2 className="text-3xl font-extrabold font-headline mb-3">Xin chào, chúng tôi có thể giúp gì cho bạn?</h2>
            <p className="text-blue-100 text-sm mb-8 leading-relaxed">Trung tâm trợ giúp cung cấp các tài liệu hướng dẫn sử dụng, giải quyết sự cố và kết nối với đội ngũ phát triển kỹ thuật của Aura K.</p>
            <div className="flex gap-3">
              <button
                onClick={() => window.location.href = 'mailto:dev.support@aurak.com?subject=Yêu cầu hỗ trợ IT - Aura K Admin'}
                className="bg-surface text-primary px-6 py-2.5 rounded-xl font-bold text-sm shadow-md hover:bg-surface-container-low transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-base">chat</span>
                Liên hệ IT Support
              </button>
              <button
                onClick={() => toast('Tài liệu API đang trong quá trình hoàn thiện!', { icon: '📚' })}
                className="bg-blue-700/50 hover:bg-blue-700/70 border border-blue-400/30 backdrop-blur-sm text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-base">menu_book</span>
                Tài liệu API
              </button>
              <button
                onClick={() => navigate('/')}
                className="bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-sm text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-base">open_in_new</span>
                Quay về Website
              </button>
            </div>
          </div>
          <div className="absolute -right-10 -bottom-10 opacity-20 transform rotate-12">
            <span className="material-symbols-outlined text-[200px]" style={{ fontVariationSettings: "'FILL' 1" }}>support_agent</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Quick Guides */}
          <div className="lg:col-span-8 space-y-8">
            <div>
              <h3 className="text-xl font-bold text-on-surface font-headline mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">auto_stories</span>
                Hướng dẫn theo phân hệ
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6">
                <div
                  onClick={() => navigate('/admin/products')}
                  className="bg-surface p-6 rounded-2xl border border-surface-container shadow-sm hover:border-primary/30 hover:shadow-lg transition-all cursor-pointer group flex flex-col h-full"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg group-hover:bg-primary group-hover:text-white transition-colors">
                      <span className="material-symbols-outlined">inventory_2</span>
                    </div>
                    <h4 className="font-bold text-on-surface group-hover:text-primary transition-colors">Quản lý Sản phẩm</h4>
                  </div>
                  <p className="text-xs text-on-surface-variant leading-relaxed mt-auto">Hướng dẫn thêm sản phẩm, quản lý biến thể (size, màu sắc) và kiểm soát tồn kho.</p>
                </div>

                <div
                  onClick={() => navigate('/admin/orders')}
                  className="bg-surface p-6 rounded-2xl border border-surface-container shadow-sm hover:border-primary/30 hover:shadow-lg transition-all cursor-pointer group flex flex-col h-full"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                      <span className="material-symbols-outlined">receipt_long</span>
                    </div>
                    <h4 className="font-bold text-on-surface group-hover:text-emerald-600 transition-colors">Xử lý Đơn hàng</h4>
                  </div>
                  <p className="text-xs text-on-surface-variant leading-relaxed mt-auto">Quy trình duyệt đơn, cập nhật trạng thái giao hàng và in hóa đơn thanh toán.</p>
                </div>

                <div
                  onClick={() => navigate('/admin/vouchers')}
                  className="bg-surface p-6 rounded-2xl border border-surface-container shadow-sm hover:border-primary/30 hover:shadow-lg transition-all cursor-pointer group flex flex-col h-full"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg group-hover:bg-amber-500 group-hover:text-white transition-colors">
                      <span className="material-symbols-outlined">local_offer</span>
                    </div>
                    <h4 className="font-bold text-on-surface group-hover:text-amber-600 transition-colors">Chiến dịch Vouchers</h4>
                  </div>
                  <p className="text-xs text-on-surface-variant leading-relaxed mt-auto">Cách tạo mã giảm giá, thiết lập điều kiện áp dụng và theo dõi lượt sử dụng.</p>
                </div>

                <div
                  onClick={() => navigate('/admin/customers')}
                  className="bg-surface p-6 rounded-2xl border border-surface-container shadow-sm hover:border-primary/30 hover:shadow-lg transition-all cursor-pointer group flex flex-col h-full"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-purple-50 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-lg group-hover:bg-purple-500 group-hover:text-white transition-colors">
                      <span className="material-symbols-outlined">manage_accounts</span>
                    </div>
                    <h4 className="font-bold text-on-surface group-hover:text-purple-600 transition-colors">Phân quyền Hệ thống</h4>
                  </div>
                  <p className="text-xs text-on-surface-variant leading-relaxed mt-auto">Kiểm soát truy cập, gán quyền Quản trị viên (Admin) hoặc Nhân viên (Staff).</p>
                </div>
              </div>
            </div>

            {/* FAQs */}
            <div>
              <h3 className="text-xl font-bold text-on-surface font-headline mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">quiz</span>
                Câu hỏi thường gặp
              </h3>
              <div className="bg-surface rounded-2xl border border-surface-container shadow-sm overflow-hidden">
                {faqs.filter(f => f.question.toLowerCase().includes(searchQuery.toLowerCase())).map((faq) => (
                  <div key={faq.id} className="border-b border-surface-container last:border-0">
                    <button
                      onClick={() => toggleFaq(faq.id)}
                      className="w-full text-left px-6 py-4 flex items-center justify-between hover:bg-surface-container-low transition-colors focus:outline-none"
                    >
                      <span className={`font-semibold text-sm ${activeFaq === faq.id ? 'text-primary' : 'text-on-surface'}`}>
                        {faq.question}
                      </span>
                      <span className={`material-symbols-outlined text-on-surface-variant transition-transform duration-300 ${activeFaq === faq.id ? 'rotate-180' : ''}`}>
                        expand_more
                      </span>
                    </button>
                    {activeFaq === faq.id && (
                      <div className="px-6 pb-4 pt-1 animate-fade-in-up">
                        <p className="text-sm text-on-surface-variant leading-relaxed bg-primary/5 p-4 rounded-xl border border-primary/10">
                          {faq.answer}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Contact & Info */}
          <div className="lg:col-span-4 space-y-6">
            {/* Technical Contact */}
            <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
              <h4 className="text-lg font-bold font-headline mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400">gpp_maybe</span>
                Báo cáo sự cố
              </h4>
              <p className="text-xs text-slate-300 dark:text-slate-400 mb-6 leading-relaxed">
                Nếu hệ thống gặp lỗi nghiêm trọng (như sập server, không hiển thị dữ liệu, mất kết nối cơ sở dữ liệu), vui lòng liên hệ ngay với đội ngũ kỹ thuật.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-slate-400 dark:text-slate-500 text-lg">call</span>
                  <div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold">Hotline Kỹ thuật (24/7)</p>
                    <p className="font-mono text-sm mt-0.5">09xx.xxx.xxx</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-slate-400 dark:text-slate-500 text-lg">mail</span>
                  <div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold">Email Dev Team</p>
                    <a href="mailto:dev.support@aurak.com" className="text-sm mt-0.5 text-blue-400 hover:underline cursor-pointer block">dev.support@aurak.com</a>
                  </div>
                </div>
              </div>
            </div>

            {/* System Info */}
            <div className="bg-surface p-6 rounded-2xl border border-surface-container shadow-sm">
              <h4 className="font-bold text-on-surface mb-4 font-headline border-b border-surface-container pb-3">Thông tin Hệ thống</h4>
              <ul className="space-y-3 text-sm">
                <li className="flex justify-between items-center">
                  <span className="text-on-surface-variant">Phiên bản hiện tại</span>
                  <span className="font-bold text-on-surface bg-surface-container px-2 py-0.5 rounded">v2.4.0</span>
                </li>
                <li className="flex justify-between items-center">
                  <span className="text-on-surface-variant">Bản cập nhật cuối</span>
                  <span className="font-semibold text-on-surface">Hôm nay</span>
                </li>
                <li className="flex justify-between items-center">
                  <span className="text-on-surface-variant">Trạng thái API</span>
                  <span className={`font-bold flex items-center gap-1 ${systemStatus.isOnline ? 'text-emerald-600' : 'text-red-500'}`}>
                    <span className={`w-2 h-2 rounded-full ${systemStatus.isOnline ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`}></span> {systemStatus.api}
                  </span>
                </li>
                <li className="flex justify-between items-center">
                  <span className="text-on-surface-variant">Máy chủ CSDL</span>
                  <span className={`font-bold flex items-center gap-1 ${systemStatus.isOnline ? 'text-emerald-600' : 'text-red-500'}`}>
                    <span className={`w-2 h-2 rounded-full ${systemStatus.isOnline ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`}></span> {systemStatus.db}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
};

export default AdminHelp;