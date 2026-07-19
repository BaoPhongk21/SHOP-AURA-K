const { sequelize } = require('../config/database');
const { sendEmailViaEmailJS } = require('../config/resend');

const subscribeNewsletter = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: 'Vui lòng cung cấp email.' });
        }

        // Tự động tạo bảng nếu chưa tồn tại
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS newsletters (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `).catch(() => { });

        // 1. Kiểm tra xem email này đã có tài khoản người dùng chưa
        const [[userRecord]] = await sequelize.query(
            'SELECT id FROM users WHERE email = ?',
            { replacements: [email] }
        );

        if (userRecord) {
            // Trả về 200 với success: false để Frontend hiển thị thông báo mà không bị Logout (tránh 401/400 interceptor)
            return res.status(200).json({ success: false, isRegisteredUser: true, message: 'Email này đã có tài khoản. Vui lòng đăng nhập!' });
        }

        // Kiểm tra xem email đã đăng ký nhận tin chưa
        const [[existing]] = await sequelize.query(
            'SELECT id FROM newsletters WHERE email = ?',
            { replacements: [email] }
        );

        if (existing) {
            return res.status(200).json({ success: false, message: 'Email này đã đăng ký nhận thông báo từ trước!' });
        }

        // 1. Lưu email vào CSDL
        await sequelize.query(
            'INSERT INTO newsletters (email) VALUES (?)',
            { replacements: [email] }
        );

        // 2. Gửi email chào mừng tự động ngay lập tức
        try {
            const welcomeHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #eee; border-radius: 10px; text-align: center;">
                    <h2 style="color: #003178; margin-bottom: 20px;">Cảm ơn bạn đã đăng ký!</h2>
                    <p style="color: #444; font-size: 16px; line-height: 1.6;">Chào mừng bạn đến với cộng đồng <strong>Aura K</strong>.</p>
                    <div style="margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px; border: 1px dashed #ccc;">
                        <p style="margin: 0; font-size: 14px; color: #666;">🎁 Tặng bạn mã giảm giá 10% cho đơn hàng đầu tiên:</p>
                        <h3 style="margin: 10px 0 0 0; color: #e11d48; letter-spacing: 2px;">WELCOME10</h3>
                    </div>
                    <p style="color: #888; font-size: 12px; margin-top: 30px;">Hệ thống sẽ gửi thông báo mới nhất đến email ${email} của bạn.</p>
                </div>`;

            await sendEmailViaEmailJS('template_security', {
                to_email: email,
                subject: 'Chào mừng bạn đến với Aura K! 🎉',
                message_html: welcomeHtml
            }).catch(err => console.warn("Lỗi gửi email Newsletter qua template_security."));
        } catch (mailError) {
            console.error('Lỗi khi gửi email chào mừng Newsletter:', mailError);
            // Lưu ý: Không ném ra lỗi (throw) ở đây để API vẫn trả về success=true cho Frontend
        }

        res.status(200).json({ success: true, message: 'Đăng ký nhận thông báo thành công! Vui lòng kiểm tra email của bạn.' });
    } catch (error) {
        console.error('Lỗi khi đăng ký newsletter:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi đăng ký.' });
    }
};

module.exports = { subscribeNewsletter };