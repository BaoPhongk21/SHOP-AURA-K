import React, { createContext, useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom'; // Tạm thời không dùng trực tiếp ở đây

export const AuthContext = createContext(null);

import { API_BASE_URL } from '../config/api.config';

export const AuthProvider = ({ children }) => {
  const clearAuthState = (options = {}) => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    setToken(null);

    if (options.redirect !== false) {
      const currentPath = window.location.pathname;
      const targetPath = currentPath === '/login' || currentPath === '/register' ? '/login' : '/?session_expired=true';
      window.location.assign(targetPath);
    }
  };

  // Khởi tạo state ĐỒNG BỘ từ localStorage để không bị "chớp" trang đăng nhập khi F5
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    try {
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (e) {
      console.error("Lỗi khi đọc dữ liệu người dùng từ localStorage", e);
      localStorage.removeItem('user');
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('token'));

  // Hàm cập nhật thông tin user đang đăng nhập hiện tại
  // - Nếu `replacedUser` được truyền: thay thế toàn bộ user (dùng cho phản hồi đầy đủ từ API /auth/me hoặc cập nhật profile)
  // - Nếu chỉ truyền các field: merge vào user hiện tại (dùng cho cập nhật một phần như địa chỉ, điện thoại)
  const updateUser = (updates = {}, { replace = false } = {}) => {
    const baseUser = replace ? {} : (user || {});
    const newUser = { ...baseUser, ...updates };
    localStorage.setItem('user', JSON.stringify(newUser));
    setUser(newUser);
  };

  const login = (userData, userToken) => {
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', userToken);
    setUser(userData);
    setToken(userToken);
  };

  const logout = () => {
    clearAuthState();
  };

  // ĐOẠN MÃ MỚI: Global Fetch Interceptor (Bắt lỗi 401 toàn cục)
  useEffect(() => {
    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      try {
        const input = args[0];
        const init = args[1] || {};

        // Extract URL and headers whether input is a Request or string
        const url = (typeof input === 'string') ? input : input.url;
        const headersFromRequest = (typeof input === 'object' && input.headers) ? input.headers : init.headers;

        // Only intercept API calls to our backend to avoid breaking third-party requests
        const apiBase = API_BASE_URL || '';
        const isApiCall = url && (url.startsWith(apiBase) || url.startsWith('/api/v1') || (apiBase && url.includes('/api/v1')));
        if (!isApiCall) {
          return originalFetch(...args);
        }

        const headers = headersFromRequest;
        const hasAuthHeader =
          (headers && typeof headers === 'object' && ('Authorization' in headers || 'authorization' in headers)) ||
          (typeof Headers !== 'undefined' && headers instanceof Headers && (headers.has('Authorization') || headers.has('authorization')));

        const response = await originalFetch(...args);

        if (response && response.status === 401 && hasAuthHeader) {
          console.warn('Cảnh báo 401: Phiên đăng nhập đã hết hạn. Hệ thống tự động đăng xuất để bảo mật...');
          clearAuthState({ redirect: true });
        }

        return response;
      } catch (err) {
        return originalFetch(...args);
      }
    };

    return () => {
      window.fetch = originalFetch; // Phục hồi hàm fetch gốc nếu component bị unmount
    };
  }, []);

  useEffect(() => {
    const validateStoredSession = async () => {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) return;

      try {
        const response = await fetch(`${API_BASE_URL || ''}/api/v1/auth/me`, {
          headers: { Authorization: `Bearer ${storedToken}` }
        });

        if (response.status === 401 || response.status === 403) {
          clearAuthState({ redirect: true });
          return;
        }

        if (!response.ok) return;

        const result = await response.json();
        if (result?.success && result?.data?.user) {
          localStorage.setItem('user', JSON.stringify(result.data.user));
          setUser(result.data.user);
        } else {
          clearAuthState({ redirect: true });
        }
      } catch (error) {
        console.error('Lỗi khi xác thực phiên đăng nhập:', error);
      }
    };

    validateStoredSession();
  }, []);

  // Kiểm tra phân quyền định kỳ (Polling) để tự động khóa/mở tính năng
  useEffect(() => {
    if (!user || user.role === 'customer') return;

    const fetchUpdatedPermissions = async () => {
      // Chỉ fetch nếu tab trình duyệt đang mở và được focus
      if (document.hidden) return;

      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`${API_BASE_URL || ''}/api/v1/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        const result = await response.json();
        if (result.success && result.data.user) {
          const freshUser = result.data.user;
          const currentSnapshot = JSON.stringify({ role: user.role, permissions: user.permissions || {} });
          const newSnapshot = JSON.stringify({ role: freshUser.role, permissions: freshUser.permissions || {} });
          if (currentSnapshot !== newSnapshot) {
            localStorage.setItem('user', JSON.stringify(freshUser));
            setUser(freshUser);
          }
        }
      } catch (error) { console.error('Lỗi khi kiểm tra phân quyền:', error); }
    };

    const intervalId = setInterval(fetchUpdatedPermissions, 60000);
    return () => clearInterval(intervalId);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};