import { API_BASE_URL } from '../../config/api.config';

const BASE_URL = `${API_BASE_URL}/api/v1`;

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