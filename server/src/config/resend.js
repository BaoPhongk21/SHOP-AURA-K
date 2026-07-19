const nodemailer = require('nodemailer');

// Cấu hình Gmail SMTP
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT) || 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL || SMTP_USER;
const FROM_NAME = process.env.FROM_NAME || 'Aura K Shop';

// Tạo transporter
let transporter = null;

const getTransporter = () => {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: SMTP_PORT,
            secure: false, // TLS
            auth: {
                user: SMTP_USER,
                pass: SMTP_PASS
            }
        });
    }
    return transporter;
};

// Hàm format giá tiền VND
const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price || 0);
};

/**
 * Hàm gửi email chung qua Gmail SMTP
 */
const sendEmailViaGmail = async (toEmail, toName, subject, htmlContent) => {
    if (!toEmail || toEmail.trim() === '') {
        console.error("Lỗi: Email người nhận rỗng!");
        throw new Error("The recipient address is empty");
    }

    try {
        const transport = getTransporter();
        const info = await transport.sendMail({
            from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
            to: `"${toName || 'Khách hàng'}" <${toEmail}>`,
            subject: subject,
            html: htmlContent
        });

        console.log(`Da gui email "${subject}" den ${toEmail}, Message ID: ${info.messageId}`);
        return { messageId: info.messageId };
    } catch (error) {
        console.error(`Lỗi gui email den ${toEmail}:`, error.message);
        throw error;
    }
};

/**
 * Hàm gửi email chung (template security, newsletter, etc.)
 */
const sendEmailViaEmailJS = async (templateId, templateParams) => {
    if (!templateParams.to_email) {
        throw new Error("The recipient's address is empty");
    }

    const templateMap = {
        'template_security': {
            subject: 'Cảnh báo bảo mật tài khoản Aura K Shop',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">CẢNH BÁO BẢO MẬT</h1>
                    </div>
                    <div style="background: #ffffff; padding: 40px 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                        <p style="color: #333; font-size: 16px;">Chào bạn,</p>
                        <p style="color: #333; font-size: 16px;">Tài khoản <strong>${templateParams.user_email || templateParams.to_email}</strong> vừa có nhiều lần đăng nhập sai.</p>
                        <p style="color: #333; font-size: 16px;">Vui lòng kiểm tra tài khoản của bạn ngay lập tức.</p>
                        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <p style="color: #856404; margin: 0; font-size: 14px;">Nếu đây không phải bạn, vui lòng liên hệ hỗ trợ ngay.</p>
                        </div>
                    </div>
                </div>
            `
        },
        'template_newsletter': {
            subject: 'Chào mừng đến với Aura K Shop',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="color: #d4af37; margin: 0; font-size: 24px;">AURA K SHOP</h1>
                        <p style="color: #ffffff; margin: 10px 0 0; font-size: 14px;">Chào mừng bạn!</p>
                    </div>
                    <div style="background: #ffffff; padding: 40px 30px; text-align: center; border-radius: 0 0 10px 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                        <p style="color: #333; font-size: 16px;">Cảm ơn bạn đã đăng ký nhận thông báo từ Aura K Shop!</p>
                        <p style="color: #888; font-size: 12px; margin-top: 30px;">Hệ thống sẽ gửi thông báo mới nhất đến email của bạn.</p>
                    </div>
                </div>
            `
        }
    };

    const template = templateMap[templateId];
    if (!template) {
        console.warn(`Template "${templateId}" không tìm thấy, sử dụng template mặc định`);
    }

    return sendEmailViaGmail(
        templateParams.to_email,
        'Khách hàng',
        template?.subject || 'Thông báo từ Aura K Shop',
        template?.html || `<p>Thông báo từ Aura K Shop</p><p>${JSON.stringify(templateParams)}</p>`
    );
};

/**
 * Hàm gửi email xác nhận đơn hàng
 */
