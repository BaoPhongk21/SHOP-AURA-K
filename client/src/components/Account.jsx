import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import AccountSidebar from './AccountSidebar';

const Account = () => {
  const { user } = useContext(AuthContext);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="bg-surface text-on-surface min-h-screen">
      <main className="pt-28 md:pt-32 pb-24">
        <div className="max-w-screen-xl mx-auto px-6 md:px-12 flex flex-col md:flex-row gap-8">
          {/* Gọi Component Sidebar chung ra đây */}
          <AccountSidebar />
          
          {/* Nội dung bên phải (Thông tin hồ sơ) */}
          <div className="flex-1 bg-surface-container-lowest rounded-md shadow-sm border border-outline-variant/10 p-6 md:p-8">
            <h2 className="text-2xl font-bold font-headline text-primary mb-6">Hồ sơ của tôi</h2>
            <p className="text-on-surface-variant text-lg">Chào mừng, <strong>{user.first_name || user.username}</strong>!</p>
            {/* Sau này bạn có thể thêm Form cập nhật thông tin người dùng ở đây */}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Account;