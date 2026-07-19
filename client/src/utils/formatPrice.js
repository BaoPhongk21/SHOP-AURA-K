/**
 * Format giá tiền theo locale Việt Nam
 * @param {number|string} price - Giá cần format
 * @param {boolean} showCurrency - Hiển thị ký hiệu tiền tệ (đ) hay không
 * @returns {string} Giá đã được format
 */
export const formatPrice = (price, showCurrency = true) => {
  // Xử lý các trường hợp đặc biệt
  if (price === null || price === undefined || price === '') {
    return showCurrency ? '0đ' : '0';
  }

  // Chuyển sang number
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;

  // Kiểm tra NaN
  if (isNaN(numPrice)) {
    return showCurrency ? '0đ' : '0';
  }

  // Format với locale vi-VN
  const formatted = Math.round(numPrice).toLocaleString('vi-VN');
  
  return showCurrency ? `${formatted}đ` : formatted;
};

/**
 * Format giá với ký hiệu tiền tệ tùy chỉnh
 */
export const formatCurrency = (price, currency = 'VND') => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  
  if (isNaN(numPrice)) return '0 VND';

  const formatted = Math.round(numPrice).toLocaleString('vi-VN');
  
  switch (currency) {
    case 'VND':
      return `${formatted}đ`;
    case 'USD':
      return `$${formatted}`;
    default:
      return `${formatted} ${currency}`;
  }
};

/**
 * Parse giá từ string có format về number
 */
export const parsePrice = (priceString) => {
  if (typeof priceString === 'number') return priceString;
  if (!priceString) return 0;
  
  // Remove all non-numeric characters except dot and comma
  const cleaned = String(priceString).replace(/[^\d.,]/g, '');
  const number = parseFloat(cleaned.replace(/,/g, ''));
  
  return isNaN(number) ? 0 : number;
};

/**
 * Kiểm tra giá có hợp lệ không
 */
export const isValidPrice = (price) => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return !isNaN(numPrice) && numPrice >= 0;
};

export default formatPrice;
