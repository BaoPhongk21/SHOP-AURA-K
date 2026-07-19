import axios from 'axios';
import { API_BASE_URL } from '../config/api.config';

const axiosClient = axios.create({
  baseURL: API_BASE_URL ? `${API_BASE_URL}/api/v1` : '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Thêm interceptor để tự động chèn token vào request
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Thêm interceptor để xử lý lỗi response (ví dụ 401 Unauthorized)
axiosClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    const hasAuthToken = Boolean(localStorage.getItem('token')) || Boolean(error?.config?.headers?.Authorization);
    if (error.response && error.response.status === 401 && hasAuthToken) {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      window.location.assign('/?session_expired=true');
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
