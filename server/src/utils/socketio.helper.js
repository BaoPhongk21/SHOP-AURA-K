/**
 * Realtime emit helper (graceful no-op when Socket.IO is unavailable).
 * Sau khi chuyển sang Vercel serverless, Socket.IO không hoạt động.
 * Code cũ gọi `req.app.get('socketio')?.emit(...)` - giờ tất cả các emit
 * đều trở thành no-op thông qua helper này để không phải sửa từng controller.
 */
const safeEmit = (req, ...args) => {
  try {
    const io = req.app.get && req.app.get('socketio');
    if (io && typeof io.emit === 'function') {
      return io.emit(...args);
    }
  } catch {
    // ignore
  }
};

const safeEmitTo = (req, room, ...args) => {
  try {
    const io = req.app.get && req.app.get('socketio');
    if (io && typeof io.to === 'function') {
      return io.to(room).emit(...args);
    }
  } catch {
    // ignore
  }
};

module.exports = { safeEmit, safeEmitTo };