const sendOrderConfirmationEmail = async (orderData, customerEmail) => {
    if (!customerEmail || customerEmail.trim() === '') {
        console.error("Lỗi: Email khách hàng rỗng!");
        return;
    }

    const { orderNumber, items, shippingInfo, paymentMethod, subtotal, shippingFee, discount, totalAmount, createdAt } = orderData;

    const itemsHtml = items.map(item => `
        <tr>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.productName || item.product_name || 'Sản phẩm'}</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.size || item.size_name || 'N/A'}</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatPrice(item.unitPrice || item.unit_price)}</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatPrice((item.unitPrice || item.unit_price) * item.quantity)}</td>
        </tr>
    `).join('');

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: #d4af37; margin: 0; font-size: 28px;">AURA K SHOP</h1>
                <p style="color: #ffffff; margin: 10px 0 0; font-size: 14px;">Xác nhận đơn hàng #${orderNumber}</p>
            </div>
            <div style="background: #ffffff; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                <p style="color: #333; font-size: 16px;">Xin chào <strong>${shippingInfo.name}</strong>,</p>
                <p style="color: #333; font-size: 14px;">Cảm ơn bạn đã đặt hàng tại Aura K Shop! Đơn hàng của bạn đã được tiếp nhận và đang chờ xử lý.</p>

                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #1a1a2e; margin: 0 0 15px; font-size: 16px;">Thông tin đơn hàng</h3>
                    <p style="margin: 5px 0; color: #555;"><strong>Mã đơn hàng:</strong> #${orderNumber}</p>
                    <p style="margin: 5px 0; color: #555;"><strong>Ngày đặt:</strong> ${new Date(createdAt).toLocaleString('vi-VN')}</p>
                    <p style="margin: 5px 0; color: #555;"><strong>Phương thức thanh toán:</strong> ${paymentMethod === 'vnpay' ? 'VNPAY' : paymentMethod === 'banking' ? 'Chuyển khoản ngân hàng' : 'Thanh toán khi nhận hàng'}</p>
                </div>

                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #1a1a2e; margin: 0 0 15px; font-size: 16px;">Địa chỉ giao hàng</h3>
                    <p style="margin: 5px 0; color: #555;"><strong>Người nhận:</strong> ${shippingInfo.name}</p>
                    <p style="margin: 5px 0; color: #555;"><strong>Số điện thoại:</strong> ${shippingInfo.phone}</p>
                    <p style="margin: 5px 0; color: #555;"><strong>Địa chỉ:</strong> ${shippingInfo.address}</p>
                </div>

                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <thead>
                        <tr style="background: #1a1a2e;">
                            <th style="padding: 12px; color: #fff; text-align: left;">Sản phẩm</th>
                            <th style="padding: 12px; color: #fff; text-align: center;">Size</th>
                            <th style="padding: 12px; color: #fff; text-align: center;">SL</th>
                            <th style="padding: 12px; color: #fff; text-align: right;">Đơn giá</th>
                            <th style="padding: 12px; color: #fff; text-align: right;">Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>

                <div style="border-top: 2px solid #eee; padding-top: 20px; text-align: right;">
                    <p style="margin: 8px 0; color: #555;">Tạm tính: <strong>${formatPrice(subtotal)}</strong></p>
                    <p style="margin: 8px 0; color: #555;">Phí vận chuyển: <strong>${formatPrice(shippingFee)}</strong></p>
                    ${discount > 0 ? `<p style="margin: 8px 0; color: #28a745;">Giảm giá: <strong>-${formatPrice(discount)}</strong></p>` : ''}
                    <p style="margin: 15px 0 0; font-size: 20px; color: #dc3545;"><strong>TỔNG CỘNG: ${formatPrice(totalAmount)}</strong></p>
                </div>

                <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="color: #856404; margin: 0; font-size: 14px;">
                        <strong>Lưu ý:</strong> Đơn hàng sẽ được xử lý trong 24-48 giờ. Bạn sẽ nhận được email thông báo khi đơn hàng được cập nhật trạng thái.
                    </p>
                </div>

                <p style="color: #888; font-size: 12px; margin-top: 30px; text-align: center;">
                    Cảm ơn bạn đã tin tưởng Aura K Shop!<br>
                    Hotline: 1900 1234 | Email: support@aurak.com
                </p>
            </div>
        </div>
    `;

    return sendEmailViaGmail(customerEmail, shippingInfo.name, `[Aura K Shop] Xác nhận đơn hàng #${orderNumber}`, html);
};

/**
 * Hàm gửi email thông báo trạng thái đơn hàng
 */
