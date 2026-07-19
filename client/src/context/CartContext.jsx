import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { AuthContext } from './AuthContext'; // Import AuthContext
import { API_BASE_URL } from '../config/api.config';

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  // Cố gắng tải giỏ hàng từ localStorage khi khởi động, nếu không có thì dùng mảng rỗng
  const auth = useContext(AuthContext);
  const user = auth ? auth.user : null;

  const apiUrl = API_BASE_URL || '';

  const [cartItems, setCartItems] = useState(() => {
    try {
      const localData = localStorage.getItem('aura-k-cart');
      return localData ? JSON.parse(localData) : [];
    } catch (error) {
      console.error("Lỗi khi đọc dữ liệu giỏ hàng từ localStorage", error);
      return [];
    }
  });
  // State để theo dõi xem giỏ hàng đang được tải từ server hay không
  const [isCartLoading, setIsCartLoading] = useState(false);

  // State để lưu trữ mã giảm giá đã được người dùng chọn
  const [appliedVoucher, setAppliedVoucher] = useState(() => {
    const savedVoucher = localStorage.getItem('aura-k-applied-voucher');
    // Chống lỗi khi giá trị lưu là chuỗi "null" hoặc "undefined" (thường gặp khi làm việc với localStorage)
    return (savedVoucher === 'null' || savedVoucher === 'undefined') ? null : savedVoucher;
  });

  // State quản lý Flash Sale từ hệ thống
  const [flashSaleData, setFlashSaleData] = useState({ isActive: false, ids: [], endTime: null });

  // State lưu trữ danh sách các mã giảm giá có sẵn từ hệ thống
  const [availableVouchers, setAvailableVouchers] = useState([]);
  const [isVouchersLoading, setIsVouchersLoading] = useState(false);

  // Tải trạng thái Flash Sale từ hệ thống khi khởi động
  useEffect(() => {
    const fetchFlashSale = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/v1/admin/public-flash-sale`);
        const data = await res.json();
        if (data.success && data.isActive) {
          setFlashSaleData({ isActive: true, ids: data.ids, endTime: data.endTime, discount: data.discount });
          return; // Nếu có đợt Sale từ Admin, ưu tiên dùng nó
        }
      } catch (e) { console.error("Lỗi lấy flash sale:", e); }

      // Chỉ kích hoạt Flash Sale local (từ trang /offers) nếu user đã vào /offers trong phiên này
      const hasVisitedOffers = sessionStorage.getItem('curator-offers-visited') === 'true';
      const localEndTime = localStorage.getItem('curator-flash-sale-end');
      const localIds = JSON.parse(localStorage.getItem('curator-flash-sale-ids') || '[]');
      if (hasVisitedOffers && localEndTime && Number(localEndTime) > Date.now()) {
        setFlashSaleData({ isActive: true, endTime: Number(localEndTime), ids: localIds, discount: 20 });
      }
    };
    fetchFlashSale();

    // Lắng nghe sự kiện để giỏ hàng cập nhật ngay lập tức khi Offers.jsx tạo đợt Flash Sale mới
    const handleLocalFlashSale = () => {
      const localEndTime = localStorage.getItem('curator-flash-sale-end');
      const localIds = JSON.parse(localStorage.getItem('curator-flash-sale-ids') || '[]');
      if (localEndTime && localIds.length > 0 && Number(localEndTime) > Date.now()) {
        setFlashSaleData({ isActive: true, endTime: Number(localEndTime), ids: localIds, discount: 20 });
      }
    };
    window.addEventListener('localFlashSaleStarted', handleLocalFlashSale);
    return () => window.removeEventListener('localFlashSaleStarted', handleLocalFlashSale);
  }, []);

  // Tự động kiểm tra và kết thúc Flash Sale theo thời gian thực
  useEffect(() => {
    if (flashSaleData.isActive && flashSaleData.endTime) {
      const timeRemaining = flashSaleData.endTime - Date.now();

      if (timeRemaining > 0) {
        const timer = setTimeout(() => {
          setFlashSaleData({ isActive: false, endTime: null });
          // Xóa cờ phiên khi flash sale hết hạn — buộc user phải vào lại /offers mới có Flash Sale
          sessionStorage.removeItem('curator-offers-visited');
          toast('Chương trình Giảm giá sốc đã kết thúc. Giá sản phẩm trong giỏ hàng đã trở về giá gốc!', { icon: '⏰' });
        }, timeRemaining);

        return () => clearTimeout(timer);
      } else {
        setFlashSaleData({ isActive: false, endTime: null });
        sessionStorage.removeItem('curator-offers-visited');
      }
    }
  }, [flashSaleData.isActive, flashSaleData.endTime]);

  // Hàm để fetch giỏ hàng từ server
  const fetchServerCart = useCallback(async () => {
    if (!user) return; // Chỉ fetch nếu người dùng đã đăng nhập

    setIsCartLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        // Nếu không có token, có thể người dùng đã đăng xuất hoặc token hết hạn
        // Xóa giỏ hàng cục bộ và không làm gì thêm
        setCartItems([]);
        localStorage.removeItem('aura-k-cart');
        return;
      }

      const response = await fetch(`${apiUrl}/api/v1/cart`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setCartItems(result.data.items); // Cập nhật state giỏ hàng với dữ liệu từ server
        localStorage.removeItem('aura-k-cart'); // Xóa giỏ hàng cục bộ sau khi đã có giỏ hàng từ server
      } else {
        const errorResult = await response.json();
        console.error('Lỗi khi lấy giỏ hàng từ server:', errorResult.message);
        toast.error(errorResult.message || 'Không thể tải giỏ hàng từ server.');
        setCartItems([]); // Xóa giỏ hàng nếu có lỗi khi tải từ server
        localStorage.removeItem('aura-k-cart');
      }
    } catch (error) {
      console.error('Lỗi mạng khi lấy giỏ hàng từ server:', error);
      toast.error('Lỗi kết nối khi tải giỏ hàng.');
      setCartItems([]); // Xóa giỏ hàng nếu có lỗi mạng
      localStorage.removeItem('aura-k-cart');
    } finally {
      setIsCartLoading(false);
    }
  }, [user]);

  // Hàm lấy danh sách mã giảm giá công khai và mã dành riêng cho user
  const fetchAvailableVouchers = useCallback(async () => {
    setIsVouchersLoading(true);
    try {
      const token = localStorage.getItem('token');
      // BẢN VÁ: Đồng bộ endpoint với route hoạt động trên server (khớp với trang Vouchers.jsx)
      const response = await fetch(`${apiUrl}/api/v1/admin/public-vouchers`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
      });

      if (!response.ok) {
        throw new Error(`Lỗi Server: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setAvailableVouchers(result.data);
      }
    } catch (error) {
      console.error("Lỗi khi tải mã giảm giá:", error);
    } finally {
      setIsVouchersLoading(false);
    }
  }, [apiUrl]);

  // Tự động tải lại voucher khi mount hoặc khi user thay đổi (đăng nhập/đăng xuất)
  useEffect(() => {
    fetchAvailableVouchers();
  }, [fetchAvailableVouchers, user]);

  // useEffect để lắng nghe sự thay đổi của user
  useEffect(() => {
    if (user) {
      // Nếu người dùng đăng nhập, fetch giỏ hàng từ server
      fetchServerCart();
    } else {
      // Nếu người dùng đăng xuất, tải lại giỏ hàng từ localStorage (nếu có)
      // hoặc để trống nếu localStorage cũng trống.
      // Logic này đã được xử lý bởi useState initializer và useEffect bên dưới
      // nhưng ta có thể đảm bảo rằng giỏ hàng cục bộ được ưu tiên khi không có user
      try {
        const localData = localStorage.getItem('aura-k-cart');
        setCartItems(localData ? JSON.parse(localData) : []);
      } catch (error) {
        console.error("Lỗi khi đọc dữ liệu giỏ hàng từ localStorage sau khi đăng xuất", error);
        setCartItems([]);
      }
    }
  }, [user, fetchServerCart]); // Thêm fetchServerCart vào dependency array

  // Tự động lưu giỏ hàng vào localStorage mỗi khi có thay đổi
  // CHỈ KHI người dùng CHƯA đăng nhập.
  useEffect(() => {
    if (!user) {
      localStorage.setItem('aura-k-cart', JSON.stringify(cartItems));
    }
  }, [cartItems, user]);

  // Hàm thêm sản phẩm vào giỏ hàng
  const addToCart = async (productToAdd) => {
    if (user) {
      // Nếu đã đăng nhập, gọi API thêm vào giỏ hàng trên server
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${apiUrl}/api/v1/cart`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            productId: productToAdd.id, // ID của sản phẩm
            quantity: productToAdd.quantity,
            size: productToAdd.size,
            color: productToAdd.color,
          }),
        });

        if (response.ok) {
          toast.success(`Đã thêm "${productToAdd.name}" vào giỏ hàng.`);
          fetchServerCart(); // Cập nhật lại giỏ hàng từ server
        } else {
          const errorResult = await response.json();
          toast.error(errorResult.message || 'Không thể thêm sản phẩm vào giỏ hàng.');
        }
      } catch (error) {
        console.error('Lỗi mạng khi thêm sản phẩm vào giỏ hàng:', error);
        toast.error('Lỗi kết nối khi thêm sản phẩm vào giỏ hàng.');
      }
    } else {
      // Nếu chưa đăng nhập, sử dụng logic localStorage
      setCartItems(prevItems => {
        // So sánh an toàn: Chuyển tất cả về String và xóa khoảng trắng để tránh lỗi khác kiểu dữ liệu (vd: 1 !== "1")
        const existingItem = prevItems.find(item =>
          String(item.id) === String(productToAdd.id) &&
          String(item.size || '').trim() === String(productToAdd.size || '').trim() &&
          String(item.color || '').trim() === String(productToAdd.color || '').trim()
        );
        if (existingItem) {
          const newQty = existingItem.quantity + productToAdd.quantity;
          if (productToAdd.stock_quantity !== undefined && newQty > productToAdd.stock_quantity) {
            toast.error(`Chỉ còn ${productToAdd.stock_quantity} sản phẩm trong kho!`);
            return prevItems;
          }
          toast.success((t_obj) => (
            <div className="flex items-center gap-2">
              <span className="flex-1">Đã cập nhật số lượng cho "{productToAdd.name}"</span>
              <button onClick={() => toast.dismiss(t_obj.id)} className="shrink-0 p-1 hover:bg-black/5 rounded-full transition-colors">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          ));
          return prevItems.map(item =>
            (String(item.id) === String(productToAdd.id) && String(item.size || '').trim() === String(productToAdd.size || '').trim() && String(item.color || '').trim() === String(productToAdd.color || '').trim())
              ? { ...item, quantity: newQty }
              : item
          );
        } else {
          if (productToAdd.stock_quantity !== undefined && productToAdd.quantity > productToAdd.stock_quantity) {
            toast.error(`Chỉ còn ${productToAdd.stock_quantity} sản phẩm trong kho!`);
            return prevItems;
          }
          toast.success((t) => (
            <div className="flex items-center gap-2">
              <span className="flex-1 w-full">Đã thêm "{productToAdd.name}" vào giỏ hàng</span>
              <button onClick={() => toast.dismiss(t.id)} className="shrink-0 p-1 hover:bg-black/5 rounded-full transition-colors">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          ));
          // Khi thêm vào localStorage, cần một cartItemId tạm thời để quản lý trên frontend
          // Có thể dùng một UUID hoặc kết hợp product.id và size
          return [...prevItems, { ...productToAdd, cartItemId: `${productToAdd.id}-${productToAdd.size || 'nosize'}-${Date.now()}` }];
        }
      });
    }
  };

  // Hàm xóa sản phẩm khỏi giỏ hàng
  const removeFromCart = async (cartItemId) => {
    if (user) {
      // Nếu đã đăng nhập, gọi API xóa khỏi giỏ hàng trên server
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${apiUrl}/api/v1/cart/${cartItemId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          toast.success((t) => (
            <div className="flex items-center gap-2">
              <span className="flex-1">Đã xóa sản phẩm khỏi giỏ hàng.</span>
              <button onClick={() => toast.dismiss(t.id)} className="shrink-0 p-1 hover:bg-black/5 rounded-full transition-colors">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          ), { icon: '🗑️' });
          fetchServerCart(); // Cập nhật lại giỏ hàng từ server
        } else {
          const errorResult = await response.json();
          toast.error(errorResult.message || 'Không thể xóa sản phẩm khỏi giỏ hàng.');
        }
      } catch (error) {
        console.error('Lỗi mạng khi xóa sản phẩm khỏi giỏ hàng:', error);
        toast.error('Lỗi kết nối khi xóa sản phẩm khỏi giỏ hàng.');
      }
    } else {
      // Nếu chưa đăng nhập, sử dụng logic localStorage
      setCartItems(prevItems => prevItems.filter(item => item.cartItemId !== cartItemId));
      toast.success((t) => (
        <div className="flex items-center gap-2">
          <span className="flex-1">Đã xóa sản phẩm khỏi giỏ hàng.</span>
          <button onClick={() => toast.dismiss(t.id)} className="shrink-0 p-1 hover:bg-black/5 rounded-full transition-colors">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      ), { icon: '🗑️' });
    }
  };

  // Hàm cập nhật số lượng sản phẩm trong giỏ hàng
  const updateQuantity = async (cartItemId, newQuantity) => {
    if (newQuantity < 1) {
      // Nếu số lượng là 0 hoặc âm, xóa sản phẩm khỏi giỏ hàng
      removeFromCart(cartItemId);
      return;
    }

    // Kiểm tra giới hạn tồn kho (nếu có thông tin stock_quantity trong cartItems)
    const itemToUpdate = cartItems.find(item => item.cartItemId === cartItemId);
    if (itemToUpdate && itemToUpdate.stock_quantity !== undefined) {
      if (newQuantity > itemToUpdate.stock_quantity) {
        toast.error(`Sản phẩm chỉ còn ${itemToUpdate.stock_quantity} trong kho.`);
        return;
      }
    }

    if (user) {
      // Nếu đã đăng nhập, gọi API cập nhật số lượng trên server
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${apiUrl}/api/v1/cart/${cartItemId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ quantity: newQuantity }),
        });

        if (response.ok) {
          toast.success(`Đã cập nhật số lượng.`);
          fetchServerCart(); // Cập nhật lại giỏ hàng từ server
        } else {
          const errorResult = await response.json();
          toast.error(errorResult.message || 'Không thể cập nhật số lượng sản phẩm.');
        }
      } catch (error) {
        console.error('Lỗi mạng khi cập nhật số lượng:', error);
        toast.error('Lỗi kết nối khi cập nhật số lượng.');
      }
    } else {
      // Nếu chưa đăng nhập, sử dụng logic localStorage
      setCartItems(prevItems =>
        prevItems.map(item =>
          item.cartItemId === cartItemId ? { ...item, quantity: newQuantity } : item
        )
      );
      toast.success(`Đã cập nhật số lượng.`);
    }
  };

  // Hàm xóa toàn bộ giỏ hàng
  const clearCart = async () => {
    if (user) {
      try {
        const token = localStorage.getItem('token');
        await fetch(`${apiUrl}/api/v1/cart`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        });
      } catch (error) {
        console.error('Lỗi khi xóa giỏ hàng trên server:', error);
      }
    }
    setCartItems([]);
    localStorage.removeItem('aura-k-cart'); // Đảm bảo localStorage cũng được xóa
    toast.success('Giỏ hàng đã được xóa.');
  };

  // Tính tổng số lượng sản phẩm trong giỏ hàng
  const totalQuantity = cartItems.reduce((total, item) => total + (item.quantity || 0), 0);

  // Hàm lưu voucher vào giỏ hàng (Context + LocalStorage)
  const applyVoucher = (code) => {
    setAppliedVoucher(code);
    localStorage.setItem('aura-k-applied-voucher', code);
  };

  // Hàm gỡ bỏ voucher khỏi giỏ hàng
  const removeVoucher = () => {
    setAppliedVoucher(null);
    localStorage.removeItem('aura-k-applied-voucher');
  };

  // Tự động áp dụng giảm giá % NẾU CÓ CHƯƠNG TRÌNH FLASH SALE
  const processedCartItems = useMemo(() => {
    const now = new Date().getTime();

    if (flashSaleData.isActive && flashSaleData.endTime > now) {
      const discount = Number(flashSaleData.discount) || 20;
      const discountFactor = (100 - discount) / 100;

      return cartItems.map(item => {
        // Kiểm tra xem sản phẩm có nằm trong danh sách flash sale không
        const isProductInFlashSale = flashSaleData.ids && flashSaleData.ids.length > 0
          ? flashSaleData.ids.map(Number).includes(Number(item.id))
          : true; // Nếu không có ids (global sale), áp dụng cho toàn bộ

        if (isProductInFlashSale) {
          return {
            ...item,
            originalPrice: item.price,
            price: item.price * discountFactor,
            isFlashSale: true,
            flashSaleDiscount: discount
          };
        }
        return item;
      });
    }

    // Nếu hết giờ hoặc chưa có Flash Sale, trả về giá gốc bình thường
    return cartItems;
  }, [cartItems, flashSaleData]);

  return (
    <CartContext.Provider value={{
      cartItems: processedCartItems,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      isCartLoading,
      totalQuantity,
      appliedVoucher,
      applyVoucher,
      removeVoucher,
      flashSaleData,
      availableVouchers,
      isVouchersLoading,
      fetchAvailableVouchers
    }}>
      {children}
    </CartContext.Provider>
  );
};