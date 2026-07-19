import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Footer from '../../components/Footer';
import { CartContext } from '../../context/CartContext';
import { AuthContext } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { getImageUrl, API_BASE_URL } from '../Register/api.config';
import { formatPrice } from '../../utils/formatPrice';

const Cart = () => {
  const { cartItems, removeFromCart, updateQuantity, flashSaleData, appliedVoucher, applyVoucher, removeVoucher, availableVouchers } = useContext(CartContext);
  const { user, token } = useContext(AuthContext);
  const { t, language, formatPrice, translateProductName, translateColorName } = useLanguage();
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(true);
  const [couponCode, setCouponCode] = useState(appliedVoucher || '');
  const [discount, setDiscount] = useState(0);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [showVouchers, setShowVouchers] = useState(false); // Trạng thái ẩn/hiện danh sách mã giảm giá
  const navigate = useNavigate();

  const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

  // Tính tổng số tiền tiết kiệm được từ Flash Sale
  const flashSaleDiscount = cartItems.reduce((acc, item) => {
    return item.isFlashSale ? acc + (item.originalPrice - item.price) * item.quantity : acc;
  }, 0);

  const originalSubtotal = subtotal + flashSaleDiscount;

  // Đồng bộ logic tính phí vận chuyển với trang Checkout
  const userCity = user?.city || 'Hà Nội'; // Mặc định là Hà Nội giống Checkout
  const innerCities = ["Hà Nội", "TP. Hồ Chí Minh", "Đà Nẵng"];
  const shippingFee = innerCities.includes(userCity) ? 25000 : 45000;

  const total = Math.max(0, subtotal + shippingFee - discount);
  const totalDiscountAmount = flashSaleDiscount + discount;

  // Lấy sản phẩm gợi ý dựa trên nội dung giỏ hàng
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchRecommendations = async () => {
      setLoadingRecs(true);
      try {
        const apiUrl = API_BASE_URL || '';
        let url = `${apiUrl}/api/v1/products`;

        // Nếu giỏ hàng có sản phẩm, lấy sản phẩm liên quan theo danh mục của sản phẩm đầu tiên
        const firstItem = cartItems[0];
        if (firstItem && (firstItem.category_id || firstItem.productId)) {
          const categoryId = firstItem.category_id;
          if (categoryId) url += `?category=${categoryId}`;
        }

        const response = await fetch(url, { signal: controller.signal });
        const data = await response.json();

        if (isMounted && data.success) {
          // Lọc ra những sản phẩm đã có trong giỏ và chỉ lấy 4 sản phẩm đầu tiên
          const cartItemIds = new Set(cartItems.map(item => item.id));
          const filteredProducts = data.data.filter(p => !cartItemIds.has(p.id));
          setRecommendedProducts(filteredProducts.slice(0, 4));
        } else {
          if (isMounted) setRecommendedProducts([]);
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error("Lỗi khi lấy sản phẩm gợi ý:", error);
          if (isMounted) setRecommendedProducts([]);
        }
      } finally {
        if (isMounted) setLoadingRecs(false);
      }
    };
    fetchRecommendations();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [cartItems]);

  // Tự động tính toán lại giảm giá và theo dõi điều kiện sử dụng mã
  useEffect(() => {
    if (couponCode && availableVouchers.length > 0) {
      const voucher = availableVouchers.find(v => String(v.code).toUpperCase() === String(couponCode).toUpperCase().trim());
      if (voucher) {
        if (subtotal >= (voucher.min_order_value || 0)) {
          const discountAmount = voucher.type === 'percent'
            ? (subtotal * Number(voucher.value)) / 100
            : voucher.type === 'freeship'
              ? shippingFee
              : Number(voucher.value);
          setDiscount(discountAmount);
          setCouponError('');
        } else {
          const remainingAmount = (voucher.min_order_value || 0) - subtotal;
          setDiscount(0);
          setCouponError(
            language === 'vi'
              ? `Cần mua thêm ${formatPrice(remainingAmount)} để sử dụng mã này.`
              : `Need to buy ${formatPrice(remainingAmount)} more to use this coupon.`
          );
          setCouponSuccess('');

          // Nếu đây là mã đang được áp dụng chính thức từ Context, báo lỗi cho người dùng
          if (appliedVoucher && String(appliedVoucher).toUpperCase() === String(voucher.code).toUpperCase()) {
            toast.error(
              language === 'vi'
                ? `Mã giảm giá ${voucher.code} không còn đủ điều kiện do tổng tiền thay đổi.`
                : `Promo code ${voucher.code} is no longer eligible due to price changes.`,
              { id: 'voucher-insufficient' }
            );
          }
        }
      } else {
        setDiscount(0);
        setCouponError('');
      }
    } else {
      setDiscount(0);
      setCouponError('');
    }
  }, [subtotal, couponCode, availableVouchers, appliedVoucher, shippingFee, language]);

  const [isValidatingVoucher, setIsValidatingVoucher] = useState(false);

  const validateAndApplyCoupon = async (codeToValidate) => {
    const code = codeToValidate || couponCode;
    
    if (code.trim() === '') {
      setDiscount(0);
      setCouponError(language === 'vi' ? 'Vui lòng nhập mã giảm giá' : 'Please enter discount code');
      setCouponSuccess('');
      removeVoucher();
      return;
    }

    setIsValidatingVoucher(true);
    setCouponError('');
    setCouponSuccess('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/validate-voucher`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ code: code, subtotal: subtotal })
      });

      const result = await response.json();

      if (result.success && result.data) {
        const voucher = result.data;
        const discountAmount = voucher.type === 'percent'
          ? (subtotal * Number(voucher.value)) / 100
          : voucher.type === 'freeship'
            ? shippingFee
            : Number(voucher.value);

        setDiscount(discountAmount);
        applyVoucher(voucher.code);
        setCouponCode(voucher.code);
        setCouponSuccess(language === 'vi' ? 'Áp dụng mã giảm giá thành công!' : 'Coupon code applied successfully!');
        toast.success(t('cart.voucherApplied', { code: voucher.code }));
      } else {
        setDiscount(0);
        const errorMsg = result.message || (language === 'vi' ? 'Mã giảm giá không hợp lệ hoặc đã hết hạn' : 'Invalid or expired coupon code');
        setCouponError(errorMsg);
        toast.error(errorMsg);
        removeVoucher();
      }
    } catch (error) {
      setDiscount(0);
      setCouponError(language === 'vi' ? 'Lỗi kết nối máy chủ' : 'Server connection error');
      removeVoucher();
    } finally {
      setIsValidatingVoucher(false);
    }
  };

  const handleApplyCoupon = () => validateAndApplyCoupon();

  return (
    <div className="bg-gray-50 text-gray-900 font-body min-h-screen flex flex-col">
      <main className="pt-28 pb-20 px-6 max-w-[1440px] mx-auto flex-grow w-full">
        {/* Cart Header */}
        <header className="mb-12">
          <h1 className="text-4xl font-extrabold tracking-tighter text-primary mb-2 font-headline">{t('cart.title')}</h1>
          <p className="text-gray-600 font-body font-medium">
            {cartItems.length > 0
              ? (language === 'vi' ? `Bạn đang có ${cartItems.length} sản phẩm trong giỏ hàng` : `You have ${cartItems.length} items in your cart`)
              : t('cart.emptySub')
            }
          </p>
        </header>

        {cartItems.length === 0 ? (
          <div className="text-center py-24 flex flex-col items-center bg-white rounded-3xl shadow-sm border border-gray-200">
            <span className="material-symbols-outlined text-8xl text-gray-300">production_quantity_limits</span>
            <h2 className="mt-6 text-3xl font-bold text-gray-900 font-headline">{t('cart.empty')}</h2>
            <p className="mt-3 text-gray-500 max-w-sm text-lg">{t('cart.emptySub')}</p>
            <Link to="/products" className="mt-8 inline-block btn-primary px-10 py-4">
              {t('cart.backToShop')}
            </Link>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-12">
            {/* Product List Section */}
            <section className="flex-grow space-y-6">
              {cartItems.map((item) => (
                <div key={item.cartItemId} className="bg-white shadow-sm hover:shadow-md transition-shadow border border-gray-200 p-4 sm:p-6 rounded-2xl flex gap-4 sm:gap-6 items-start sm:items-center">
                  <div className="w-24 h-32 sm:w-32 sm:h-40 bg-gray-50 rounded-xl overflow-hidden flex-shrink-0 relative border border-gray-100">
                    <img alt={item.name} className="w-full h-full object-cover" src={getImageUrl(item.image)} loading="lazy" />
                    {item.isFlashSale && (
                      <div className="absolute top-2 left-0 bg-red-600 text-white text-[10px] font-extrabold px-2 py-1 rounded-r-md shadow-md z-10">
                        FLASH SALE
                      </div>
                    )}
                  </div>
                  <div className="flex-grow flex flex-col lg:flex-row lg:items-center justify-between gap-4 min-w-0">
                    <div className="space-y-2 min-w-0">
                      <h3 className="text-base sm:text-xl font-bold font-headline text-gray-900 line-clamp-2 break-words">{translateProductName(item.name)}</h3>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs sm:text-sm text-gray-500">
                        <span className="whitespace-nowrap flex items-center gap-2">
                          Size: <span className="text-gray-900 font-bold">{item.size}</span>
                          {item.color && (
                            <>
                              <span className="text-gray-300">|</span> 
                              {language === 'vi' ? 'Màu:' : 'Color:'} <span className="text-gray-900 font-bold">{translateColorName(item.color)}</span>
                            </>
                          )}
                        </span>
                        <span className="flex items-center gap-2 sm:border-l border-gray-200 sm:pl-4">
                          {language === 'vi' ? 'Đơn giá:' : 'Unit Price:'}
                          {item.isFlashSale ? (
                            <>
                              <span className="text-red-600 font-bold">{formatPrice(item.price)}</span>
                              <span className="line-through text-[11px] text-gray-400">{formatPrice(item.originalPrice)}</span>
                            </>
                          ) : (
                            <span className="text-gray-900 font-bold">{formatPrice(item.price)}</span>
                          )}
                        </span>
                      </div>
                      <button onClick={() => removeFromCart(item.cartItemId)} className="text-red-500 text-sm font-semibold mt-2 hover:text-red-600 transition-colors flex items-center gap-1 group">
                        <span className="material-symbols-outlined text-base group-hover:scale-110 transition-transform">delete</span>
                        {t('cart.remove')}
                      </button>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-8 w-full lg:w-auto mt-2 lg:mt-0">
                      <div className="flex items-center bg-gray-50 border border-gray-200 rounded-full px-2 py-1 shadow-sm">
                        <button
                          onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <span className="material-symbols-outlined text-lg">remove</span>
                        </button>
                        <span className="w-8 text-center text-base font-bold text-gray-900">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                          disabled={item.stock_quantity ? item.quantity >= item.stock_quantity : item.quantity >= 10}
                          className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <span className="material-symbols-outlined text-lg">add</span>
                        </button>
                      </div>
                      <div className="text-right min-w-[100px] sm:min-w-[120px]">
                        {item.isFlashSale ? (
                          <div className="flex flex-col items-end">
                            <p className="text-lg sm:text-2xl font-bold font-headline text-red-600">{formatPrice(item.price * item.quantity)}</p>
                            <p className="text-xs line-through text-gray-400">{formatPrice(item.originalPrice * item.quantity)}</p>
                          </div>
                        ) : (
                          <p className="text-lg sm:text-2xl font-bold font-headline text-primary">{formatPrice(item.price * item.quantity)}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div className="pt-8 flex items-center justify-between text-gray-600">
                <Link to="/products" className="flex items-center gap-2 hover:text-primary transition-colors font-semibold">
                  <span className="material-symbols-outlined">arrow_back</span>
                  {t('cart.backToShop')}
                </Link>
              </div>
            </section>

            {/* Order Summary Sidebar */}
            <aside className="w-full lg:w-[400px]">
              <div className="bg-white rounded-3xl p-6 sm:p-8 sticky top-32 space-y-8 border border-gray-200 shadow-xl">
                <h2 className="text-2xl font-bold font-headline text-gray-900 border-b border-gray-100 pb-4">{t('cart.summary')}</h2>
                <div className="space-y-3">
                  <label className="text-sm font-bold text-gray-700">{t('cart.voucher')}</label>
                  <div className="flex items-center gap-2 w-full">
                    <input
                      className="flex-1 min-w-0 bg-gray-50 text-gray-900 placeholder:text-gray-400 border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-3 font-body text-sm outline-none transition-all"
                      placeholder={t('cart.voucherPlaceholder')}
                      type="text"
                      value={couponCode}
                      onChange={(e) => {
                        setCouponCode(e.target.value);
                        setCouponError(''); // Ẩn lỗi khi người dùng bắt đầu nhập lại
                        setCouponSuccess(''); // Đồng thời ẩn thông báo thành công
                      }}
                    />
                    <button 
                      onClick={handleApplyCoupon} 
                      disabled={isValidatingVoucher}
                      className="whitespace-nowrap bg-primary text-white px-6 py-3 rounded-xl font-bold text-sm hover:brightness-110 active:scale-95 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isValidatingVoucher ? (
                        <>
                          <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                          {language === 'vi' ? 'Đang kiểm tra...' : 'Validating...'}
                        </>
                      ) : t('cart.applyVoucher')}
                    </button>
                  </div>
                  {couponError && <p className="text-red-500 text-xs font-semibold mt-1">{couponError}</p>}
                  {couponSuccess && <p className="text-green-600 text-xs font-semibold mt-1">{couponSuccess}</p>}

                  {/* Hiển thị danh sách voucher có sẵn */}
                  {availableVouchers.length > 0 && (
                    <div className="mt-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <div
                        className="flex justify-between items-center cursor-pointer select-none group"
                        onClick={() => setShowVouchers(!showVouchers)}
                      >
                        <p className="text-[12px] font-bold uppercase tracking-widest text-primary flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">local_activity</span>
                          {language === 'vi' ? 'Mã giảm giá độc quyền' : 'Exclusive Coupons'}
                        </p>
                        <span className={`material-symbols-outlined text-primary text-base transition-transform duration-300 ${showVouchers ? 'rotate-180' : ''}`}>
                          expand_more
                        </span>
                      </div>

                      {showVouchers && (
                        <div className="space-y-3 max-h-40 overflow-y-auto custom-scrollbar pr-2 mt-4 pt-4 border-t border-gray-200 animate-fade-in-up">
                          {availableVouchers
                            .filter(v => v.quantity > 0 && (!v.end_date || new Date(v.end_date) >= new Date()))
                            .map(v => {
                              const isEligible = subtotal >= (v.min_order_value || 0);
                              const isSelected = couponCode.toUpperCase() === v.code.toUpperCase();

                              let cardClass = "relative flex justify-between items-center p-3.5 rounded-xl border text-sm transition-all ";
                              if (isSelected) {
                                cardClass += "border-primary bg-primary/5 shadow-sm cursor-pointer";
                              } else if (isEligible) {
                                cardClass += "border-green-200 bg-white hover:border-green-400 hover:shadow-md cursor-pointer";
                              } else {
                                cardClass += "border-gray-200 bg-gray-100 cursor-not-allowed opacity-75";
                              }

                              return (
                                <div
                                  key={v.id}
                                  onClick={() => {
                                    if (isSelected) {
                                      setCouponCode('');
                                      removeVoucher();
                                      setCouponError('');
                                      setCouponSuccess(language === 'vi' ? 'Đã hủy áp dụng mã giảm giá.' : 'Cancelled voucher.');
                                    } else {
                                      // Sử dụng hàm gọi API để đồng nhất logic bảo mật
                                      validateAndApplyCoupon(v.code);
                                    }
                                  }}
                                  className={cardClass}
                                >
                                  {/* HUY HIỆU HIỂN THỊ SỐ LƯỢNG MÃ CÒN LẠI */}
                                  <div className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-md z-10 border-2 border-white">
                                    x{v.quantity || 1}
                                  </div>
                                  <div className="flex-1 min-w-0 pr-2">
                                    <p className={`font-bold ${isSelected ? 'text-primary' : (isEligible ? 'text-green-700' : 'text-gray-600')}`}>{v.code}</p>
                                    <p className={`text-[11px] mt-1 ${isEligible ? 'text-green-600 font-medium' : 'text-red-500 font-semibold'}`}>
                                      {isEligible
                                        ? (language === 'vi' ? 'Đủ điều kiện áp dụng' : 'Eligible to apply')
                                        : (language === 'vi' ? `Mua thêm ${formatPrice(Number(v.min_order_value || 0) - subtotal)} để dùng` : `Buy ${formatPrice(Number(v.min_order_value || 0) - subtotal)} more to use`)
                                      }
                                    </p>
                                  </div>
                                  <span className={`whitespace-nowrap text-sm font-bold ${isSelected ? 'text-primary' : (isEligible ? 'text-green-600' : 'text-gray-500')}`}>
                                    {v.type === 'percent' ? `-${v.value}%` : v.type === 'freeship' ? (language === 'vi' ? 'Freeship' : 'Freeship') : `-${formatPrice(v.value)}`}
                                  </span>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="space-y-4 font-body border-t border-gray-100 pt-6">
                  <div className="flex justify-between items-start gap-4 text-gray-600 font-medium">
                    <span className="flex-1">{t('cart.subtotal')}</span>
                    <span className="text-gray-900 font-bold whitespace-nowrap">{formatPrice(originalSubtotal)}</span>
                  </div>
                  {flashSaleDiscount > 0 && (
                    <div className="flex justify-between items-start gap-4 text-gray-600 font-medium">
                      <span className="flex-1">{language === 'vi' ? 'Giảm giá Flash Sale' : 'Flash Sale Discount'}</span>
                      <span className="text-red-600 font-bold whitespace-nowrap">-{formatPrice(flashSaleDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-start gap-4 text-gray-600 font-medium">
                    <span className="flex-1">{language === 'vi' ? 'Phí vận chuyển' : 'Shipping Fee'}</span>
                    <span className="text-gray-900 font-bold whitespace-nowrap">{formatPrice(shippingFee)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between items-start gap-4 text-gray-600 font-medium">
                      <span className="flex-1">{t('cart.discount')}</span>
                      <span className="text-red-600 font-bold whitespace-nowrap">-{formatPrice(discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-end gap-4 pt-6 border-t border-gray-200 mt-2">
                    <span className="flex-1 text-lg font-bold text-gray-900">{t('cart.total')}</span>
                    <span className="text-3xl font-extrabold text-primary font-headline whitespace-nowrap leading-none">{formatPrice(total)}</span>
                  </div>
                </div>
                <button
                  disabled={cartItems.length === 0}
                  onClick={() => navigate('/checkout', { state: { discountAmount: discount, appliedCouponCode: couponCode } })}
                  className="w-full btn-primary py-5 rounded-2xl font-bold font-headline text-lg shadow-xl hover:shadow-2xl flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                >
                  {t('cart.checkout')}
                  <span className="material-symbols-outlined">shopping_cart_checkout</span>
                </button>
                <div className="flex flex-col items-center gap-4 pt-6">
                  <p className="text-[10px] text-center text-gray-500 uppercase tracking-widest font-bold">
                    {language === 'vi' ? 'Phương thức thanh toán an toàn' : 'Secure Payment Methods'}
                  </p>
                  <div className="flex gap-4 text-gray-400 hover:text-gray-800 transition-all cursor-default">
                    <span className="material-symbols-outlined text-3xl">credit_card</span>
                    <span className="material-symbols-outlined text-3xl">account_balance</span>
                    <span className="material-symbols-outlined text-3xl">payments</span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}

        {/* Cross-sell Section */}
        <section className="mt-24">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-3xl font-extrabold font-headline tracking-tight text-gray-900">
                {language === 'vi' ? 'Có thể bạn cũng thích' : 'You Might Also Like'}
              </h2>
              <div className="h-1 w-20 bg-primary mt-3 rounded-full"></div>
            </div>
            <Link className="text-sm font-bold text-primary hover:underline flex items-center gap-1" to="/products">
              {language === 'vi' ? 'Xem tất cả' : 'View All'} <span className="material-symbols-outlined text-base">chevron_right</span>
            </Link>
          </div>

          {/* Dynamic Recommendations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {loadingRecs ? (
              <p className="col-span-full text-center text-gray-500">
                {language === 'vi' ? 'Đang tải gợi ý cho bạn...' : 'Loading recommendations for you...'}
              </p>
            ) : recommendedProducts.length > 0 ? (
              recommendedProducts.map(product => {
                const displayImage = getImageUrl(product.imageUrl || product.image || product.image_url) || "https://via.placeholder.com/300x400?text=No+Image";

                // Kiểm tra xem sản phẩm gợi ý này có đang trong đợt Flash Sale không
                const now = new Date().getTime();
                const isFlashSale = flashSaleData?.isActive && flashSaleData?.endTime > now && flashSaleData?.ids?.map(Number).includes(Number(product.id));
                const displayPrice = isFlashSale ? product.price * 0.8 : product.price;

                return (
                  <Link to={`/product/${product.id}`} key={product.id} className="group cursor-pointer block">
                    <div className="relative aspect-[3/4] bg-white rounded-2xl overflow-hidden mb-4 border border-gray-200 shadow-sm group-hover:shadow-md transition-all">
                      <img alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" src={displayImage} loading="lazy" />
                      {isFlashSale && (
                        <div className="absolute top-3 left-3 bg-red-600 text-white px-2 py-1 text-[10px] font-extrabold rounded-r-md shadow-md z-10">
                          -20%
                        </div>
                      )}
                    </div>
                    <h4 className="font-bold font-headline text-gray-900 truncate group-hover:text-primary transition-colors">{translateProductName(product.name)}</h4>
                    {isFlashSale ? (
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-red-600 font-bold font-headline text-lg">{formatPrice(displayPrice)}</p>
                        <p className="text-gray-400 text-xs line-through font-medium">{formatPrice(product.price)}</p>
                      </div>
                    ) : (
                      <p className="text-primary font-bold font-headline text-lg mt-1">{formatPrice(product.price)}</p>
                    )}
                  </Link>
                );
              })
            ) : (
              <p className="col-span-full text-center text-gray-500">
                {language === 'vi' ? 'Không tìm thấy sản phẩm gợi ý.' : 'No recommended products found.'}
              </p>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Cart;