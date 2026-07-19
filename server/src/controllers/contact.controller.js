const { sequelize } = require('../config/database');
const { sendEmailViaEmailJS } = require('../config/resend');

const ADMIN_EMAIL = process.env.EMAIL_USER || 'admin@example.com'; // Email nhận thông báo liên hệ (Fallback nếu thiếu .env)

const submitContactForm = async (req, res) => {
    try {
        const { name, email, phone, message, subject } = req.body;
        if (!name || !email || !message) return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ Họ tên, Email và Lời nhắn.' });

        let attachments = { images: [], video: null };
        if (req.files) {
            if (req.files['images']) attachments.images = req.files['images'].map(f => `/uploads/contacts/${f.filename}`);
            if (req.files['video'] && req.files['video'][0]) attachments.video = `/uploads/contacts/${req.files['video'][0].filename}`;
        }

        // Đảm bảo bảng và cấu trúc cột đầy đủ (hỗ trợ cả subject và attachments)
        try {
            await sequelize.query(`
                CREATE TABLE IF NOT EXISTS contacts (
                    id SERIAL PRIMARY KEY, 
                    name VARCHAR(255), 
                    email VARCHAR(255), 
                    phone VARCHAR(50), 
                    subject VARCHAR(255),
                    message TEXT, 
                    attachments TEXT, 
                    is_read BOOLEAN DEFAULT FALSE, 
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            // Cập nhật thêm cột cho các Database đã tạo từ trước
            await sequelize.query('ALTER TABLE contacts ADD COLUMN IF NOT EXISTS attachments TEXT').catch(() => { });
            await sequelize.query('ALTER TABLE contacts ADD COLUMN IF NOT EXISTS subject VARCHAR(255)').catch(() => { });
        } catch (initErr) {
            console.warn('Lưu ý: Không thể cập nhật cấu trúc bảng contacts:', initErr.message);
        }

        const now = new Date();
        await sequelize.query(
            `INSERT INTO contacts (name, email, phone, subject, message, attachments, created_at, is_read) 
             VALUES (?, ?, ?, ?, ?, ?, ?, FALSE)`,
            { replacements: [name, email, phone || null, subject || null, message, JSON.stringify(attachments), now] }
        );

        try {
            let attachmentHtml = '';
            if (attachments.images.length > 0 || attachments.video) {
                attachmentHtml = `<p><strong>File đính kèm:</strong></p><ul style="list-style-type: none; padding: 0; margin-top: 10px;">`;
                attachments.images.forEach((imgUrl, idx) => { attachmentHtml += `<li style="margin-bottom: 8px;"><a href="${imgUrl}" target="_blank" style="display: inline-block; background: #f0fdf4; color: #166534; padding: 6px 12px; border-radius: 6px; text-decoration: none; font-weight: bold; border: 1px solid #bbf7d0;">🖼️ Xem Hình ảnh ${idx + 1}</a></li>`; });
                if (attachments.video) attachmentHtml += `<li><a href="${attachments.video}" target="_blank" style="display: inline-block; background: #eff6ff; color: #1e40af; padding: 6px 12px; border-radius: 6px; text-decoration: none; font-weight: bold; border: 1px solid #bfdbfe;">🎞️ Xem Video đính kèm</a></li>`;
                attachmentHtml += `</ul>`;
            }

            // Tự động nhận diện yêu cầu mở khóa tài khoản qua từ khóa hoặc biến subject từ frontend
            const isUnlockRequest = message.toLowerCase().includes('mở') && (message.toLowerCase().includes('khóa') || message.toLowerCase().includes('khoá') || message.toLowerCase().includes('tk') || message.toLowerCase().includes('tài khoản'));
            const mailSubject = subject ? `[${subject}] Khách hàng ${name}` :
                (isUnlockRequest ? `[Yêu cầu Mở Khóa Tài Khoản] Khách hàng ${name} cần hỗ trợ` : `[Liên hệ mới] Khách hàng ${name} cần hỗ trợ`);

            const adminMessageHtml = `
                <h3>Thông tin liên hệ mới:</h3>
                <p><strong>Người gửi:</strong> ${name} (${email})</p>
                <p><strong>Nội dung:</strong> ${message}</p>
                ${attachmentHtml}`;

            await sendEmailViaEmailJS('template_security', {
                to_email: ADMIN_EMAIL,
                subject: mailSubject,
                message_html: adminMessageHtml
            }).catch(err => console.warn("Lỗi gửi thông báo liên hệ cho Admin qua template_security."));
        } catch (mailErr) { console.error('❌ Lỗi gửi email thông báo cho Admin:', mailErr.message); }

        res.status(200).json({ success: true, message: 'Cảm ơn bạn! Tin nhắn đã được gửi thành công.' });
    } catch (error) { res.status(500).json({ success: false, message: 'Lỗi server khi gửi tin nhắn.' }); }
};

const markContactRead = async (req, res) => {
    try {
        await sequelize.query('UPDATE contacts SET is_read = TRUE WHERE id = ?', { replacements: [req.params.id] });
        res.status(200).json({ success: true, message: 'Đã đánh dấu đã đọc' });
    } catch (error) { res.status(500).json({ success: false, message: 'Lỗi server' }); }
};

const replyContact = async (req, res) => {
    try {
        const { id } = req.params;
        const { replyMessage } = req.body;
        if (!replyMessage) return res.status(400).json({ success: false, message: 'Nội dung phản hồi không được để trống.' });

        const [contacts] = await sequelize.query('SELECT * FROM contacts WHERE id = ?', { replacements: [id] });
        if (contacts.length === 0) return res.status(404).json({ success: false, message: 'Không tìm thấy tin nhắn liên hệ này.' });

        await sendEmailViaEmailJS('template_security', {
            to_email: contacts[0].email,
            subject: `Phản hồi liên hệ: Hỗ trợ khách hàng Aura K`,
            message_html: `<p>Xin chào ${contacts[0].name},</p><p>${replyMessage}</p><hr/><p>Nội dung cũ: ${contacts[0].message}</p>`
        }).catch(err => console.error('Lỗi EmailJS khi phản hồi qua template_security:', err.message));

        await sequelize.query('UPDATE contacts SET is_read = TRUE WHERE id = ?', { replacements: [id] });
        res.status(200).json({ success: true, message: 'Đã gửi phản hồi thành công qua Email!' });
    } catch (error) { res.status(500).json({ success: false, message: 'Lỗi server khi gửi email.' }); }
};

module.exports = { submitContactForm, markContactRead, replyContact };