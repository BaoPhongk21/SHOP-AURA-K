import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const AdminRoute = () => {
  const { user } = useContext(AuthContext);

  // Nếu chưa có thông tin người dùng (chưa đăng nhập), chuyển hướng về trang login.
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Kiểm tra role thuần túy
  const userRole = user?.role ? String(user.role).toLowerCase().trim() : '';
  const isStaffOrAdmin = userRole === 'admin' || userRole === 'staff' || userRole === 'nhân viên';

  if (!isStaffOrAdmin) {
    return <Navigate to="/" replace />;
  }

  // Nếu đã đăng nhập và là admin, cho phép truy cập vào các route con.
  return <Outlet />;
};

export default AdminRoute;