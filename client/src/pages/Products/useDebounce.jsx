import { useState, useEffect } from 'react';

export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Thiết lập một bộ đếm thời gian để cập nhật giá trị sau một khoảng delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Xóa bộ đếm thời gian nếu value thay đổi trước khi delay kết thúc (tức là người dùng vẫn đang gõ)
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]); // Chỉ chạy lại effect khi value hoặc delay thay đổi

  return debouncedValue;
};