import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import Footer from '../../components/Footer';
import { AuthContext } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { API_BASE_URL } from '../../config/api.config';

const Contact = () => {
  const { user, token } = useContext(AuthContext);
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    subject: language === 'vi' ? 'Tư vấn sản phẩm' : 'Product Inquiry',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedImages, setSelectedImages] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);

  // State cho Math CAPTCHA
  const [captcha, setCaptcha] = useState({ num1: 0, num2: 0, answer: 0 });
  const [userCaptcha, setUserCaptcha] = useState('');

  // Tự động điền thông tin nếu người dùng đã đăng nhập
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        fullName: prev.fullName || `${user.last_name || ''} ${user.first_name || ''}`.trim(),
        email: prev.email || user.email || '',
        phone: prev.phone || user.phone || ''
      }));
    }
  }, [user]);

  // Tạo phép toán ngẫu nhiên khi component được mount
  const generateCaptcha = () => {
    const n1 = Math.floor(Math.random() * 10) + 1;
    const n2 = Math.floor(Math.random() * 10) + 1;
    setCaptcha({ num1: n1, num2: n2, answer: n1 + n2 });
    setUserCaptcha('');
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + selectedImages.length > 3) {
      toast.error(language === 'vi' ? 'Chỉ được phép tải lên tối đa 3 hình ảnh.' : 'Only a maximum of 3 images can be uploaded.');
      return;
    }
    setSelectedImages(prev => [...prev, ...files]);
  };

  const removeImage = (index) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 30 * 1024 * 1024) {
        toast.error(language === 'vi' ? 'Dung lượng video quá lớn. Vui lòng chọn video ngắn gọn (Tối đa 30MB).' : 'Video size is too large. Please select a shorter video (Max 30MB).');
        return;
      }
      setSelectedVideo(file);
    }
  };

  const removeVideo = () => {
    setSelectedVideo(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (parseInt(userCaptcha) !== captcha.answer) {
      toast.error(language === 'vi' ? 'Mã xác nhận phép toán không chính xác. Vui lòng thử lại!' : 'CAPTCHA math solution is incorrect. Please try again!');
      generateCaptcha();
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error(language === 'vi' ? 'Vui lòng nhập đúng định dạng Email (vd: email@gmail.com).' : 'Please enter a valid email format (e.g. email@gmail.com).');
      return;
    }

    if (!formData.message.trim()) {
      toast.error(language === 'vi' ? 'Vui lòng nhập nội dung lời nhắn cần hỗ trợ.' : 'Please enter your support message.');
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData = new FormData();
      submitData.append('name', formData.fullName);
      submitData.append('email', formData.email);
      submitData.append('phone', formData.phone);
      submitData.append('message', `[${formData.subject}] ${formData.message}`);
      selectedImages.forEach(img => submitData.append('images', img));
      if (selectedVideo) submitData.append('video', selectedVideo);

      const requestHeaders = {};
      if (token) {
        requestHeaders['Authorization'] = `Bearer ${token}`;
      }

      // Đảm bảo API_BASE_URL đã được import và sử dụng đúng
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/contact`, {
        method: 'POST',
        headers: requestHeaders,
        body: submitData,
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message || (language === 'vi' ? 'Cảm ơn bạn! Tin nhắn của bạn đã được gửi thành công.' : 'Thank you! Your message has been sent successfully.'));
        setFormData({ fullName: '', email: '', phone: '', subject: language === 'vi' ? 'Tư vấn sản phẩm' : 'Product Inquiry', message: '' });
        setSelectedImages([]);
        setSelectedVideo(null);
        generateCaptcha();
      } else {
        toast.error(data.message || (language === 'vi' ? 'Có lỗi xảy ra, vui lòng thử lại.' : 'An error occurred, please try again.'));
      }
    } catch (error) {
      console.error('Lỗi khi gửi liên hệ:', error);
      toast.error(language === 'vi' ? 'Không thể kết nối đến máy chủ.' : 'Unable to connect to the server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#f8f9fa] text-[#191c1d] min-h-screen flex flex-col">
      <Toaster position="top-center" reverseOrder={false} />

      <main className="pt-20 flex-grow">
        {/* Hero Header */}
        <header className="relative w-full h-[409px] flex items-center justify-center overflow-hidden bg-[#f3f4f5]">
          <div className="absolute inset-0 opacity-20">
            <img alt="Luxury Fashion Store" className="w-full h-full object-cover" src="/images/bannerthuonghieu.jpg" loading="lazy" />
          </div>
          <div className="relative z-10 text-center px-4">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-[#003178] mb-4">
              {language === 'vi' ? 'Liên hệ với chúng tôi' : 'Contact Us'}
            </h1>
            <p className="text-[#434652] max-w-xl mx-auto font-body text-lg">
              {language === 'vi' ? 'Chúng tôi luôn sẵn sàng lắng nghe và đồng hành cùng phong cách của bạn.' : 'We are always ready to listen and accompany your unique style.'}
            </p>
          </div>
        </header>

        {/* Main Content Section */}
        <section className="max-w-7xl mx-auto px-8 py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
            {/* Contact Form Column */}
            <div className="bg-[#ffffff] p-10 rounded-xl shadow-sm">
              <h2 className="text-2xl font-bold tracking-tight mb-8 text-[#191c1d]">
                {language === 'vi' ? 'Gửi tin nhắn cho Aura K' : 'Send Aura K a Message'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label htmlFor="fullName" className="text-sm font-medium text-[#434652] px-1">{t('checkout.fullName')}</label>
                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      value={formData.fullName}
                      onChange={handleChange}
                      className="w-full bg-[#e1e3e4] border-none rounded-lg p-4 focus:ring-2 focus:ring-[#003178] transition-all placeholder:text-[#737783] outline-none"
                      placeholder={language === 'vi' ? 'Nguyễn Văn A' : 'John Smith'}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="email" className="text-sm font-medium text-[#434652] px-1">Email</label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full bg-[#e1e3e4] border-none rounded-lg p-4 focus:ring-2 focus:ring-[#003178] transition-all placeholder:text-[#737783] outline-none"
                      placeholder="example@email.com"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label htmlFor="phone" className="text-sm font-medium text-[#434652] px-1">{t('checkout.phone')}</label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full bg-[#e1e3e4] border-none rounded-lg p-4 focus:ring-2 focus:ring-[#003178] transition-all placeholder:text-[#737783] outline-none"
                      placeholder={language === 'vi' ? '090 123 4567' : '+84 90 123 4567'}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="subject" className="text-sm font-medium text-[#434652] px-1">
                      {language === 'vi' ? 'Chủ đề' : 'Subject'}
                    </label>
                    <select
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      className="w-full bg-[#e1e3e4] border-none rounded-lg p-4 focus:ring-2 focus:ring-[#003178] transition-all text-[#434652] outline-none"
                    >
                      <option value={language === 'vi' ? 'Tư vấn sản phẩm' : 'Product Inquiry'}>
                        {language === 'vi' ? 'Tư vấn sản phẩm' : 'Product Inquiry'}
                      </option>
                      <option value={language === 'vi' ? 'Hỗ trợ đơn hàng' : 'Order Support'}>
                        {language === 'vi' ? 'Hỗ trợ đơn hàng' : 'Order Support'}
                      </option>
                      <option value={language === 'vi' ? 'Hợp tác kinh doanh' : 'Business Collaboration'}>
                        {language === 'vi' ? 'Hợp tác kinh doanh' : 'Business Collaboration'}
                      </option>
                      <option value={language === 'vi' ? 'Yêu cầu mở khóa tài khoản' : 'Account Unlock Request'}>
                        {language === 'vi' ? 'Yêu cầu mở khóa tài khoản' : 'Account Unlock Request'}
                      </option>
                      <option value={language === 'vi' ? 'Khác' : 'Other'}>
                        {language === 'vi' ? 'Khác' : 'Other'}
                      </option>
                    </select>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="message" className="text-sm font-medium text-[#434652] px-1">
                    {language === 'vi' ? 'Tin nhắn' : 'Message'}
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    className="w-full bg-[#e1e3e4] border-none rounded-lg p-4 focus:ring-2 focus:ring-[#003178] transition-all placeholder:text-[#737783] outline-none"
                    placeholder={language === 'vi' ? 'Nội dung lời nhắn của bạn...' : 'Type your message here...'}
                    rows="4"
                    required
                  ></textarea>
                </div>

                {/* Tải lên Hình ảnh / Video */}
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-medium text-[#434652] px-1">
                    {language === 'vi' ? 'Đính kèm hình ảnh / Video (Tùy chọn)' : 'Attach Images / Video (Optional)'}
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                      <label htmlFor="images" className="flex items-center justify-center w-full px-4 py-3 bg-[#e1e3e4] border-2 border-dashed border-[#c3c6d4] rounded-lg cursor-pointer hover:border-[#003178] transition-all text-[#737783] hover:text-[#003178]">
                        <span className="material-symbols-outlined mr-2">image</span>
                        <span className="text-sm">
                          {language === 'vi' ? 'Thêm hình ảnh (Tối đa 3)' : 'Add Images (Max 3)'}
                        </span>
                        <input id="images" type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
                      </label>
                      {selectedImages.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {selectedImages.map((img, index) => (
                            <div key={index} className="relative w-16 h-16 bg-gray-200 rounded-md overflow-hidden shadow-sm border border-[#c3c6d4]">
                              <img src={URL.createObjectURL(img)} alt={`preview-${index}`} className="w-full h-full object-cover" />
                              <button type="button" onClick={() => removeImage(index)} className="absolute top-0 right-0 bg-red-500/90 text-white rounded-bl-md w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 transition-colors">×</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <label htmlFor="video" className="flex items-center justify-center w-full px-4 py-3 bg-[#e1e3e4] border-2 border-dashed border-[#c3c6d4] rounded-lg cursor-pointer hover:border-[#003178] transition-all text-[#737783] hover:text-[#003178]">
                        <span className="material-symbols-outlined mr-2">videocam</span>
                        <span className="text-sm">
                          {language === 'vi' ? 'Thêm Video (Tối đa 30MB)' : 'Add Video (Max 30MB)'}
                        </span>
                        <input id="video" type="file" accept="video/*" onChange={handleVideoChange} className="hidden" />
                      </label>
                      {selectedVideo && (
                        <div className="flex items-center justify-between mt-2 p-2 bg-[#e1e3e4] rounded-md border border-[#c3c6d4]">
                          <span className="text-sm truncate max-w-[150px] text-[#434652]" title={selectedVideo.name}>{selectedVideo.name}</span>
                          <button type="button" onClick={removeVideo} className="text-red-500 hover:text-red-700 font-bold px-2 text-lg leading-none">×</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Phần Math CAPTCHA */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="captcha" className="text-sm font-medium text-[#434652] px-1">
                    {language === 'vi' ? 'Xác nhận bạn không phải là máy:' : 'Solve this math CAPTCHA:'}{' '}
                    <strong className="text-[#003178] text-base ml-1">{captcha.num1} + {captcha.num2} = ?</strong>
                  </label>
                  <div className="flex gap-4">
                    <input
                      id="captcha"
                      type="number"
                      value={userCaptcha}
                      onChange={(e) => setUserCaptcha(e.target.value)}
                      className="flex-1 bg-[#e1e3e4] border-none rounded-lg p-4 focus:ring-2 focus:ring-[#003178] transition-all placeholder:text-[#737783] outline-none"
                      placeholder={language === 'vi' ? 'Nhập kết quả...' : 'Enter answer...'}
                      required
                    />
                    <button type="button" onClick={generateCaptcha} className="px-5 bg-[#e1e3e4] text-[#434652] rounded-lg hover:bg-[#c3c6d4] transition-colors flex items-center justify-center" title={language === 'vi' ? 'Đổi câu hỏi khác' : 'Try another question'}>
                      <span className="material-symbols-outlined text-xl">refresh</span>
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-gradient-to-r from-[#003178] to-[#0d47a1] text-white font-semibold rounded-lg hover:brightness-110 active:scale-[0.99] transition-all shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (language === 'vi' ? 'Đang gửi...' : 'Sending...') : (language === 'vi' ? 'Gửi tin nhắn' : 'Send Message')}
                </button>
              </form>
            </div>

            {/* Info Column */}
            <div className="flex flex-col justify-center space-y-12">
              <div>
                <h2 className="text-3xl font-extrabold tracking-tight text-[#003178] mb-6">
                  {language === 'vi' ? 'Thông tin chi tiết' : 'Contact Details'}
                </h2>
                <p className="text-[#434652] leading-relaxed mb-8">
                  {language === 'vi'
                    ? 'Trải nghiệm không gian mua sắm sang trọng tại các cửa hàng của Aura K hoặc liên hệ trực tiếp với đội ngũ tư vấn phong cách của chúng tôi.'
                    : 'Experience the luxury retail space at Aura K showrooms or contact our styling advisors directly.'}
                </p>
              </div>
              <div className="space-y-8">
                <div className="flex gap-6">
                  <div className="w-12 h-12 bg-[#d9e2ff] rounded-full flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[#003178]">location_on</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-[#191c1d] mb-1">
                      {language === 'vi' ? 'Địa chỉ' : 'Address'}
                    </h3>
                    <p className="text-[#434652]">
                      {language === 'vi' ? '285 Cách Mạng Tháng 8, Quận 10, TP.HCM' : '285 Cach Mang Thang 8, District 10, HCMC'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="w-12 h-12 bg-[#d9e2ff] rounded-full flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[#003178]">call</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-[#191c1d] mb-1">Hotline</h3>
                    <p className="text-[#434652]">1900 1001</p>
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="w-12 h-12 bg-[#d9e2ff] rounded-full flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[#003178]">mail</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-[#191c1d] mb-1">Email</h3>
                    <p className="text-[#434652]">aurakshop.com.vn</p>
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="w-12 h-12 bg-[#d9e2ff] rounded-full flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[#003178]">schedule</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-[#191c1d] mb-1">
                      {language === 'vi' ? 'Giờ làm việc' : 'Opening Hours'}
                    </h3>
                    <p className="text-[#434652]">
                      {language === 'vi' ? 'Thứ 2 - Chủ Nhật: 09:00 - 21:00' : 'Monday - Sunday: 09:00 - 21:00'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="pt-8 border-t border-[#c3c6d4]/20">
                <h3 className="text-sm font-bold text-[#003178] mb-4 tracking-widest uppercase">
                  {language === 'vi' ? 'Mạng xã hội' : 'Social Networks'}
                </h3>
                <div className="flex gap-4">
                  <a href="#" className="w-10 h-10 flex items-center justify-center bg-[#e7e8e9] rounded-full text-[#003178] hover:bg-[#003178] hover:text-white transition-all">
                    <span className="material-symbols-outlined">social_leaderboard</span>
                  </a>
                  <a href="#" className="w-10 h-10 flex items-center justify-center bg-[#e7e8e9] rounded-full text-[#003178] hover:bg-[#003178] hover:text-white transition-all">
                    <span className="material-symbols-outlined">photo_camera</span>
                  </a>
                  <a href="#" className="w-10 h-10 flex items-center justify-center bg-[#e7e8e9] rounded-full text-[#003178] hover:bg-[#003178] hover:text-white transition-all">
                    <span className="material-symbols-outlined">brand_awareness</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Map Section */}
        <section className="w-full h-[500px] bg-[#f3f4f5] overflow-hidden relative">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3919.4678854497653!2d106.66632441474888!3d10.775429192322305!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31752edbacf4cb63%3A0xe5eb6c43491cb8fb!2zMjg1IMSQLiBDw6FjaCBN4bqhbmcgVGjDoW5nIDgsIFBoxrDhu51uZyAxMiwgUXXhuq1uIDEwLCBI4buTIENow60gTWluaCwgVmnhu4d0IE5hbQ!5e0!3m2!1svi!2s!4v1700000000000!5m2!1svi!2s"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title={language === 'vi' ? 'Bản đồ vị trí cửa hàng Aura K' : 'Aura K Showroom Location Map'}
          ></iframe>
        </section>
      </main>

      <div className="mt-16 md:mt-24">
        <Footer />
      </div>
    </div>
  );
};

export default Contact;