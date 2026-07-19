import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import toast, { Toaster } from 'react-hot-toast';
import FacebookLogin from '@greatsumini/react-facebook-login';
import { AuthContext } from '../../context/AuthContext';
import { CartContext } from '../../context/CartContext';
import { useLanguage } from '../../context/LanguageContext';
import { API_BASE_URL } from '../../config/api.config';

const Register = () => {
  const location = useLocation();
  const { t, language } = useLanguage();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    phone: '',
    email: location.state?.email || '',
    password: '',
    confirmPassword: ''
  });
  const [step, setStep] = useState(1);
  const [otpInput, setOtpInput] = useState('');
  const [timer, setTimer] = useState(60);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Safe context access with fallback
  const authContext = useContext(AuthContext);
  const cartContext = useContext(CartContext);
  const { login } = authContext || {};
  const { cartItems, clearCart } = cartContext || {};

  useEffect(() => {
    let interval;
    if (step === 2 && timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    } else if (timer === 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isPasswordValid) {
      setError(language === 'vi'
        ? 'Vui lòng nhập mật khẩu thỏa mãn các điều kiện bảo mật bên dưới.'
        : 'Please enter a password that meets the security requirements below.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError(language === 'vi' ? 'Mật khẩu xác nhận không khớp.' : 'Confirm password does not match.');
      return;
    }
    const phoneRegex = /^(84|0[3|5|7|8|9])([0-9]{8})$/;
    if (!phoneRegex.test(formData.phone)) {
      setError(language === 'vi'
        ? 'Số điện thoại không hợp lệ (Vui lòng nhập 10 số).'
        : 'Invalid phone number (Please enter 10 digits).');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          username: formData.username,
          phone: formData.phone,
          email: formData.email,
          password: formData.password,
        }),
      });
      let result;
      try { result = await response.json(); }
      catch (e) { throw new Error(language === 'vi' ? 'Phản hồi từ hệ thống không hợp lệ.' : 'Invalid server response.'); }
      if (!response.ok) {
        setError(result.message || (language === 'vi' ? 'Đã có lỗi xảy ra trong quá trình đăng ký.' : 'An error occurred during registration.'));
      } else if (result.success) {
        toast.success(result.message);
        setStep(2);
        setTimer(60);
      } else {
        setError(result.message || (language === 'vi' ? 'Đã có lỗi xảy ra. Vui lòng thử lại.' : 'An error occurred. Please try again.'));
      }
    } catch (err) {
      setError(language === 'vi' ? 'Không thể kết nối đến server. Vui lòng thử lại sau.' : 'Unable to connect to the server. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpInput || otpInput.length !== 6) {
      setError(language === 'vi' ? 'Vui lòng nhập đủ 6 số OTP.' : 'Please enter the 6-digit OTP.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, otp: otpInput }),
      });
      const result = await response.json();
      if (result.success) {
        toast.success(result.message || (language === 'vi' ? 'Đăng ký thành công! Vui lòng đăng nhập.' : 'Registration successful! Please log in.'));
        navigate('/login', { state: { identifier: formData.email } });
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(language === 'vi' ? 'Không thể kết nối đến server. Vui lòng thử lại sau.' : 'Unable to connect to the server. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          username: formData.username,
          phone: formData.phone,
          email: formData.email,
          password: formData.password,
        }),
      });
      const result = await response.json();
      if (result.success) {
        toast.success(language === 'vi' ? 'Đã gửi lại mã OTP. Vui lòng kiểm tra hộp thư.' : 'OTP code resent. Please check your inbox.');
        setTimer(60);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(language === 'vi' ? 'Lỗi kết nối server.' : 'Server connection error.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsLoading(true);
      const toastId = toast.loading(language === 'vi' ? 'Đang xác thực với Google...' : 'Authenticating with Google...');
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: tokenResponse.access_token }),
        });
        const result = await res.json();
        if (result.success) {
          toast.success(language === 'vi' ? 'Đăng nhập thành công!' : 'Sign-in successful!', { id: toastId });
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
          toast.error(result.message || (language === 'vi' ? 'Đăng nhập thất bại.' : 'Sign-in failed.'), { id: toastId });
        }
      } catch (err) {
        toast.error(language === 'vi'
          ? 'Lỗi xác thực. Vui lòng kiểm tra lại cấu hình COOP hoặc thử lại.'
          : 'Authentication error. Please check COOP policy or try again.', { id: toastId });
      } finally {
        setIsLoading(false);
      }
    },
    onError: (err) => {
      setError(language === 'vi'
        ? 'Đăng nhập thất bại. Nếu bạn thấy lỗi COOP trong console, hãy cập nhật cấu hình server.'
        : 'Sign-in failed. If you see a COOP error in console, update server config.');
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
        toast.success(language === 'vi' ? 'Đăng nhập/Đăng ký bằng Facebook thành công!' : 'Facebook sign-in/sign-up successful!');
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

  const maskEmail = (email) => {
    if (!email) return '';
    const parts = email.split('@');
    if (parts.length !== 2) return email;
    const name = parts[0];
    const domain = parts[1];
    if (name.length > 6) {
      return `${name.slice(0, 3)}${'*'.repeat(name.length - 6)}${name.slice(-3)}@${domain}`;
    } else if (name.length > 2) {
      return name.charAt(0) + '*'.repeat(name.length - 2) + name.slice(-1) + '@' + domain;
    }
    return '*'.repeat(name.length) + '@' + domain;
  };

  const pwd = formData.password || '';
  const isTypingPwd = pwd.length > 0;
  const min8 = isTypingPwd ? pwd.length >= 8 : null;
  const hasLower = isTypingPwd ? /[a-z]/.test(pwd) : null;
  const hasUpper = isTypingPwd ? /[A-Z]/.test(pwd) : null;
  const hasNumber = isTypingPwd ? /[0-9]/.test(pwd) : null;
  const hasSpecial = isTypingPwd ? /[^a-zA-Z0-9\s]/.test(pwd) : null;

  let conditionsMetCount = 0;
  if (/[a-z]/.test(pwd)) conditionsMetCount++;
  if (/[A-Z]/.test(pwd)) conditionsMetCount++;
  if (/[0-9]/.test(pwd)) conditionsMetCount++;
  if (/[^a-zA-Z0-9\s]/.test(pwd)) conditionsMetCount++;

  const threeOfFour = isTypingPwd ? conditionsMetCount >= 3 : null;
  const noThreeConsecutive = isTypingPwd ? !/(.)\\1\\1/.test(pwd) : null;
  const isPasswordValid = pwd.length > 0 && min8 && threeOfFour && noThreeConsecutive;

  const renderConditionIcon = (status) => {
    if (status === true) return (
      <span className="material-symbols-outlined text-emerald-500 text-[16px]">check_circle</span>
    );
    if (status === false) return (
      <span className="material-symbols-outlined text-red-400 text-[16px]">cancel</span>
    );
    return <span className="w-1.5 h-1.5 rounded-full bg-gray-300 inline-block" />;
  };

  // ─── Field configs for step 1 ───
  const step1Fields = [
    {
      grid: 2,
      fields: [
        { id: 'lastName', name: 'lastName', label: t('checkout.lastName'), placeholder: language === 'vi' ? 'Nguyễn' : 'Smith', type: 'text' },
        { id: 'firstName', name: 'firstName', label: t('checkout.firstName'), placeholder: language === 'vi' ? 'Văn A' : 'John', type: 'text' },
      ]
    },
    { id: 'username', name: 'username', label: language === 'vi' ? 'Tên đăng nhập' : 'Username', placeholder: language === 'vi' ? 'ví dụ: annguyen123' : 'e.g. johnsmith123', type: 'text' },
    { id: 'phone', name: 'phone', label: t('checkout.phone'), placeholder: '0901234567', type: 'tel' },
    { id: 'email', name: 'email', label: 'Email', placeholder: 'example@aura.com', type: 'email' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f7f4] relative overflow-hidden py-8">
      <Toaster position="top-center" />

      {/* Background dot pattern */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'radial-gradient(#1a1a2e 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />

      <main
        className="w-full max-w-5xl mx-4 mt-[80px] grid grid-cols-1 lg:grid-cols-2 rounded-3xl overflow-hidden shadow-2xl border border-gray-100"
      >
        {/* ─── LEFT: Image Panel ─── */}
        <div className="hidden lg:flex relative min-h-full flex-col">
          <img
            alt="Fashion Editorial"
            className="absolute inset-0 w-full h-full object-cover object-top"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBRzcFxI4oBzCpxBSCeuenA1U5yxtgVslLWCDjAWfspslPtaQDhfqBh2pIFFE8M8BtmKDqCisiFLDnnKXzHQMEfftTSDUXD01YTGCybv_ht0Bu5Cj1NJOaCdwLe9gQhl9kEcnl-wuqnp3mqU0gpaC5vxbXXU47ioOJUioVEr5Efvn9Qu2sLxwFCL9DWIIZaT7HRKzb4fGwutgo7uc58u5gz_b6C2X7o8_yNaHHWjvPUeGctqWQPre2GCS1oSkWH5P9lTR8wbVQSNhs"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a2e]/70 via-[#1a1a2e]/20 to-transparent" />

          {/* Logo */}
          <div className="relative z-10 top-10 left-10 w-fit">
            <span className="font-headline text-2xl font-black tracking-[0.25em] text-white uppercase">
              AURA.K
            </span>
            <div className="mt-1.5 h-[2.5px] w-10 bg-[#d4af37] rounded-full shadow-lg" />
          </div>

          {/* Bottom text */}
          <div className="absolute bottom-12 left-10 right-10 z-10">
            <div className="w-8 h-[2.5px] bg-[#d4af37] mb-5 rounded-full shadow-lg" />
            <p className="font-headline text-[1.3rem] font-bold text-white leading-snug drop-shadow-md">
              {language === 'vi'
                ? '"Gia nhập cộng đồng thời trang cao cấp cùng AURA.K."'
                : '"Join the premium fashion community with AURA.K."'}
            </p>
          </div>
        </div>

        {/* ─── RIGHT: Form Panel ─── */}
        <div className="bg-white flex flex-col justify-center px-8 py-10 sm:px-12 relative z-10">

          {/* Mobile logo */}
          <div className="lg:hidden mb-7 text-center">
            <Link to="/" className="inline-block">
              <span className="font-headline text-2xl font-black tracking-[0.25em] text-[#1a1a2e] uppercase">
                AURA.K
              </span>
              <div className="mx-auto mt-1.5 h-[2px] w-10 bg-[#d4af37] rounded-full" />
            </Link>
          </div>

          {/* Heading */}
          <div className="mb-7">
            <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-[#d4af37] mb-2">
              {language === 'vi' ? 'Bắt đầu hành trình' : 'Start Your Journey'}
            </p>
            <h1 className="font-headline text-3xl font-black text-[#1a1a2e] tracking-tight">
              {step === 1
                ? (language === 'vi' ? 'Tạo tài khoản' : 'Create Account')
                : (language === 'vi' ? 'Xác nhận OTP' : 'Verify OTP')}
            </h1>
            <p className="text-gray-400 text-sm mt-2">
              {step === 1
                ? (language === 'vi' ? 'Trải nghiệm dịch vụ thời trang cao cấp ngay hôm nay.' : 'Experience premium fashion curation service today.')
                : (language === 'vi' ? 'Mã xác nhận đã được gửi đến email của bạn.' : 'A verification code has been sent to your email.')}
            </p>
          </div>

          {/* ── STEP 1: Registration Form ── */}
          {step === 1 ? (
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Name row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { id: 'lastName', name: 'lastName', label: t('checkout.lastName'), placeholder: language === 'vi' ? 'Nguyễn' : 'Smith' },
                  { id: 'firstName', name: 'firstName', label: t('checkout.firstName'), placeholder: language === 'vi' ? 'Văn A' : 'John' },
                ].map((f) => (
                  <div key={f.id} className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400" htmlFor={f.id}>
                      {f.label}
                    </label>
                    <input
                      id={f.id}
                      name={f.name}
                      type="text"
                      placeholder={f.placeholder}
                      value={formData[f.name]}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[#1a1a2e] text-sm bg-gray-50 outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20 focus:bg-white transition-all placeholder:text-gray-300"
                    />
                  </div>
                ))}
              </div>

              {/* Username */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400" htmlFor="username">
                  {language === 'vi' ? 'Tên đăng nhập' : 'Username'}
                </label>
                <input
                  id="username" name="username" type="text"
                  placeholder={language === 'vi' ? 'ví dụ: annguyen123' : 'e.g. johnsmith123'}
                  value={formData.username} onChange={handleChange} required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[#1a1a2e] text-sm bg-gray-50 outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20 focus:bg-white transition-all placeholder:text-gray-300"
                />
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400" htmlFor="phone">
                  {t('checkout.phone')}
                </label>
                <input
                  id="phone" name="phone" type="tel"
                  placeholder="0901234567"
                  value={formData.phone} onChange={handleChange} required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[#1a1a2e] text-sm bg-gray-50 outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20 focus:bg-white transition-all placeholder:text-gray-300"
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400" htmlFor="email">
                  Email
                </label>
                <input
                  id="email" name="email" type="email"
                  placeholder="example@aura.com"
                  value={formData.email} onChange={handleChange} required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[#1a1a2e] text-sm bg-gray-50 outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20 focus:bg-white transition-all placeholder:text-gray-300"
                />
              </div>

              {/* Password row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { id: 'password', name: 'password', label: language === 'vi' ? 'Mật khẩu' : 'Password', show: showPassword, setShow: setShowPassword },
                  { id: 'confirm_password', name: 'confirmPassword', label: language === 'vi' ? 'Xác nhận mật khẩu' : 'Confirm Password', show: showConfirmPassword, setShow: setShowConfirmPassword },
                ].map((f) => (
                  <div key={f.id} className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400" htmlFor={f.id}>
                      {f.label}
                    </label>
                    <div className="relative">
                      <input
                        id={f.id} name={f.name}
                        type={f.show ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={formData[f.name]} onChange={handleChange} required
                        className="w-full pl-4 pr-12 py-3 border border-gray-200 rounded-xl text-[#1a1a2e] text-sm bg-gray-50 outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20 focus:bg-white transition-all placeholder:text-gray-300"
                      />
                      <button
                        type="button"
                        onClick={() => f.setShow(!f.show)}
                        className="absolute inset-y-0 right-4 text-gray-300 hover:text-[#d4af37] transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {f.show ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>
                ))}

                {/* Password strength box */}
                <div className="col-span-1 sm:col-span-2">
                  <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-[12.5px]">
                    <p className="font-bold text-[#1a1a2e] mb-3 text-[11px] uppercase tracking-widest">
                      {language === 'vi' ? 'Yêu cầu mật khẩu:' : 'Password Requirements:'}
                    </p>
                    <ul className="space-y-2 text-gray-500">
                      <li className="flex items-center gap-2.5">
                        {renderConditionIcon(min8)}
                        <span className={min8 === true ? 'text-emerald-600 font-semibold' : min8 === false ? 'text-red-500' : ''}>
                          {language === 'vi' ? 'Ít nhất 8 ký tự' : 'At least 8 characters'}
                        </span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <div className="mt-0.5">{renderConditionIcon(threeOfFour)}</div>
                        <div>
                          <span className={threeOfFour === true ? 'text-emerald-600 font-semibold' : threeOfFour === false ? 'text-red-500' : ''}>
                            {language === 'vi' ? 'Ít nhất 3 trong 4 điều kiện sau:' : 'At least 3 of the following:'}
                          </span>
                          <ul className="ml-6 mt-2 space-y-1.5">
                            {[
                              { status: hasLower, text: language === 'vi' ? 'Chữ thường (a-z)' : 'Lowercase (a-z)' },
                              { status: hasUpper, text: language === 'vi' ? 'Chữ hoa (A-Z)' : 'Uppercase (A-Z)' },
                              { status: hasNumber, text: language === 'vi' ? 'Số (0-9)' : 'Numbers (0-9)' },
                              { status: hasSpecial, text: language === 'vi' ? 'Ký tự đặc biệt (!@#$...)' : 'Special chars (!@#$...)' },
                            ].map((cond, i) => (
                              <li key={i} className="flex items-center gap-2">
                                {renderConditionIcon(cond.status)}
                                <span className={cond.status === true ? 'text-emerald-600' : cond.status === false ? 'text-red-500' : ''}>
                                  {cond.text}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </li>
                      <li className="flex items-center gap-2.5">
                        {renderConditionIcon(noThreeConsecutive)}
                        <span className={noThreeConsecutive === true ? 'text-emerald-600 font-semibold' : noThreeConsecutive === false ? 'text-red-500' : ''}>
                          {language === 'vi' ? 'Không quá 2 ký tự giống nhau liên tiếp' : 'No more than 2 identical consecutive chars'}
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
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
                    ? (language === 'vi' ? 'Đang gửi mã xác nhận...' : 'Sending code...')
                    : (language === 'vi' ? 'Đăng ký & Nhận mã OTP' : 'Register & Get OTP')}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              </button>

              {/* Divider */}
              <div className="relative my-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-100" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-4 text-[11px] uppercase tracking-[0.2em] text-gray-300 font-semibold">
                    {language === 'vi' ? 'Hoặc đăng ký với' : 'Or register with'}
                  </span>
                </div>
              </div>

              {/* Social buttons */}
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
                  className="flex items-center justify-center gap-2.5 px-4 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700 transition-all"
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
                      className="flex items-center justify-center gap-2.5 px-4 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700 transition-all"
                    >
                      <svg className="w-4 h-4 fill-[#1877F2] flex-shrink-0" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                      Facebook
                    </button>
                  )}
                />
              </div>
            </form>
          ) : (
            /* ── STEP 2: OTP Verification ── */
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              {/* Email display */}
              <div className="text-center py-6 bg-gray-50 border border-gray-100 rounded-2xl">
                <span className="material-symbols-outlined text-4xl text-[#d4af37] mb-3 block">mark_email_unread</span>
                <p className="text-sm text-gray-400">
                  {language === 'vi'
                    ? 'Mã xác nhận gồm 6 chữ số đã được gửi đến:'
                    : 'A 6-digit verification code has been sent to:'}
                </p>
                <p className="font-bold text-[#1a1a2e] text-base mt-1.5">{maskEmail(formData.email)}</p>
              </div>

              {/* OTP Input */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 text-center">
                  {language === 'vi' ? 'Nhập mã OTP' : 'Enter OTP Code'}
                </label>
                <input
                  type="text"
                  maxLength="6"
                  className="w-full text-center text-3xl font-black tracking-[0.5em] px-4 py-4 border-2 border-gray-200 rounded-xl text-[#1a1a2e] outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20 transition-all bg-gray-50 focus:bg-white"
                  placeholder="——————"
                  value={otpInput}
                  onChange={(e) => {
                    setOtpInput(e.target.value.replace(/[^0-9]/g, ''));
                    if (error) setError('');
                  }}
                  required
                />
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
                disabled={isLoading || otpInput.length !== 6}
                className="w-full py-3.5 rounded-xl font-bold text-sm tracking-[0.15em] uppercase text-white transition-all duration-300 disabled:opacity-50 relative overflow-hidden group"
                style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #2d2d50 100%)' }}
              >
                <span className="relative z-10">
                  {isLoading
                    ? (language === 'vi' ? 'Đang xác nhận...' : 'Verifying...')
                    : (language === 'vi' ? 'Xác nhận OTP' : 'Verify OTP')}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              </button>

              {/* Timer / Resend */}
              <div className="text-center">
                {timer > 0 ? (
                  <p className="text-sm text-gray-400">
                    {language === 'vi' ? 'Mã có hiệu lực trong ' : 'Code valid for '}
                    <span className="font-black text-[#d4af37]">{timer}s</span>
                  </p>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <p className="text-sm text-red-500 font-semibold">
                      {language === 'vi' ? 'Mã OTP đã hết hạn!' : 'OTP Code Expired!'}
                    </p>
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={isLoading}
                      className="flex items-center gap-2 px-6 py-2.5 border-2 border-[#d4af37] text-[#d4af37] font-bold text-sm rounded-xl hover:bg-[#d4af37] hover:text-white active:scale-95 transition-all"
                    >
                      <span className="material-symbols-outlined text-base">refresh</span>
                      {language === 'vi' ? 'Gửi lại OTP' : 'Resend OTP'}
                    </button>
                  </div>
                )}
              </div>

              {/* Back button */}
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full flex items-center justify-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors font-semibold"
              >
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                {language === 'vi' ? 'Quay lại chỉnh sửa thông tin' : 'Go back and edit details'}
              </button>
            </form>
          )}

          {/* Login link */}
          <p className="mt-7 text-center text-sm text-gray-400">
            {language === 'vi' ? 'Đã có tài khoản?' : 'Already have an account?'}{' '}
            <Link
              to="/login"
              className="font-bold text-[#1a1a2e] hover:text-[#d4af37] transition-colors"
            >
              {language === 'vi' ? 'Đăng nhập ngay' : 'Log in here'}
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
};

export default Register;