const sendOrderStatusEmail = async (orderData, customerEmail, newStatus) => {
    if (!customerEmail || customerEmail.trim() === '') {
        console.error("Lỗi: Email khách hàng rỗng!");
        return;
    }

    const statusConfig = {
        'confirmed': { color: '#28a745', icon: '✅', text: 'đã được xác nhận', description: 'Đơn hàng của bạn đã được xác nhận và đang được chuẩn bị.' },
        'processing': { color: '#007bff', icon: '📦', text: 'đang được xử lý', description: 'Đơn hàng của bạn đang được đóng gói và chuẩn bị giao.' },
        'shipped': { color: '#17a2b8', icon: '🚚', text: 'đã được giao cho đơn vị vận chuyển', description: 'Đơn hàng của bạn đã được bàn giao cho đơn vị vận chuyển.' },
        'delivered': { color: '#28a745', icon: '🎉', text: 'đã được giao thành công', description: 'Cảm ơn bạn đã mua sắm tại Aura K Shop!' },
        'cancelled': { color: '#dc3545', icon: '❌', text: 'đã bị hủy', description: 'Đơn hàng của bạn đã được hủy. Nếu cần hỗ trợ, vui lòng liên hệ chúng tôi.' }
    };

    const status = statusConfig[newStatus] || { color: '#666', icon: '📋', text: 'đã được cập nhật', description: 'Trạng thái đơn hàng đã được cập nhật.' };

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: #d4af37; margin: 0; font-size: 24px;">AURA K SHOP</h1>
                <p style="color: #ffffff; margin: 10px 0 0; font-size: 14px;">Cập nhật trạng thái đơn hàng</p>
            </div>
            <div style="background: #ffffff; padding: 40px 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                <div style="text-align: center; padding: 20px; background: ${status.color}15; border-radius: 10px; margin-bottom: 20px;">
                    <span style="font-size: 48px;">${status.icon}</span>
                    <h2 style="color: ${status.color}; margin: 15px 0 0; font-size: 20px;">Đơn hàng ${status.text}</h2>
                </div>

                <p style="color: #333; font-size: 16px;">Xin chào,</p>
                <p style="color: #333; font-size: 14px;">${status.description}</p>

                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #1a1a2e; margin: 0 0 15px; font-size: 16px;">Thông tin đơn hàng</h3>
                    <p style="margin: 5px 0; color: #555;"><strong>Mã đơn hàng:</strong> #${orderData.orderNumber || orderData.order_number}</p>
                    <p style="margin: 5px 0; color: #555;"><strong>Tổng tiền:</strong> ${formatPrice(orderData.totalAmount || orderData.total_amount)}</p>
                </div>

                ${newStatus === 'shipped' ? `
                <div style="background: #e7f3ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="color: #004085; margin: 0; font-size: 14px;">
                        <strong>Theo dõi đơn hàng:</strong> Bạn có thể theo dõi đơn hàng trong mục "Lịch sử đơn hàng" trên website của chúng tôi.
                    </p>
                </div>
                ` : ''}

                ${newStatus === 'delivered' ? `
                <div style="background: #d4edda; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="color: #155724; margin: 0; font-size: 14px;">
                        <strong>Đánh giá sản phẩm:</strong> Cảm ơn bạn đã mua sắm! Hãy để lại đánh giá để giúp chúng tôi cải thiện dịch vụ.
                    </p>
                </div>
                ` : ''}

                <p style="color: #888; font-size: 12px; margin-top: 30px; text-align: center;">
                    Hotline: 1900 1234 | Email: support@aurak.com<br>
                    Cảm ơn bạn đã tin tưởng Aura K Shop!
                </p>
            </div>
        </div>
    `;

    return sendEmailViaGmail(customerEmail, 'Khách hàng', `[Aura K Shop] Cập nhật đơn hàng #${orderData.orderNumber || orderData.order_number} - ${status.text}`, html);
};

/**
 * Hàm gửi email OTP đăng ký tài khoản
 */
