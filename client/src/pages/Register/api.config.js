import { API_BASE_URL as COMMON_API_BASE_URL } from '../../config/api.config';
export const API_BASE_URL = COMMON_API_BASE_URL;


/**
 * Hàm hỗ trợ lấy URL ảnh đầy đủ.
 * Tránh lỗi Mixed Content bằng cách tự động nhận diện đường dẫn tương đối.
 */
export const getImageUrl = (path) => {
    if (!path) return '';
    if (typeof path !== 'string') return path;

    // Nếu đã là URL tuyệt đối thì trả về luôn
    if (path.startsWith('http://') || path.startsWith('https://')) return path;

    let cleanPath = path.trim();

    // Xử lý các tiền tố cũ nếu có
    cleanPath = cleanPath.replace(/^\/?public\//, '/');

    // Đảm bảo path bắt đầu bằng /
    if (!cleanPath.startsWith('/')) cleanPath = '/' + cleanPath;

    // Nếu path bắt đầu bằng /images/ hoặc /videos/ thì đây là static asset từ thư mục public
    // Không cần nối với API_BASE_URL, trả về trực tiếp
    if (cleanPath.startsWith('/images/') || cleanPath.startsWith('/videos/')) {
        return cleanPath;
    }

    return `${API_BASE_URL}${cleanPath}`;
};