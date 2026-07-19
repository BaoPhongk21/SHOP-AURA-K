import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { useGoogleLogin } from '@react-oauth/google';
import { AuthContext } from '../../context/AuthContext';
import { CartContext } from '../../context/CartContext';
import FacebookLogin from '@greatsumini/react-facebook-login';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { useLanguage } from '../../context/LanguageContext';

import { API_BASE_URL } from '../../config/api.config';

const Login = () => {
  const location = useLocation();
  const { t, language } = useLanguage();
  const [identifier, setIdentifier] = useState(location.state?.identifier || location.state?.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const { cartItems, clearCart } = useContext(CartContext);

  // State cho Modal Quên Mật Khẩu
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotMethod, setForgotMethod] = useState('email');
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmNewPwd, setConfirmNewPwd] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmNewPwd, setShowConfirmNewPwd] = useState(false);

  // State cho Modal Khóa Khẩn Cấp
  const [showLockModal, setShowLockModal] = useState(false);
  const [lockToken, setLockToken] = useState('');
  const [lockPassword, setLockPassword] = useState('');
  const [showLockPwd, setShowLockPwd] = useState(false);
  const [lockLoading, setLockLoading] = useState(false);
  const [lockError, setLockError] = useState('');

  useEffect(() => {
    if (window.performance && window.performance.navigation.type !== 1) {
      window.scrollTo(0, 0);
    }
    AOS.init({ duration: 200, once: true, easing: 'ease-out-cubic', offset: 50 });

    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('action') === 'forgot_password') {
      setShowForgotModal(true);
      const emailParams = searchParams.get('email');
      if (emailParams) setForgotIdentifier(emailParams);
    } else if (searchParams.get('action') === 'emergency_lock') {
      const token = searchParams.get('token');
      if (token) {
        setLockToken(token);
        setShowLockModal(true);
      }
    }
  }, [location.search]);

  // Load saved credentials from localStorage (Remember Me)
  useEffect(() => {
    const saved = localStorage.getItem('aura-k-remember');
    if (saved) {
      try {
        const { identifier: savedId } = JSON.parse(saved);
        if (savedId) setIdentifier(savedId);
        setRememberMe(true);
      } catch (e) { localStorage.removeItem('aura-k-remember'); }
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const from = location.state?.from?.pathname || '/';
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const result = await response.json();
      if (result.success) {
        // Save only the identifier; do not store password in localStorage
        if (rememberMe) {
          localStorage.setItem('aura-k-remember', JSON.stringify({ identifier }));
        } else {
          localStorage.removeItem('aura-k-remember');
        }
        toast.success(language === 'vi' ? 'Đăng nhập thành công!' : 'Logged in successfully!');
        login(result.data.user, result.data.token);
        if (cartItems.length > 0) {
          try {
            const mergeResponse = await fetch(`${API_BASE_URL}/api/v1/cart/merge`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${result.data.token}` },
              body: JSON.stringify({ cartItems: cartItems }),
            });
            if (mergeResponse.ok) {
              clearCart();
              toast.success(language === 'vi' ? 'Giỏ hàng đã được đồng bộ.' : 'Cart synced to your account.');
            }
          } catch (mergeError) { console.error('Lỗi khi đồng bộ giỏ hàng:', mergeError); }
        }
        const userRole = result.data.user?.role ? String(result.data.user.role).toLowerCase().trim() : '';
        if (userRole === 'admin' || userRole === 'staff') navigate('/admin');
        else navigate(from);
      } else {
        setError(result.message || (language === 'vi' ? 'Email, Tên đăng nhập, SĐT hoặc mật khẩu không chính xác.' : 'Incorrect email, username, phone or password.'));
      }
    } catch (err) {
      setError(language === 'vi' ? 'Không thể kết nối đến server. Vui lòng thử lại sau.' : 'Unable to connect to the server. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: tokenResponse.access_token }),
        });
        const result = await res.json();
        if (result.success) {
          toast.success(language === 'vi' ? 'Đăng nhập bằng Google thành công!' : 'Google sign-in successful!');
          login(result.data.user, result.data.token);
          if (cartItems.length > 0) {
            try {
              await fetch(`${API_BASE_URL}/api/v1/cart/merge`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${result.data.token}` },
                body: JSON.stringify({ cartItems: cartItems }),
              });
              clearCart();
            } catch (mergeError) { console.error('Lỗi đồng bộ giỏ:', mergeError); }
          }
          const from = location.state?.from?.pathname || '/';
          navigate(from);
        } else {
          setError(result.message || (language === 'vi' ? 'Đăng nhập bằng Google thất bại.' : 'Google sign-in failed.'));
        }
      } catch (err) {
        setError(language === 'vi' ? 'Không thể kết nối đến server khi đăng nhập Google.' : 'Unable to connect to server during Google sign-in.');
      } finally {
        setIsLoading(false);
      }
    },
    onError: () => {
      setError(language === 'vi' ? 'Cửa sổ đăng nhập Google bị đóng hoặc xảy ra lỗi.' : 'Google sign-in window was closed or an error occurred.');
    },
  });

  const handleFacebookLoginSuccess = async (response) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/facebook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: response.accessToken }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success(language === 'vi' ? 'Đăng nhập bằng Facebook thành công!' : 'Facebook sign-in successful!');
        login(result.data.user, result.data.token);
        if (cartItems.length > 0) {
          try {
            await fetch(`${API_BASE_URL}/api/v1/cart/merge`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${result.data.token}` },
              body: JSON.stringify({ cartItems: cartItems }),
            });
            clearCart();
          } catch (mergeError) { console.error('Lỗi đồng bộ giỏ:', mergeError); }
        }
        const from = location.state?.from?.pathname || '/';
        navigate(from);
      } else {
        setError(result.message || (language === 'vi' ? 'Đăng nhập bằng Facebook thất bại.' : 'Facebook sign-in failed.'));
      }
    } catch (err) {
      setError(language === 'vi' ? 'Không thể kết nối đến server khi đăng nhập Facebook.' : 'Unable to connect to server during Facebook sign-in.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFacebookLoginFail = (error) => {
    setError(language === 'vi' ? 'Cửa sổ đăng nhập Facebook bị đóng hoặc xảy ra lỗi.' : 'Facebook sign-in window was closed or an error occurred.');
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: forgotIdentifier })
      });
      const data = await response.json();
      if (data.success) {
        toast.success(data.message);
        setForgotStep(2);
      } else {
        setForgotError(data.message);
      }
    } catch (err) {
      setForgotError(language === 'vi' ? 'Lỗi kết nối server.' : 'Server connection error.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    if (forgotOtp.length !== 6) {
      setForgotError(language === 'vi' ? 'Mã OTP phải gồm 6 chữ số.' : 'OTP code must be 6 digits.');
      return;
    }
    setForgotError('');
    setForgotStep(3);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setForgotError('');
    if (newPwd !== confirmNewPwd) {
      setForgotError(language === 'vi' ? 'Mật khẩu xác nhận không khớp.' : 'Confirm password does not match.');
      return;
    }
    if (newPwd.length < 8) {
      setForgotError(language === 'vi' ? 'Mật khẩu phải có ít nhất 8 ký tự.' : 'Password must be at least 8 characters.');
      return;
    }
    setForgotLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: forgotIdentifier, otp: forgotOtp, newPassword: newPwd })
      });
      const data = await response.json();
      if (data.success) {
        toast.success(data.message);
        closeForgotModal();
      } else {
        setForgotError(data.message);
      }
    } catch (err) {
      setForgotError(language === 'vi' ? 'Lỗi kết nối server.' : 'Server connection error.');
    } finally {
      setForgotLoading(false);
    }
  };

  const closeForgotModal = () => {
    setShowForgotModal(false);
    setForgotStep(1);
    setForgotIdentifier('');
    setForgotOtp('');
    setNewPwd('');
    setConfirmNewPwd('');
    setForgotError('');
    setShowNewPwd(false);
    setShowConfirmNewPwd(false);
  };

  const handleEmergencyLock = async (e) => {
    e.preventDefault();
    setLockError('');
    setLockLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/emergency-lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: lockToken, password: lockPassword })
      });
      const data = await response.json();
      if (data.success) {
        toast.success(data.message, { duration: 5000 });
        setShowLockModal(false);
        setLockPassword('');
      } else {
        setLockError(data.message);
      }
    } catch (err) {
      setLockError(language === 'vi' ? 'Lỗi kết nối server.' : 'Server connection error.');
    } finally {
      setLockLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f7f4] relative overflow-hidden py-8">
      <Toaster position="top-center" />

      {/* Subtle dot pattern */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'radial-gradient(#1a1a2e 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />

      <main
        className="w-full max-w-5xl mx-4 mt-[80px] grid grid-cols-1 lg:grid-cols-2 rounded-3xl overflow-hidden shadow-2xl border border-gray-100"
        data-aos="fade-up"
      >
        {/* ─── LEFT: Fashion Image ─── */}
        <div className="hidden lg:flex relative min-h-full flex-col">
          <img
            alt="Editorial fashion photography"
            className="absolute inset-0 w-full h-full object-cover object-center"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDmXDWvHcoNCIJ9NAZ1BInrTc_9rurn4Fr189tiGbgPO2Zk4QoTnDPIopJCU9eaBOI4V1_RWvMopF5o5-xN5mKxIu_6mFRo1-98_y7jB8AvglKKES1F0sTe_Ors9T7iSvBjL-VeVVMWjlhqyVBvZKyb_kjo0f5fOLBhQsSFZJVD4cBYsHYPTn7Z-y_JhfWXjCw6YdU2w63RmdnbyBZyPP5IpFPPiS4V_4-JlmGKeFSUSn8J4xrM_bGIPoQAA2qZhUSL9IQV3FvMCGc"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a2e]/70 via-[#1a1a2e]/20 to-transparent" />

          {/* Logo overlay */}
          <div className="absolute z-10 top-10 left-10">
            <span className="font-headline text-2xl font-black tracking-[0.25em] text-white uppercase">
              AURA.K
            </span>
            <div className="mt-1.5 h-[2.5px] w-10 bg-[#d4af37] rounded-full shadow-lg" />
          </div>

          {/* Quote overlay */}
          <div className="absolute z-10 bottom-12 left-10 right-10">
            <div className="w-8 h-[2.5px] bg-[#d4af37] mb-5 rounded-full shadow-lg" />
            <p className="font-headline text-[1.4rem] font-bold text-white leading-snug drop-shadow-md">
              {language === 'vi'
                ? '"Phong cách là cách bạn nói — không cần lời."'
                : '"Style is a way to say who you are without speaking."'}
            </p>
          </div>
        </div>

        {/* ─── RIGHT: Form ─── */}
        <div className="bg-white flex flex-col justify-center px-8 py-12 sm:px-12">

          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <Link to="/" className="inline-block">
              <span className="font-headline text-2xl font-black tracking-[0.25em] text-[#1a1a2e] uppercase">
                AURA.K
              </span>
              <div className="mx-auto mt-1.5 h-[2px] w-10 bg-[#d4af37] rounded-full" />
            </Link>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-[#d4af37] mb-2">
              {language === 'vi' ? 'Chào mừng trở lại' : 'Welcome Back'}
            </p>
            <h1 className="font-headline text-3xl font-black text-[#1a1a2e] tracking-tight">
              {language === 'vi' ? 'Đăng nhập' : 'Sign In'}
            </h1>
            <p className="text-gray-400 text-sm mt-2">
              {language === 'vi'
                ? 'Truy cập bộ sưu tập thời trang cao cấp của bạn.'
                : 'Access your exclusive fashion curations.'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Identifier */}
            <div className="space-y-1.5">
              <label
                className="block text-[11px] font-bold uppercase tracking-widest text-gray-400"
                htmlFor="identifier"
              >
                {language === 'vi' ? 'Email / Tên đăng nhập / SĐT' : 'Email / Username / Phone'}
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 text-[18px]">
                  person
                </span>
                <input
                  id="identifier"
                  name="identifier"
                  type="text"
                  placeholder={language === 'vi' ? 'Nhập email, username hoặc SĐT...' : 'Enter email, username or phone...'}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  className="w-full pl-11 pr-4 py-3.5 border border-gray-200 rounded-xl text-[#1a1a2e] text-sm bg-gray-50 outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20 focus:bg-white transition-all duration-200 placeholder:text-gray-300"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label
                  className="block text-[11px] font-bold uppercase tracking-widest text-gray-400"
                  htmlFor="password"
                >
                  {language === 'vi' ? 'Mật khẩu' : 'Password'}
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-[11px] font-bold text-[#d4af37] hover:text-[#b8952e] uppercase tracking-wider transition-colors"
                >
                  {language === 'vi' ? 'Quên mật khẩu?' : 'Forgot?'}
                </button>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 text-[18px]">
                  lock
                </span>
                <input
                  id="password"
                  name="password"
                  placeholder="••••••••"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-11 pr-12 py-3.5 border border-gray-200 rounded-xl text-[#1a1a2e] text-sm bg-gray-50 outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20 focus:bg-white transition-all duration-200 placeholder:text-gray-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-4 flex items-center text-gray-300 hover:text-[#d4af37] transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between">
              <label
                htmlFor="remember-me"
                className="flex items-center gap-2.5 cursor-pointer group select-none"
              >
                <div
                  className={`relative w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${
                    rememberMe
                      ? 'bg-[#1a1a2e] border-[#1a1a2e]'
                      : 'bg-white border-gray-300 group-hover:border-[#d4af37]'
                  }`}
                >
                  <input
                    id="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => {
                      setRememberMe(e.target.checked);
                      if (!e.target.checked) localStorage.removeItem('aura-k-remember');
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {rememberMe && (
                    <span className="material-symbols-outlined text-white text-[13px]" style={{ fontVariationSettings: "'FILL' 1, 'wght' 700" }}>check</span>
                  )}
                </div>
                <span className="text-sm text-gray-500 group-hover:text-gray-700 transition-colors">
                  {language === 'vi' ? 'Lưu mật khẩu' : 'Remember me'}
                </span>
              </label>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2.5 bg-red-50 border border-red-100 text-red-500 px-4 py-3 rounded-xl text-sm">
                <span className="material-symbols-outlined text-[18px] flex-shrink-0">error</span>
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl font-bold text-sm tracking-[0.15em] uppercase text-white transition-all duration-300 disabled:opacity-60 disabled:cursor-wait relative overflow-hidden group"
              style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #2d2d50 100%)' }}
            >
              <span className="relative z-10">
                {isLoading
                  ? (language === 'vi' ? 'Đang xử lý...' : 'Processing...')
                  : (language === 'vi' ? 'Đăng nhập' : 'Sign In')}
              </span>
              {/* Shine sweep */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-7">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-4 text-[11px] uppercase tracking-[0.2em] text-gray-300 font-semibold">
                {language === 'vi' ? 'Hoặc tiếp tục với' : 'Or continue with'}
              </span>
            </div>
          </div>

          {/* Social Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
                  toast.error(language === 'vi' ? 'Chưa tìm thấy VITE_GOOGLE_CLIENT_ID.' : 'VITE_GOOGLE_CLIENT_ID not found.');
                  return;
                }
                handleGoogleLogin();
              }}
              className="flex items-center justify-center gap-2.5 px-4 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700 transition-all duration-200"
            >
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google
            </button>

            <FacebookLogin
              appId={import.meta.env.VITE_FACEBOOK_APP_ID || ''}
              onSuccess={handleFacebookLoginSuccess}
              onFail={handleFacebookLoginFail}
              render={({ onClick }) => (
                <button
                  type="button"
                  onClick={() => { toast.error(language === 'vi' ? 'Hệ thống đang bảo trì' : 'System is under maintenance'); }}
                  className="flex items-center justify-center gap-2.5 px-4 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700 transition-all duration-200"
                >
                  <svg className="w-4 h-4 fill-[#1877F2] flex-shrink-0" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  Facebook
                </button>
              )}
            />
          </div>

          {/* Register link */}
          <p className="mt-8 text-center text-sm text-gray-400">
            {language === 'vi' ? 'Chưa có tài khoản?' : 'New here?'}{' '}
            <Link
              to="/register"
              className="font-bold text-[#1a1a2e] hover:text-[#d4af37] transition-colors"
            >
              {language === 'vi' ? 'Đăng ký ngay' : 'Register Now'}
            </Link>
          </p>
        </div>
      </main>

      {/* ══════════════════════════════════════════
          MODAL: Quên Mật Khẩu
      ══════════════════════════════════════════ */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            {/* Top accent bar */}
            <div className="h-1 w-full bg-gradient-to-r from-[#1a1a2e] via-[#d4af37] to-[#1a1a2e]" />
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#d4af37] mb-1">
                    {language === 'vi' ? 'Bảo mật tài khoản' : 'Account Security'}
                  </p>
                  <h2 className="font-headline text-2xl font-black text-[#1a1a2e]">
                    {language === 'vi' ? 'Khôi phục mật khẩu' : 'Reset Password'}
                  </h2>
                </div>
                <button
                  onClick={closeForgotModal}
                  className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>

              {forgotError && (
                <div className="flex items-center gap-2.5 bg-red-50 border border-red-100 text-red-500 px-4 py-3 rounded-xl text-sm mb-5">
                  <span className="material-symbols-outlined text-[18px] flex-shrink-0">error</span>
                  <span>{forgotError}</span>
                </div>
              )}

              {/* Step 1: Choose method & enter identifier */}
              {forgotStep === 1 && (
                <form onSubmit={handleRequestOtp} className="space-y-5">
                  <p className="text-sm text-gray-400">
                    {language === 'vi'
                      ? 'Chọn phương thức nhận mã OTP xác nhận.'
                      : 'Choose a method to receive your OTP verification code.'}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {['email', 'phone'].map((method) => (
                      <label
                        key={method}
                        className={`flex items-center justify-center gap-2 p-3.5 rounded-xl border-2 cursor-pointer transition-all text-sm font-bold ${
                          forgotMethod === method
                            ? 'border-[#d4af37] bg-[#d4af37]/5 text-[#1a1a2e]'
                            : 'border-gray-200 text-gray-400 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="method"
                          className="hidden"
                          checked={forgotMethod === method}
                          onChange={() => { setForgotMethod(method); setForgotIdentifier(''); setForgotError(''); }}
                        />
                        <span className="material-symbols-outlined text-[17px]">
                          {method === 'email' ? 'mail' : 'smartphone'}
                        </span>
                        {method === 'email' ? 'Email' : 'SMS'}
                      </label>
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400">
                      {forgotMethod === 'email'
                        ? (language === 'vi' ? 'Địa chỉ Email' : 'Email Address')
                        : (language === 'vi' ? 'Số điện thoại' : 'Phone Number')}
                    </label>
                    <input
                      type={forgotMethod === 'email' ? 'email' : 'tel'}
                      className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-[#1a1a2e] text-sm bg-gray-50 outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20 focus:bg-white transition-all placeholder:text-gray-300"
                      placeholder={
                        forgotMethod === 'email'
                          ? (language === 'vi' ? 'Nhập email...' : 'Enter email...')
                          : (language === 'vi' ? 'Nhập số điện thoại...' : 'Enter phone...')
                      }
                      value={forgotIdentifier}
                      onChange={(e) => setForgotIdentifier(e.target.value)}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={forgotLoading || !forgotIdentifier}
                    className="w-full py-3.5 rounded-xl font-bold text-sm tracking-[0.15em] uppercase text-white disabled:opacity-50 transition-all"
                    style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #2d2d50 100%)' }}
                  >
                    {forgotLoading
                      ? (language === 'vi' ? 'Đang gửi...' : 'Sending...')
                      : (language === 'vi' ? 'Gửi mã xác nhận' : 'Send Code')}
                  </button>
                </form>
              )}

              {/* Step 2: Enter OTP */}
              {forgotStep === 2 && (
                <form onSubmit={handleVerifyOtp} className="space-y-5">
                  <div className="text-center py-5 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">
                      {language === 'vi' ? 'Mã đã gửi đến' : 'Code sent to'}
                    </p>
                    <p className="font-bold text-[#1a1a2e] text-base">{forgotIdentifier}</p>
                  </div>
                  <input
                    type="text"
                    maxLength="6"
                    className="w-full text-center text-3xl font-black tracking-[0.5em] px-4 py-4 border-2 border-gray-200 rounded-xl text-[#1a1a2e] outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20 transition-all bg-gray-50 focus:bg-white"
                    placeholder="——————"
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value.replace(/[^0-9]/g, ''))}
                    required
                  />
                  <button
                    type="submit"
                    disabled={forgotOtp.length !== 6}
                    className="w-full py-3.5 rounded-xl font-bold text-sm tracking-[0.15em] uppercase text-white disabled:opacity-40 transition-all"
                    style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #2d2d50 100%)' }}
                  >
                    {language === 'vi' ? 'Tiếp tục' : 'Continue'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setForgotStep(1)}
                    className="w-full flex items-center justify-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors font-semibold"
                  >
                    <span className="material-symbols-outlined text-sm">arrow_back</span>
                    {language === 'vi' ? 'Quay lại' : 'Back'}
                  </button>
                </form>
              )}

              {/* Step 3: New password */}
              {forgotStep === 3 && (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <p className="text-sm text-gray-400 text-center">
                    {language === 'vi'
                      ? 'Tạo mật khẩu mới cho tài khoản của bạn.'
                      : 'Create a new password for your account.'}
                  </p>
                  {[
                    { id: 'newPwd', label: language === 'vi' ? 'Mật khẩu mới' : 'New Password', val: newPwd, setVal: setNewPwd, show: showNewPwd, setShow: setShowNewPwd },
                    { id: 'confirmNewPwd', label: language === 'vi' ? 'Xác nhận mật khẩu mới' : 'Confirm Password', val: confirmNewPwd, setVal: setConfirmNewPwd, show: showConfirmNewPwd, setShow: setShowConfirmNewPwd },
                  ].map((field) => (
                    <div key={field.id} className="space-y-1.5">
                      <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400">{field.label}</label>
                      <div className="relative">
                        <input
                          type={field.show ? 'text' : 'password'}
                          className="w-full pl-4 pr-12 py-3.5 border border-gray-200 rounded-xl text-[#1a1a2e] text-sm bg-gray-50 outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20 focus:bg-white transition-all placeholder:text-gray-300"
                          placeholder="••••••••"
                          value={field.val}
                          onChange={(e) => field.setVal(e.target.value)}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => field.setShow(!field.show)}
                          className="absolute inset-y-0 right-4 text-gray-300 hover:text-[#d4af37] transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {field.show ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    type="submit"
                    disabled={forgotLoading || !newPwd || !confirmNewPwd}
                    className="w-full py-3.5 rounded-xl font-bold text-sm tracking-[0.15em] uppercase text-white disabled:opacity-50 transition-all mt-2"
                    style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #2d2d50 100%)' }}
                  >
                    {forgotLoading
                      ? (language === 'vi' ? 'Đang cập nhật...' : 'Updating...')
                      : (language === 'vi' ? 'Cập nhật mật khẩu' : 'Update Password')}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          MODAL: Khóa Khẩn Cấp
      ══════════════════════════════════════════ */}
      {showLockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-red-600 to-red-400" />
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-red-500 mb-1">
                    {language === 'vi' ? 'Tình huống khẩn cấp' : 'Emergency'}
                  </p>
                  <h2 className="font-headline text-2xl font-black text-[#1a1a2e]">
                    {language === 'vi' ? 'Khóa tài khoản' : 'Lock Account'}
                  </h2>
                </div>
                <button
                  onClick={() => setShowLockModal(false)}
                  className="p-2 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>

              {lockError && (
                <div className="flex items-center gap-2.5 bg-red-50 border border-red-100 text-red-500 px-4 py-3 rounded-xl text-sm mb-5">
                  <span className="material-symbols-outlined text-[18px] flex-shrink-0">error</span>
                  <span>{lockError}</span>
                </div>
              )}

              <form onSubmit={handleEmergencyLock} className="space-y-5">
                <p className="text-sm text-gray-400">
                  {language === 'vi'
                    ? 'Nhập mật khẩu để xác nhận khóa khẩn cấp tài khoản của bạn.'
                    : 'Enter your password to confirm the emergency lock of your account.'}
                </p>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400">
                    {language === 'vi' ? 'Mật khẩu của bạn' : 'Your Password'}
                  </label>
                  <div className="relative">
                    <input
                      type={showLockPwd ? 'text' : 'password'}
                      className="w-full pl-4 pr-12 py-3.5 border border-gray-200 rounded-xl text-[#1a1a2e] text-sm bg-gray-50 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-200 focus:bg-white transition-all placeholder:text-gray-300"
                      placeholder={language === 'vi' ? 'Nhập mật khẩu...' : 'Enter your password...'}
                      value={lockPassword}
                      onChange={(e) => setLockPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowLockPwd(!showLockPwd)}
                      className="absolute inset-y-0 right-4 text-gray-300 hover:text-red-400 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showLockPwd ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={lockLoading || !lockPassword}
                  className="w-full py-3.5 rounded-xl font-bold text-sm tracking-[0.15em] uppercase text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 transition-all"
                >
                  {lockLoading
                    ? (language === 'vi' ? 'Đang xử lý...' : 'Processing...')
                    : (language === 'vi' ? 'Xác nhận khóa tài khoản' : 'Confirm Lock Account')}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;