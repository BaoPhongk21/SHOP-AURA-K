const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI;
try {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'dummy-key-to-prevent-crash');
} catch (error) {
    console.warn("Cảnh báo: Chưa cấu hình GEMINI_API_KEY");
}

const handleChat = async (req, res) => {
    try {
        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.trim() === '') {
            return res.status(500).json({ success: false, message: 'Lỗi: Bạn chưa cấu hình GEMINI_API_KEY trong file .env ở Backend!' });
        }

        const { message, cartInfo, history = [], customerName = 'Khách vãng lai' } = req.body;

        const systemPrompt = `
Bạn là một nhân viên Sale và CSKH xuất sắc tại shop quần áo thời trang Aura K. 
Nhiệm vụ của bạn là tư vấn nhiệt tình, thân thiện và chốt sale giúp shop.

THÔNG TIN KHÁCH HÀNG:
- Tên khách hàng: ${customerName}

THÔNG TIN GIỎ HÀNG HIỆN TẠI CỦA KHÁCH:
${cartInfo}

HƯỚNG DẪN XỬ LÝ:
1. Nếu giỏ hàng có đồ: Hãy khen lựa chọn của khách, hoặc gợi ý mua thêm sản phẩm phối kèm. Nhắc khách vào mục "Giỏ hàng" để thanh toán.
2. Nếu giỏ hàng trống và khách muốn mua đồ: Hãy hỏi rõ sở thích để gợi ý.
3. Nếu khách yêu cầu AI đặt hàng: Hãy báo rằng "Dạ hiện tại em là trợ lý ảo chưa thể tự bấm nút đặt hàng thay anh/chị được. Anh/chị vui lòng chọn sản phẩm và thêm vào giỏ hàng nhé!".
`;

        // ÉP CHỌN MODEL VÀ PHIÊN BẢN API v1 ĐỂ BỎ QUA LỖI v1beta
        const model = genAI.getGenerativeModel(
            { model: "gemini-1.5-flash" },
            { apiVersion: 'v1' }
        );

        // Gộp toàn bộ ngữ cảnh và lịch sử thành 1 chuỗi để gọi generateContent (ổn định hơn startChat)
        const historyText = history.map(h => `${h.role === 'user' ? 'Khách' : 'AI'}: ${h.content}`).join('\n');
        const prompt = `[THÔNG TIN HỆ THỐNG]\n${systemPrompt}\n\n[LỊCH SỬ TRÒ CHUYỆN]\n${historyText}\n\n[TIN NHẮN TỪ KHÁCH HÀNG]:\n${message}`;

        // Gọi API
        const result = await model.generateContent(prompt);
        const reply = result.response.text();

        res.status(200).json({ success: true, reply });
    } catch (error) {
        console.error("Chi tiết lỗi từ Gemini:", error.message || error);
        res.status(500).json({ success: false, message: `Lỗi AI: ${error.message || 'Hệ thống AI từ chối kết nối.'}` });
    }
};

module.exports = { handleChat };