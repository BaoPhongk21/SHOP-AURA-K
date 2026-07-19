import React, { useEffect, useState, useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CartContext } from '../../context/CartContext';
import Footer from '../../components/Footer';
import { useLanguage } from '../../context/LanguageContext';
import toast, { Toaster } from 'react-hot-toast';
import { getImageUrl } from '../Register/api.config';
import { useSettings } from '../../components/SettingsContext';

import { API_BASE_URL } from '../../config/api.config';

const OrderSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { clearCart } = useContext(CartContext);
  const { t, language, formatPrice } = useLanguage();
  const { settings } = useSettings();

  const paymentMethod = location.state?.paymentMethod || 'cod';

  const [isPaidSuccess, setIsPaidSuccess] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setReceiptFile(file);
      setReceiptPreview(URL.createObjectURL(file));
    }
  };

  const handleConfirmPayment = async () => {
    if (!receiptFile) {
      toast.error(language === 'vi' ? 'Vui lòng chọn ảnh hóa đơn chuyển khoản.' : 'Please select a payment receipt image.');
      return;
    }
    setIsVerifying(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('receipt', receiptFile);

      const res = await fetch(`${API_BASE_URL}/api/v1/orders/${finalOrderId}/upload-receipt`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setIsPaidSuccess(true);
        toast.success(
          language === 'vi'
            ? 'Đã tải lên ảnh chuyển khoản thành công! Bạn hãy xem đơn hàng.'
            : 'Receipt uploaded successfully! Please view your order.'
        );
      } else {
        toast.error(data.message || 'Có lỗi xảy ra, vui lòng thử lại.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Không thể kết nối đến máy chủ.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Lấy orderId từ state (nếu thanh toán tiền mặt - COD)
  const stateOrderId = location.state?.orderId;
  const totalSaved = location.state?.totalSaved || 0;

  // Lấy các tham số từ URL (nếu thanh toán VNPay trả về)
  const searchParams = new URLSearchParams(location.search);
  const vnp_ResponseCode = searchParams.get('vnp_ResponseCode');
  const vnp_TxnRef = searchParams.get('vnp_TxnRef'); // Mã đơn hàng VNPay

  // Đơn hàng thành công nếu là COD hoặc VNPay trả về mã 00 (Thành công)
  const isVnpaySuccess = vnp_ResponseCode === '00';
  const finalOrderId = stateOrderId || vnp_TxnRef;

  useEffect(() => {
    // Nếu là VNPay trả về thành công, ta cần xóa giỏ hàng ở đây (vì lúc click đặt hàng ở Checkout chưa xóa)
    if (isVnpaySuccess) {
      clearCart();
    }

    // Nếu không có thông tin đơn hàng nào hợp lệ, đá về trang chủ
    if (!finalOrderId && !vnp_ResponseCode) {
      const timer = setTimeout(() => {
        navigate('/');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [finalOrderId, vnp_ResponseCode, isVnpaySuccess, navigate, clearCart]);

  if (!finalOrderId && !vnp_ResponseCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 font-semibold animate-pulse">
          {language === 'vi' ? 'Đang chuyển hướng về trang chủ...' : 'Redirecting to homepage...'}
        </p>
      </div>
    );
  }

  // Nếu VNPay trả về mã lỗi (khác 00, ví dụ khách hàng tự bấm Hủy thanh toán)
  if (vnp_ResponseCode && !isVnpaySuccess) {
    return (
      <div className="bg-gray-50 text-gray-800 font-body min-h-screen flex flex-col">
        <main className="pt-28 pb-20 px-6 max-w-3xl mx-auto flex-grow w-full flex items-center justify-center">
          <div className="bg-white p-12 rounded-2xl text-center shadow-lg border border-red-100 w-full">
            <span className="material-symbols-outlined text-7xl text-red-500 mb-6">cancel</span>
            <h1 className="text-3xl font-extrabold font-headline text-red-600 mb-4">
              {language === 'vi' ? 'Thanh toán thất bại!' : 'Payment Failed!'}
            </h1>
            <p className="text-gray-600 mb-8">
              {language === 'vi'
                ? 'Rất tiếc, giao dịch VNPay của bạn đã bị hủy hoặc xảy ra sự cố.'
                : 'Sorry, your VNPay transaction was cancelled or an error occurred.'
              }
            </p>
            <Link to="/checkout" className="px-8 py-3 bg-black text-white font-bold rounded-lg hover:bg-gray-800 transition-all">
              {language === 'vi' ? 'Quay lại Giỏ hàng để thử lại' : 'Back to Cart to try again'}
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="bg-gray-50 text-gray-800 font-body min-h-screen flex flex-col">
      <Toaster position="top-center" reverseOrder={false} />
      <main className="pt-28 pb-20 px-6 max-w-3xl mx-auto flex-grow w-full flex items-center justify-center">
        <div className="bg-white p-12 rounded-2xl text-center shadow-lg border border-gray-100 w-full">

          {/* 1. VNPay Success OR COD OR Already Confirmed Payment */}
          {((paymentMethod === 'cod' || isVnpaySuccess || isPaidSuccess) ? (
            <>
              <span className="material-symbols-outlined text-7xl text-green-500 mb-6 animate-bounce">task_alt</span>
              <h1 className="text-4xl font-extrabold font-headline text-green-600 mb-4">
                {isPaidSuccess || isVnpaySuccess
                  ? (language === 'vi' ? 'Thanh toán thành công!' : 'Payment Successful!')
                  : (language === 'vi' ? 'Đặt hàng thành công!' : 'Order Placed Successfully!')
                }
              </h1>

              {isPaidSuccess && (
                <div className="mb-6 bg-green-50 text-green-700 py-3 px-6 rounded-xl inline-flex flex-col items-center gap-1 text-sm font-bold border border-green-200 w-full max-w-md mx-auto">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">check_circle</span>
                    <span>
                      {paymentMethod === 'bank_transfer'
                        ? (language === 'vi' ? 'Đã thanh toán bằng ngân hàng thành công' : 'Paid via Bank Transfer successfully')
                        : (language === 'vi' ? 'Đã thanh toán bằng ví điện tử thành công' : 'Paid via E-Wallet successfully')
                      }
                    </span>
                  </div>
                  <p className="text-xs font-normal text-green-600 mt-1">
                    {language === 'vi' ? 'Đã chuyển thành công! Bạn hãy xem đơn hàng.' : 'Transferred successfully! Please view your order.'}
                  </p>
                </div>
              )}

              {totalSaved > 0 && (
                <div className="mb-6 bg-green-50 text-green-700 py-2 px-4 rounded-full inline-flex items-center gap-2 text-sm font-bold border border-green-100">
                  <span className="material-symbols-outlined text-base">Celebration</span>
                  {language === 'vi'
                    ? `Bạn đã tiết kiệm được ${formatPrice(totalSaved)} cho đơn hàng này!`
                    : `You saved ${formatPrice(totalSaved)} on this order!`
                  }
                </div>
              )}

              <p className="text-gray-500 mb-2">
                {language === 'vi'
                  ? 'Cảm ơn bạn đã tin tưởng và mua sắm tại cửa hàng của chúng tôi.'
                  : 'Thank you for trusting and shopping with us.'
                }
              </p>
              <p className="text-gray-600 mb-8">
                {language === 'vi' ? 'Mã đơn hàng của bạn là:' : 'Your order code is:'}{' '}
                <strong className="font-mono text-black bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200">{finalOrderId}</strong>
              </p>
              <p className="text-sm text-gray-500 mb-10 leading-relaxed">
                {language === 'vi'
                  ? 'Chúng tôi đã ghi nhận thông tin đơn hàng. Bạn có thể theo dõi trạng thái đơn hàng trong tài khoản của mình.'
                  : 'We have recorded your order. You can track your order status in your account dashboard.'
                }
              </p>
              <div className="flex justify-center gap-4">
                <Link to="/products" className="px-8 py-3 bg-black text-white font-bold rounded-lg hover:bg-gray-800 hover:shadow-lg transition-all">
                  {t('cart.backToShop')}
                </Link>
                <Link to="/orders" className="px-8 py-3 bg-gray-100 text-gray-800 border border-gray-200 font-bold rounded-lg hover:bg-gray-200 transition-all">
                  {language === 'vi' ? 'Xem đơn hàng' : 'View Orders'}
                </Link>
              </div>
            </>
          ) : (
            /* 2. Unpaid Bank Transfer or Momo: Force Payment and Confirm Button */
            <>
              <span className="material-symbols-outlined text-7xl text-amber-500 mb-6 animate-pulse">hourglass_empty</span>
              <h1 className="text-4xl font-extrabold font-headline text-amber-600 mb-4">
                {language === 'vi' ? 'Đang chờ thanh toán...' : 'Awaiting Payment...'}
              </h1>

              <p className="text-gray-600 mb-4">
                {language === 'vi'
                  ? 'Vui lòng hoàn tất chuyển khoản để kích hoạt đơn hàng.'
                  : 'Please complete the transfer to activate your order.'
                }
              </p>
              <p className="text-gray-600 mb-6">
                {language === 'vi' ? 'Mã đơn hàng của bạn:' : 'Your order code:'}{' '}
                <strong className="font-mono text-black bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200">{finalOrderId}</strong>
              </p>

              {/* QR Code Card */}
              {settings && (
                <div className="mt-4 mb-8 p-6 bg-gray-50 rounded-xl border border-gray-200 text-center flex flex-col items-center max-w-md mx-auto">
                  <h2 className="text-sm font-bold text-black font-headline mb-3">
                    {paymentMethod === 'bank_transfer'
                      ? (language === 'vi' ? 'Quét mã QR để Chuyển khoản ngân hàng' : 'Scan QR to Bank Transfer')
                      : (language === 'vi' ? 'Quét mã QR để Thanh toán Ví MoMo' : 'Scan QR to Pay via MoMo')
                    }
                  </h2>

                  {paymentMethod === 'bank_transfer' && settings.paymentVcbQr && (
                    <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 mb-3">
                      <img src={getImageUrl(settings.paymentVcbQr)} alt="Vietcombank QR" className="w-48 h-48 object-contain" />
                    </div>
                  )}
                  {paymentMethod === 'credit_card' && settings.paymentMomoQr && (
                    <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 mb-3">
                      <img src={getImageUrl(settings.paymentMomoQr)} alt="MoMo QR" className="w-48 h-48 object-contain" />
                    </div>
                  )}

                  <div className="text-left bg-white p-4 rounded-lg w-full mt-2 border border-gray-200 shadow-sm">
                    <p className="text-xs font-bold text-black mb-2">
                      {language === 'vi' ? 'Thông tin người nhận:' : 'Receiver Info:'}
                    </p>
                    <div className="space-y-1.5 text-xs text-gray-600 font-mono">
                      <p><strong>{language === 'vi' ? 'Tên Shop:' : 'Shop Name:'}</strong> {settings.name || 'Shop Aura'}</p>
                      <p><strong>{language === 'vi' ? 'Hotline:' : 'Hotline:'}</strong> {settings.hotline || ''}</p>
                      <p><strong>{language === 'vi' ? 'Nội dung CK:' : 'Transfer Message:'}</strong> {finalOrderId}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Upload Receipt Section */}
              <div className="mt-8 mb-8 p-6 bg-slate-50 rounded-xl border border-slate-200 text-center flex flex-col items-center max-w-md mx-auto w-full">
                <span className="material-symbols-outlined text-4xl text-primary mb-3">upload_file</span>
                <h3 className="text-sm font-bold text-black font-headline mb-2">
                  {language === 'vi' ? 'Tải lên ảnh biên lai chuyển khoản' : 'Upload Transfer Receipt Image'}
                </h3>
                <p className="text-xs text-gray-500 mb-4 max-w-xs leading-relaxed">
                  {language === 'vi'
                    ? 'Chụp màn hình giao dịch chuyển khoản thành công và tải lên bên dưới để Admin kiểm tra và duyệt đơn hàng.'
                    : 'Capture your successful transaction screen and upload below for Admin verification.'
                  }
                </p>

                {/* File Input and Preview Box */}
                <label className="w-full cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {receiptPreview ? (
                    <div className="relative group border-2 border-dashed border-green-300 rounded-lg p-2 bg-white max-w-xs mx-auto">
                      <img src={receiptPreview} alt="Receipt Preview" className="max-h-48 mx-auto object-contain rounded" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-lg">
                        <span className="text-white text-xs font-semibold">
                          {language === 'vi' ? 'Thay đổi ảnh' : 'Change Image'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 bg-white hover:border-primary transition-all flex flex-col items-center gap-2 max-w-xs mx-auto">
                      <span className="material-symbols-outlined text-3xl text-slate-400">add_photo_alternate</span>
                      <span className="text-xs font-medium text-slate-500">
                        {language === 'vi' ? 'Chọn ảnh giao dịch...' : 'Choose receipt image...'}
                      </span>
                    </div>
                  )}
                </label>
              </div>

              {/* Confirm Payment Action Button */}
              <div className="flex flex-col items-center gap-4">
                <button
                  onClick={handleConfirmPayment}
                  disabled={isVerifying}
                  className="px-10 py-4 bg-green-600 text-white font-bold text-lg rounded-xl shadow-lg hover:bg-green-700 hover:shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-3 mx-auto"
                >
                  {isVerifying ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {language === 'vi' ? 'Đang gửi biên lai...' : 'Submitting receipt...'}
                    </>
                  ) : (
                    language === 'vi' ? 'Xác nhận & gửi ảnh thanh toán' : 'Confirm & submit receipt'
                  )}
                </button>
                <p className="text-xs text-gray-500 italic max-w-sm">
                  {language === 'vi'
                    ? '* Vui lòng chuyển khoản đúng nội dung và tải đúng ảnh biên lai trước khi gửi.'
                    : '* Please transfer with correct message and upload the correct receipt before submitting.'
                  }
                </p>
              </div>
            </>
          ))}

        </div>
      </main>
      <Footer />
    </div>
  );
};

export default OrderSuccess;