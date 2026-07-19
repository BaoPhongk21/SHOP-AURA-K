/**
 * Middleware kiểm tra quyền truy cập dựa trên mảng vai trò (Role)
 * Yêu cầu: Phải chạy sau middleware xác thực Token (verifyToken) để có req.user
 */
const authorize = (allowedRoles) => {
  return (req, res, next) => {
    // Giải định req.user đã được gán bởi middleware giải mã JWT trước đó
    const userRole = req.user?.role;

    if (!userRole) {
      return res.status(403).json({ success: false, message: "Không tìm thấy thông tin quyền truy cập trong Token!" });
    }

    if (allowedRoles.includes(userRole)) {
      next(); // Quyền hợp lệ -> Cho phép đi tiếp vào Controller
    } else {
      res.status(403).json({ success: false, message: "Bạn không có quyền thực hiện hành động này!" });
    }
  };
};

module.exports = { authorize };