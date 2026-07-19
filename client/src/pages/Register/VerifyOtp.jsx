import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { useLanguage } from '../../context/LanguageContext';
import { API_BASE_URL } from '../../config/api.config';

const VerifyOtp = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { language } = useLanguage();
    const email = location.state?.email;

    const [otp, setOtp] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [countdown, setCountdown] = useState(60);

    // Nếu vào trang này mà không có email (truy cập trực tiếp), đẩy về trang đăng ký
    useEffect(() => {
        if (!email) {
            navigate('/register');
        }
    }, [email, navigate]);

    // Bộ đếm ngược 60 giây
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    const handleVerify = async (e) => {
        e.preventDefault();
        if (otp.length !== 6) {
            toast.error(language === 'vi' ? 'Vui lòng nhập đủ 6 chữ số.' : 'Please enter 6 digits.');
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/auth/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp }),
            });

            const result = await response.json();
            if (result.success) {
                toast.success(language === 'vi' ? 'Xác thực thành công! Đang chuyển hướng...' : 'Verified! Redirecting...');
                setTimeout(() => navigate('/login', { state: { identifier: email } }), 2000);
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            toast.error(language === 'vi' ? 'Lỗi kết nối máy chủ.' : 'Connection error.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-surface flex items-center justify-center px-4 py-10 md:py-20">
            <Toaster position="top-center" />
            <div className="max-w-md w-full bg-surface-container-lowest p-6 sm:p-8 rounded-3xl border border-black shadow-sm text-center">
                <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="material-symbols-outlined text-3xl">mark_email_read</span>
                </div>

                <h1 className="text-2xl font-black font-headline mb-2 uppercase tracking-tight">Xác nhận Gmail</h1>
                <p className="text-on-surface-variant text-sm mb-8 leading-relaxed">
                    Mã xác nhận 6 số đã được gửi tới hòm thư:<br />
                    <strong className="text-on-surface break-all">{email}</strong>
                </p>

                <form onSubmit={handleVerify} className="space-y-6">
                    <input
                        type="text"
                        maxLength="6"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="••••••"
                        className="w-full text-center text-2xl sm:text-3xl font-bold tracking-[0.5em] py-4 bg-surface-container-high border border-outline-variant/40 rounded-2xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                        required
                        autoFocus
                    />

                    <button
                        type="submit"
                        disabled={isLoading || otp.length < 6}
                        className="w-full py-4 bg-black text-white font-bold rounded-2xl shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Đang kiểm tra...' : 'Xác nhận đăng ký'}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-outline-variant/20">
                    {countdown > 0 ? (
                        <p className="text-xs text-on-surface-variant font-medium">
                            Gửi lại mã sau <span className="text-primary font-bold">{countdown}s</span>
                        </p>
                    ) : (
                        <button
                            onClick={() => { setCountdown(60); toast.success('Đã gửi lại mã mới!'); }}
                            className="text-sm font-bold text-primary hover:underline"
                        >
                            Gửi lại mã xác nhận
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VerifyOtp;