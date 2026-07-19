import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../config/api.config';

const ReviewModal = ({ isOpen, onClose, items, language = 'vi' }) => {
  // Loại bỏ các sản phẩm trùng lặp (cùng ID) để không bắt đánh giá 1 sản phẩm nhiều lần
  const uniqueProducts = [];
  const seenIds = new Set();
  
  if (items) {
    items.forEach(item => {
      const productId = item.product_id || item.productId || item.id;
      if (!seenIds.has(productId)) {
        seenIds.add(productId);
        uniqueProducts.push({
          id: productId,
          name: item.product_name || item.productName || item.name,
          image: item.image || item.image_url || item.imageUrl
        });
      }
    });
  }

  // Khởi tạo state đánh giá cho từng sản phẩm
  const [reviews, setReviews] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const buildImageUrl = (path) => {
    if (!path) return 'https://via.placeholder.com/100?text=No+Image';
    if (path.startsWith('http')) return path;
    return `${API_BASE_URL}${path}`;
  };

  if (!isOpen) return null;

  const handleRating = (productId, rating) => {
    setReviews(prev => ({
      ...prev,
      [productId]: { ...prev[productId], rating }
    }));
  };

  const handleComment = (productId, comment) => {
    setReviews(prev => ({
      ...prev,
      [productId]: { ...prev[productId], comment }
    }));
  };

  const handleSubmit = async () => {
    // Validate: Ít nhất 1 sản phẩm phải có đánh giá (rate + comment)
    const validReviews = Object.entries(reviews).filter(
      ([_, review]) => review.rating > 0 && review.comment?.trim().length > 0
    );

    if (validReviews.length === 0) {
      toast.error(language === 'vi' ? 'Vui lòng chọn số sao và viết đánh giá cho ít nhất một sản phẩm.' : 'Please provide rating and comment for at least one product.');
      return;
    }

    setIsSubmitting(true);
    const token = localStorage.getItem('token');
    
    try {
      // Gửi đồng loạt các đánh giá hợp lệ
      const promises = validReviews.map(async ([productId, review]) => {
        const response = await fetch(`${API_BASE_URL}/api/v1/products/${productId}/reviews`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            rating: review.rating,
            comment: review.comment
          })
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Lỗi khi gửi đánh giá');
        }
        return data;
      });

      await Promise.all(promises);

      toast.success(language === 'vi' ? 'Cảm ơn bạn đã đánh giá!' : 'Thank you for your reviews!');
      setReviews({});
      onClose();
    } catch (error) {
      console.error('Submit review error:', error);
      toast.error(error.message || (language === 'vi' ? 'Có lỗi xảy ra khi gửi đánh giá.' : 'Error submitting reviews.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-in">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-900">
            {language === 'vi' ? 'Đánh giá sản phẩm' : 'Review Products'}
          </h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-500 transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          <p className="text-gray-600 mb-6 text-sm">
            {language === 'vi' 
              ? 'Đơn hàng của bạn đã được giao thành công! Hãy dành chút thời gian chia sẻ cảm nhận về các sản phẩm nhé.' 
              : 'Your order has been delivered! Please take a moment to share your thoughts on the products.'}
          </p>

          <div className="space-y-6">
            {uniqueProducts.map((product) => {
              const currentReview = reviews[product.id] || { rating: 0, comment: '' };
              
              return (
                <div key={product.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    <img 
                      src={buildImageUrl(product.image)} 
                      alt={product.name}
                      className="w-20 h-20 object-cover rounded-lg border border-gray-100 bg-gray-50"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 text-sm mb-2">{product.name}</h3>
                      
                      {/* Star Rating */}
                      <div className="flex gap-1 mb-3">
                        {[1, 2, 3, 4, 5].map(star => (
                          <button
                            key={star}
                            onClick={() => handleRating(product.id, star)}
                            className="focus:outline-none transform hover:scale-110 transition-transform"
                          >
                            <span className={`material-symbols-outlined text-2xl ${
                              star <= currentReview.rating ? 'text-yellow-400 [font-variation-settings:"FILL"1]' : 'text-gray-300'
                            }`}>
                              star
                            </span>
                          </button>
                        ))}
                      </div>

                      {/* Comment Input */}
                      <textarea
                        value={currentReview.comment}
                        onChange={(e) => handleComment(product.id, e.target.value)}
                        placeholder={language === 'vi' ? 'Hãy chia sẻ cảm nhận của bạn về sản phẩm này...' : 'Share your thoughts about this product...'}
                        className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none h-24"
                      ></textarea>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl font-medium text-gray-600 hover:bg-gray-200 transition-colors"
          >
            {language === 'vi' ? 'Để sau' : 'Maybe later'}
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl font-bold text-white bg-primary hover:bg-primary-dark transition-colors disabled:opacity-70 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                {language === 'vi' ? 'Đang gửi...' : 'Submitting...'}
              </>
            ) : (
              language === 'vi' ? 'Gửi đánh giá' : 'Submit Reviews'
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ReviewModal;
