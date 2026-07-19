import { io } from 'socket.io-client';
import { API_BASE_URL } from '../config/api.config';

let socketInstance = null;

export const getSocket = () => {
  if (!socketInstance) {
    socketInstance = io(API_BASE_URL, { 
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
  }
  return socketInstance;
};

export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};
