const BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:5000') + '/api/v1';

/**
 * Một hàm fetch tùy chỉnh để tự động đính kèm token vào header.
 * @param {string} endpoint - Đường dẫn API (ví dụ: '/orders').
 * @param {object} options - Các tùy chọn của fetch (method, body, headers...).
 * @returns {Promise<Response>}
 */
export const apiFetch = (endpoint, options = {}) => {
  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Nếu có token, đính kèm vào header Authorization
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
};