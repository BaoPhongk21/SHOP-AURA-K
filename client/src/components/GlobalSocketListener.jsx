import React, { useEffect, useContext, useRef } from 'react';
import { getSocket } from '../utils/socket';
import { AuthContext } from '../context/AuthContext';
import toast from 'react-hot-toast';

const GlobalSocketListener = () => {
  const { user } = useContext(AuthContext);
  const joinedRef = useRef(false);

  useEffect(() => {
    const socket = getSocket();

    // Chỉ join room 1 lần khi user thay đổi
    if (user && !joinedRef.current) {
      socket.emit('join_user_room', user.id);
      if (user.role === 'admin') {
        socket.emit('join_admin_room');
      }
      joinedRef.current = true;
    }

    // Admin updates
    socket.on('admin_order_updated', (data) => {
      if (user?.role === 'admin') {
        toast.success('Hệ thống có cập nhật mới. Đang tự động tải lại trang...', { id: 'global-admin-update' });
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    });

    // Customer updates
    socket.on('order_updated', (data) => {
      if (user && user.role !== 'admin' && user.role !== 'staff') {
        toast.success('Đơn hàng của bạn có cập nhật mới. Đang tự động tải lại trang...', { id: 'global-customer-update' });
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    });

    // Role & Permissions updates (For Staff)
    socket.on('permissions_updated', () => {
      if (user && user.role === 'staff') {
        toast.success('Quyền hạn của bạn vừa được Admin cập nhật. Hệ thống đang tải lại...', { id: 'global-permissions-update' });
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    });

    // Cleanup listeners only, don't disconnect socket
    return () => {
      socket.off('admin_order_updated');
      socket.off('order_updated');
      socket.off('permissions_updated');
    };
  }, [user]);

  return null;
};

export default GlobalSocketListener;
