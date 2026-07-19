import { useState, useEffect } from 'react';

/**
 * Custom hook giúp trì hoãn việc cập nhật một giá trị trong một khoảng thời gian nhất định (delay).
 * Thường được sử dụng trong tính năng tìm kiếm (search) để tránh gọi API liên tục mỗi khi người dùng gõ phím.
 */
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;