const sendRegistrationOtpEmail = async (email, otp) => {
    if (!email || email.trim() === '') {
        console.error("Lỗi: Hàm sendRegistrationOtp nhận được email rỗng!");
        throw new Error("The recipient address is empty");
    }

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: #d4af37; margin: 0; font-size: 24px;">AURA K SHOP</h1>
                <p style="color: #ffffff; margin: 10px 0 0; font-size: 14px;">Xác nhận đăng ký tài khoản</p>
            </div>
            <div style="background: #ffffff; padding: 40px 30px; text-align: center; border-radius: 0 0 10px 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                <h2 style="color: #333; font-size: 18px; margin: 0 0 20px;">Mã xác nhận đăng ký tài khoản</h2>
                <p style="color: #666; font-size: 14px; margin: 0 0 25px;">Vui lòng sử dụng mã bên dưới để hoàn tất đăng ký tài khoản Aura K Shop:</p>
                <div style="background: linear-gradient(135deg, #d4af37 0%, #f4e4bc 100%); display: inline-block; padding: 20px 50px; border-radius: 8px; margin: 20px 0;">
                    <span style="font-size: 36px; font-weight: bold; color: #1a1a2e; letter-spacing: 8px;">${otp}</span>
                </div>
                <p style="color: #666; font-size: 14px; margin: 20px 0 0;">Mã này có hiệu lực trong <strong>60 giây</strong>.</p>
                <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="color: #856404; margin: 0; font-size: 13px;">
                        <strong>Lưu ý:</strong> Nếu bạn không thực hiện đăng ký tài khoản, vui lòng bỏ qua email này. Tài khoản của bạn sẽ không được tạo nếu không xác nhận mã.
                    </p>
                </div>
                <p style="color: #999; font-size: 12px; margin-top: 30px;">
                    Hotline: 1900 1234 | Email: support@aurak.com
                </p>
            </div>
        </div>
    `;

    return sendEmailViaGmail(email, 'Khách hàng', 'Mã xác nhận đăng ký tài khoản Aura K Shop', htmlContent);
};

/**
 * Hàm gửi email OTP quên mật khẩu
 */
const sendResetPasswordOtpEmail = async (email, otp) => {
    if (!email || email.trim() === '') {
        console.error("Lỗi: Hàm sendResetPasswordOtp nhận được email rỗng!");
        throw new Error("The recipient address is empty");
    }

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: #d4af37; margin: 0; font-size: 24px;">AURA K SHOP</h1>
                <p style="color: #ffffff; margin: 10px 0 0; font-size: 14px;">Yêu cầu đặt lại mật khẩu</p>
            </div>
            <div style="background: #ffffff; padding: 40px 30px; text-align: center; border-radius: 0 0 10px 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                <h2 style="color: #333; font-size: 18px; margin: 0 0 20px;">Mã đặt lại mật khẩu</h2>
                <p style="color: #666; font-size: 14px; margin: 0 0 25px;">Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Vui lòng sử dụng mã bên dưới để đặt lại mật khẩu:</p>
                <div style="background: linear-gradient(135deg, #dc3545 0%, #f8d7da 100%); display: inline-block; padding: 20px 50px; border-radius: 8px; margin: 20px 0;">
                    <span style="font-size: 36px; font-weight: bold; color: #dc3545; letter-spacing: 8px;">${otp}</span>
                </div>
                <p style="color: #666; font-size: 14px; margin: 20px 0 0;">Mã này có hiệu lực trong <strong>60 giây</strong>.</p>
                <div style="background: #f8d7da; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="color: #721c24; margin: 0; font-size: 13px;">
                        <strong>Cảnh báo bảo mật:</strong> Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này và không chia sẻ mã cho bất kỳ ai. Có thể ai đó đang cố truy cập tài khoản của bạn.
                    </p>
                </div>
                <p style="color: #999; font-size: 12px; margin-top: 30px;">
                    Hotline: 1900 1234 | Email: support@aurak.com
                </p>
            </div>
        </div>
    `;

    return sendEmailViaGmail(email, 'Khách hàng', 'Mã đặt lại mật khẩu Aura K Shop', htmlContent);
};

/**
 * Hàm gửi email OTP xác nhận số điện thoại
 */
const sendPhoneVerificationOtpEmail = async (email, otp) => {
    if (!email || email.trim() === '') {
        console.error("Lỗi: Hàm sendPhoneVerificationOtp nhận được email rỗng!");
        throw new Error("The recipient address is empty");
    }

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: #d4af37; margin: 0; font-size: 24px;">AURA K SHOP</h1>
                <p style="color: #ffffff; margin: 10px 0 0; font-size: 14px;">Xác nhận số điện thoại</p>
            </div>
            <div style="background: #ffffff; padding: 40px 30px; text-align: center; border-radius: 0 0 10px 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                <h2 style="color: #333; font-size: 18px; margin: 0 0 20px;">Mã xác nhận số điện thoại</h2>
                <p style="color: #666; font-size: 14px; margin: 0 0 25px;">Vui lòng sử dụng mã bên dưới để xác nhận số điện thoại của bạn:</p>
                <div style="background: linear-gradient(135deg, #28a745 0%, #d4edda 100%); display: inline-block; padding: 20px 50px; border-radius: 8px; margin: 20px 0;">
                    <span style="font-size: 36px; font-weight: bold; color: #28a745; letter-spacing: 8px;">${otp}</span>
                </div>
                <p style="color: #666; font-size: 14px; margin: 20px 0 0;">Mã này có hiệu lực trong <strong>60 giây</strong>.</p>
                <div style="background: #d1e7dd; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="color: #0f5132; margin: 0; font-size: 13px;">
                        <strong>Lưu ý:</strong> Sau khi xác nhận, số điện thoại của bạn sẽ được liên kết với tài khoản Aura K Shop để tăng cường bảo mật.
                    </p>
                </div>
                <p style="color: #999; font-size: 12px; margin-top: 30px;">
                    Hotline: 1900 1234 | Email: support@aurak.com
                </p>
            </div>
        </div>
    `;

    return sendEmailViaGmail(email, 'Khách hàng', 'Mã xác nhận số điện thoại Aura K Shop', htmlContent);
};

module.exports = {
    sendRegistrationOtpEmail,
    sendResetPasswordOtpEmail,
    sendPhoneVerificationOtpEmail,
    sendEmailViaEmailJS,
    sendOrderConfirmationEmail,
    sendOrderStatusEmail
};
