import React, { useContext } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const PrivateRoute = () => {
  const { user } = useContext(AuthContext); // Lấy thông tin người dùng từ AuthContext
  const location = useLocation(); // Lấy đối tượng location hiện tại

  // Nếu người dùng đã đăng nhập (user tồn tại), cho phép truy cập vào các route con
  if (user) {
    return <Outlet />;
  }

  // Nếu người dùng chưa đăng nhập, chuyển hướng về trang login
  // và truyền state 'from' để sau khi đăng nhập thành công, có thể quay lại trang này
  return <Navigate to="/login" state={{ from: location }} replace />;
};

export default PrivateRoute;