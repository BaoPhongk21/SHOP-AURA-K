import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import Footer from '../../components/Footer';
import { CartContext } from '../../context/CartContext';
import { AuthContext } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { getImageUrl } from '../Register/api.config';
import { API_BASE_URL } from '../../config/api.config';

const FALLBACK_AVATAR = 'https://ui-avatars.com/api/?name=Aura+K&background=d4af37&color=1a1a2e&size=96&bold=true';

const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState('');
  const [selectedSizeId, setSelectedSizeId] = useState(null);
  const [selectedColorId, setSelectedColorId] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const { addToCart, flashSaleData } = useContext(CartContext);
  const { user } = useContext(AuthContext);
  const { t, language, formatPrice, translateCategoryName, translateProductName, translateProductDescription } = useLanguage();

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchProductDetail = async () => {
      try {
        setLoading(true);
        setError(null);
        setProduct(null);
        const response = await fetch(`${API_BASE_URL}/api/v1/products/${id}`);
        const data = await response.json();

        if (data.success && data.data) {
          const productData = data.data;
          setProduct(productData);
          const primaryImageUrl = productData.imageUrl || productData.image || productData.image_url;
          const primaryImage = productData.images?.find(img => img.is_primary) || productData.images?.[0];
          setSelectedImage(getImageUrl(primaryImage?.image_url || primaryImageUrl) || 'https://via.placeholder.com/600x800?text=No+Image');

          if (productData.variants && productData.variants.length > 0) {
            const firstInStock = productData.variants.find(v => v.quantity > 0);
            const defaultVariant = firstInStock || productData.variants[0];
            if (defaultVariant) {
              setSelectedSizeId(defaultVariant.size_id);
              setSelectedColorId(defaultVariant.color_id);
            }
          }
        } else {
          setError(data.message || t('productDetail.notFound'));
        }
      } catch (err) {
        setError(t('productDetail.connectionError'));
      } finally {
        setLoading(false);
      }
    };

    fetchProductDetail();
  }, [id, language, t]);

  useEffect(() => {
    const fetchRelatedProducts = async () => {
      if (!product || !product.category_id) return;

      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/products?category=${product.category_id}`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        if (data.success) {
          const filteredRelated = data.data
            .filter(p => p.id !== product.id)
            .slice(0, 4);
          setRelatedProducts(filteredRelated);
        }
      } catch (err) {
        console.error('Error fetching related products:', err);
      }
    };

    fetchRelatedProducts();
  }, [product, id]);

  useEffect(() => {
    const fetchReviews = async () => {
      setReviewsLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/products/${id}/reviews`);
        const data = await response.json();

        if (data.success) {
          setReviews(data.data || []);
        }
      } catch (err) {
        console.error('Error fetching reviews:', err);
      } finally {
        setReviewsLoading(false);
      }
    };
    if (id) fetchReviews();
  }, [id]);

  useEffect(() => {
    setQuantity(1);
  }, [selectedSizeId, selectedColorId]);

  if (loading) {
    return (
      <div className="bg-[#fafaf7] min-h-screen pt-20">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <span className="material-symbols-outlined animate-spin text-5xl text-[#d4af37] mb-4">progress_activity</span>
          <p className="text-base font-bold text-[#1a1a2e]">{t('productDetail.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#fafaf7] min-h-screen pt-20">
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <span className="material-symbols-outlined text-6xl text-red-500 mb-4">error</span>
          <p className="text-lg font-bold text-red-600">{t('common.error')}: {error}</p>
          <Link to="/products" className="mt-6 px-6 py-2.5 bg-gradient-to-r from-[#1a1a2e] to-[#2c2c4a] text-[#d4af37] font-bold rounded-full hover:shadow-lg transition-all">
            {t('productDetail.backToShop')}
          </Link>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="bg-[#fafaf7] min-h-screen pt-20">
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <p className="text-lg font-bold text-[#1a1a2e]">{t('productDetail.notFound')}</p>
        </div>
      </div>
    );
  }

  let availableSizes = [];
  let availableColors = [];
  if (product?.variants && product.variants.length > 0) {
    const sizeMap = new Map();
    const colorMap = new Map();
    product.variants.forEach(variant => {
      if (variant && variant.size_id != null && variant.size_name) {
        if (!sizeMap.has(variant.size_id)) {
          sizeMap.set(variant.size_id, { id: variant.size_id, name: variant.size_name });
        }
      }
      if (variant && variant.color_id != null && variant.color_name) {
        if (!colorMap.has(variant.color_id)) {
          colorMap.set(variant.color_id, { id: variant.color_id, name: variant.color_name, hex: variant.color_hex });
        }
      }
    });
    availableSizes = Array.from(sizeMap.values());
    availableColors = Array.from(colorMap.values());
  }

  const selectedVariant = product?.variants?.find(v =>
    v.size_id === selectedSizeId &&
    v.color_id === (selectedColorId || v.color_id)
  );

  const currentStock = selectedVariant ? (Number(selectedVariant.quantity) || 0) : 0;
  const currentPrice = selectedVariant && selectedVariant.price ? selectedVariant.price : product?.price;

  const now = new Date().getTime();
  const isFlashSale = flashSaleData?.isActive && flashSaleData?.endTime > now &&
    (flashSaleData.ids && flashSaleData.ids.length > 0
      ? flashSaleData.ids.map(Number).includes(Number(product?.id))
      : true);
  const displayPrice = isFlashSale ? currentPrice * 0.8 : currentPrice;

  const handleAddToCart = () => {
    if (availableSizes.length > 0 && !selectedSizeId) {
      toast.error(t('productDetail.selectSize'));
      return;
    }
    if (availableColors.length > 0 && !selectedColorId) {
      toast.error(t('productDetail.selectColor'));
      return;
    }

    const selectedSize = availableSizes.find(s => s.id === selectedSizeId);
    const selectedColor = availableColors.find(c => c.id === selectedColorId);

    const itemToAdd = {
      id: product.id,
      cartItemId: `${product.id}-${selectedSizeId || 'onesize'}-${selectedColorId || 'onecolor'}`,
      name: product.name,
      price: currentPrice,
      quantity: quantity,
      size: selectedSize ? selectedSize.name : 'One Size',
      color: selectedColor ? selectedColor.name : null,
      image: selectedImage,
      category_id: product.category_id,
      stock_quantity: currentStock
    };

    addToCart(itemToAdd);
    toast.success(t('productDetail.addSuccess'));
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error(t('productDetail.loginToReview'));
      return;
    }
    if (!newReviewComment.trim()) {
      toast.error(t('productDetail.emptyReview'));
      return;
    }

    setIsSubmittingReview(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/v1/products/${id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ rating: newReviewRating, comment: newReviewComment })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        toast.success(t('productDetail.reviewSubmitted'));
        setNewReviewComment('');
        setNewReviewRating(5);
        const newReview = data.data || { id: Date.now(), rating: newReviewRating, comment: newReviewComment, created_at: new Date().toISOString(), user: { full_name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User', avatar_url: user.avatar_url } };
        setReviews([newReview, ...reviews]);
      } else {
        toast.error(data.message || t('productDetail.reviewFailed'));
      }
    } catch (err) {
      console.error('Error submitting review:', err);
      toast.error(t('productDetail.serverError'));
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const galleryImages = (product.images && product.images.length > 0
    ? product.images
    : [{ image_url: product.imageUrl || product.image }]
  );

  const showFlashSaleBadge = isFlashSale;

  return (
    <div className="bg-[#fafaf7] text-[#1a1a2e] min-h-screen flex flex-col">
      <Toaster position="top-center" reverseOrder={false} toastOptions={{
        style: { background: 'linear-gradient(135deg, #1a1a2e 0%, #2c2c4a 100%)', color: '#fff', fontWeight: '600', borderRadius: '12px', padding: '14px 18px', border: '1px solid rgba(212,175,55,0.3)' },
        success: { iconTheme: { primary: '#d4af37', secondary: '#1a1a2e' } },
        error: { iconTheme: { primary: '#ef4444', secondary: '#1a1a2e' } },
      }} />

      <main className="pt-20 md:pt-28 flex-grow">
        {/* Breadcrumb */}
        <div className="max-w-screen-xl mx-auto px-4 md:px-8 pb-4 text-xs sm:text-sm text-[#4a4a6a] font-medium">
          <Link to="/" className="hover:text-[#d4af37] transition-colors">{t('nav.home')}</Link>
          <span className="mx-2">/</span>
          <Link to="/products" className="hover:text-[#d4af37] transition-colors">{t('nav.products')}</Link>
          <span className="mx-2">/</span>
          <span className="text-[#1a1a2e] font-bold truncate inline-block max-w-[60%] align-bottom">{translateProductName(product.name)}</span>
        </div>

        <div className="max-w-screen-xl mx-auto px-4 md:px-8 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-start">
          {/* Image Gallery */}
          <div className="flex flex-col-reverse md:flex-row gap-3 lg:gap-4 lg:sticky lg:top-28">
            <div className="flex md:flex-col gap-3 justify-start overflow-x-auto pb-2 md:pb-0 md:max-h-[640px] md:overflow-y-auto">
              {galleryImages.map((image, index) => {
                const imageUrl = getImageUrl(image.image_url || image);
                return (
                  <div
                    key={index}
                    className={`w-16 h-20 rounded-lg overflow-hidden cursor-pointer border-2 shrink-0 transition-all ${selectedImage === imageUrl ? 'border-[#d4af37] shadow-md scale-105' : 'border-gray-200 hover:border-[#d4af37]/50'}`}
                    onClick={() => setSelectedImage(imageUrl)}
                  >
                    <img src={imageUrl} alt={`${product.name} ${index + 1}`} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                );
              })}
            </div>
            <div className="flex-1 aspect-[3/4] max-h-[60vh] md:max-h-[640px] bg-white rounded-2xl overflow-hidden border-2 border-[#d4af37]/15 shadow-xl relative">
              <img src={selectedImage} alt={product.name} className="w-full h-full object-cover" loading="eager" />
              {showFlashSaleBadge && (
                <div className="absolute top-4 right-4 bg-gradient-to-br from-red-500 to-red-600 text-white px-4 py-2 text-xs font-black uppercase tracking-widest shadow-lg rounded-full">
                  {t('productDetail.flashSale')}
                </div>
              )}
            </div>
          </div>

          {/* Product Info */}
          <div className="py-2 md:py-4 space-y-5">
            <p className="text-xs uppercase tracking-[0.3em] text-[#d4af37] font-black">
              {product.brand && product.brand !== 'No Brand' ? product.brand : t('products.auraKBrand')}
            </p>
            <h1
              className="text-3xl md:text-5xl font-black font-headline tracking-tight leading-tight"
              style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #2c2c4a 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
            >
              {translateProductName(product.name)}
            </h1>

            {isFlashSale ? (
              <div className="flex items-center gap-3 flex-wrap py-2">
                <span className="text-3xl md:text-4xl font-black text-red-600">{formatPrice(displayPrice)}</span>
                <span className="text-lg md:text-xl font-medium text-gray-500 line-through">{formatPrice(product.price)}</span>
                <span className="bg-red-600 text-white px-3 py-1.5 rounded-full text-sm font-black shadow-md">-20%</span>
              </div>
            ) : (
              <p className="text-3xl md:text-4xl font-black" style={{ color: '#1a1a2e' }}>
                {formatPrice(product.price)}
              </p>
            )}

            <div className="flex items-center gap-3 text-sm text-[#4a4a6a]">
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((s) => (
                  <span key={s} className="material-symbols-outlined text-base text-yellow-400" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                ))}
              </div>
              <span className="text-[#6b7280]">({reviews.length} {t('productDetail.reviews')})</span>
              <span className="w-1 h-1 rounded-full bg-[#d4af37]"></span>
              <span className={currentStock > 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                {currentStock > 0 ? `✓ ${t('productDetail.inStock')}` : `✕ ${t('productDetail.outOfStock')}`}
              </span>
            </div>

            {product.description && (
              <div className="pt-4 border-t-2 border-dashed border-[#d4af37]/20">
                <h3 className="text-sm font-black uppercase tracking-widest mb-3" style={{ color: '#1a1a2e' }}>
                  {t('productDetail.description')}
                </h3>
                <p className="text-[#4a4a6a] text-sm md:text-base leading-relaxed border-l-4 border-[#d4af37] pl-4">
                  {translateProductDescription(product.description)}
                </p>
              </div>
            )}

            {/* Options */}
            <div className="space-y-6 md:space-y-7 pt-4 border-t-2 border-dashed border-[#d4af37]/20">
              {/* Colors */}
              {availableColors && availableColors.length > 0 && (
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest mb-3" style={{ color: '#1a1a2e' }}>
                    {t('productDetail.color')} <span className="text-[#d4af37]">*</span>
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {availableColors.map((color) => {
                      const isAvailable = product.variants.some(v => v.size_id === selectedSizeId && v.color_id === color.id && v.quantity > 0);
                      return (
                        <button
                          key={color.id}
                          onClick={() => setSelectedColorId(color.id)}
                          title={color.name}
                          className={`relative w-11 h-11 rounded-full transition-all flex items-center justify-center
                            ${selectedColorId === color.id
                              ? 'ring-2 ring-[#d4af37] ring-offset-2 scale-110 shadow-lg'
                              : 'ring-2 ring-gray-200 hover:scale-105 hover:ring-[#d4af37]/50'}
                            ${!isAvailable ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                          style={{ backgroundColor: color.hex || '#000' }}
                        >
                          {selectedColorId === color.id && (
                            <span className="material-symbols-outlined text-white text-base drop-shadow-md" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                          )}
                          {!isAvailable && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-full h-0.5 bg-red-500 transform rotate-45"></div>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sizes */}
              {availableSizes && availableSizes.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-black uppercase tracking-widest" style={{ color: '#1a1a2e' }}>
                      {t('productDetail.size')} <span className="text-[#d4af37]">*</span>
                    </h3>
                    <button onClick={() => setShowSizeGuide(true)} className="text-xs text-[#d4af37] font-bold underline underline-offset-2 hover:text-[#1a1a2e] transition-colors flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">straighten</span>
                      {t('productDetail.sizeGuide')}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {availableSizes.map((size) => {
                      const variantForSize = product.variants.find(v => v.size_id === size.id && v.color_id === (selectedColorId || v.color_id));
                      const isAvailable = variantForSize && variantForSize.quantity > 0;
                      return (
                        <button
                          key={size.id}
                          disabled={!isAvailable}
                          onClick={() => setSelectedSizeId(size.id)}
                          className={`relative px-6 py-2.5 border-2 rounded-lg transition-all font-bold min-w-[3.5rem]
                            ${!isAvailable
                              ? 'border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed opacity-50'
                              : selectedSizeId === size.id
                                ? 'bg-gradient-to-r from-[#1a1a2e] to-[#2c2c4a] text-[#d4af37] border-[#d4af37] shadow-lg scale-105'
                                : 'border-gray-300 text-[#1a1a2e] hover:border-[#d4af37] hover:bg-[#fffbf0] cursor-pointer'}`}
                        >
                          {size.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest mb-3" style={{ color: '#1a1a2e' }}>
                  {t('productDetail.quantity')}
                </h3>
                <div className="inline-flex items-center border-2 border-[#d4af37]/30 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="w-11 h-11 flex items-center justify-center hover:bg-[#fffbf0] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    disabled={quantity <= 1}
                  >
                    <span className="material-symbols-outlined text-base">remove</span>
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val) && val >= 1 && val <= currentStock) setQuantity(val);
                      else if (e.target.value === '') setQuantity('');
                    }}
                    onBlur={() => { if (quantity === '' || quantity < 1) setQuantity(1); }}
                    className="w-14 h-11 text-center font-black text-[#1a1a2e] border-x-2 border-[#d4af37]/30 outline-none appearance-none bg-white"
                    disabled={currentStock === 0}
                  />
                  <button
                    onClick={() => {
                      if (quantity < currentStock) setQuantity(q => q + 1);
                    }}
                    disabled={quantity >= currentStock || currentStock === 0}
                    className="w-11 h-11 flex items-center justify-center hover:bg-[#fffbf0] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="material-symbols-outlined text-base">add</span>
                  </button>
                </div>
                <span className="ml-4 text-xs text-[#6b7280] font-medium">
                  {t('productDetail.sold')}: {product.sold_count || 0}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-2">
              <button
                onClick={handleAddToCart}
                disabled={currentStock === 0}
                className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#1a1a2e] to-[#2c2c4a] text-[#d4af37] font-black py-4 rounded-xl hover:from-[#d4af37] hover:to-[#e8c468] hover:text-[#1a1a2e] transition-all shadow-lg hover:shadow-2xl hover:shadow-[#d4af37]/30 disabled:from-gray-300 disabled:to-gray-400 disabled:text-gray-600 disabled:cursor-not-allowed group"
              >
                <span className="material-symbols-outlined text-xl group-hover:scale-110 transition-transform">add_shopping_cart</span>
                <span className="uppercase tracking-widest text-sm">{currentStock === 0 ? t('productDetail.outOfStock') : t('productDetail.addToCart')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <section className="max-w-screen-xl mx-auto px-4 md:px-8 mt-20 border-t-2 border-dashed border-[#d4af37]/30 pt-16" id="reviews">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-3 justify-center mb-3">
              <span className="w-10 h-[2px] bg-gradient-to-r from-transparent to-[#d4af37] rounded-full"></span>
              <span className="text-[#d4af37] uppercase text-xs tracking-[0.35em] font-bold">{t('productDetail.customerReviews')}</span>
              <span className="w-10 h-[2px] bg-gradient-to-l from-transparent to-[#d4af37] rounded-full"></span>
            </div>
            <h2
              className="text-3xl md:text-4xl font-black tracking-tight"
              style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #2c2c4a 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
            >
              {t('productDetail.reviewsTitle')}
            </h2>
          </div>

          {/* Form review */}
          <div className="bg-white p-6 md:p-8 rounded-3xl border-2 border-[#d4af37]/20 shadow-xl mb-10">
            <h3 className="text-lg font-black mb-5" style={{ color: '#1a1a2e' }}>{t('productDetail.writeReview')}</h3>
            {!user ? (
              <div className="text-center py-6 bg-[#fffbf0] rounded-2xl border border-[#d4af37]/20">
                <span className="material-symbols-outlined text-4xl text-[#d4af37] mb-3 inline-block">lock</span>
                <p className="text-[#4a4a6a] mb-4 font-medium">{t('productDetail.loginToReviewMessage')}</p>
                <Link to="/login" className="inline-block px-7 py-2.5 bg-gradient-to-r from-[#1a1a2e] to-[#2c2c4a] text-[#d4af37] font-black rounded-full hover:shadow-lg transition-all text-sm uppercase tracking-widest">
                  {t('loginRegister.loginBtn')}
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="space-y-5">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest mb-3" style={{ color: '#1a1a2e' }}>
                    {t('productDetail.yourRating')}
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button type="button" key={star} onClick={() => setNewReviewRating(star)} className="outline-none hover:scale-110 transition-transform">
                        <span className={`material-symbols-outlined text-4xl ${star <= newReviewRating ? 'text-yellow-400' : 'text-gray-300'}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                          star
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label htmlFor="review-comment" className="block text-xs font-black uppercase tracking-widest mb-2" style={{ color: '#1a1a2e' }}>
                    {t('productDetail.yourComment')}
                  </label>
                  <textarea
                    id="review-comment"
                    rows="4"
                    value={newReviewComment}
                    onChange={(e) => setNewReviewComment(e.target.value)}
                    placeholder={t('productDetail.reviewPlaceholder')}
                    className="w-full p-4 bg-[#fffbf0] border-2 border-[#d4af37]/20 rounded-2xl focus:ring-2 focus:ring-[#d4af37]/30 focus:border-[#d4af37] outline-none transition-all resize-none text-sm text-[#1a1a2e] placeholder:text-gray-400"
                  ></textarea>
                </div>
                <div className="flex justify-end">
                  <button type="submit" disabled={isSubmittingReview || !newReviewComment.trim()} className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-[#1a1a2e] to-[#2c2c4a] text-[#d4af37] font-black rounded-full shadow-md hover:shadow-xl hover:from-[#d4af37] hover:to-[#e8c468] hover:text-[#1a1a2e] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm uppercase tracking-widest">
                    {isSubmittingReview ? t('common.processing') : t('productDetail.submitReview')}
                    <span className="material-symbols-outlined text-sm">send</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {reviewsLoading ? (
            <div className="text-center py-8 text-[#6b7280] font-bold">
              <span className="material-symbols-outlined animate-spin text-3xl text-[#d4af37] mr-2 inline-block align-middle">progress_activity</span>
              {t('productDetail.loadingReviews')}
            </div>
          ) : reviews.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {reviews.map((review, index) => (
                <div key={review.id || index} className="bg-white p-5 rounded-2xl border-2 border-[#d4af37]/15 shadow-sm hover:shadow-md hover:border-[#d4af37]/40 transition-all flex gap-4">
                  <img
                    src={getImageUrl(review.user?.avatar_url) || FALLBACK_AVATAR}
                    alt={review.user?.full_name || 'Customer'}
                    className="w-12 h-12 rounded-full object-cover border-2 border-[#d4af37]/30 bg-[#fffbf0]"
                    loading="lazy"
                    onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_AVATAR; }}
                  />
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-black" style={{ color: '#1a1a2e' }}>{review.user?.full_name || t('productDetail.auraCustomer')}</h4>
                      <span className="text-xs font-bold" style={{ color: '#6b7280' }}>
                        {new Date(review.created_at || review.createdAt).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US')}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5 mb-3">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className={`material-symbols-outlined text-base ${i < (review.rating || 5) ? 'text-yellow-400' : 'text-gray-300'}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                          star
                        </span>
                      ))}
                    </div>
                    <p className="text-[#4a4a6a] text-sm leading-relaxed">{review.comment || t('productDetail.noComment')}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white p-12 rounded-3xl border-2 border-dashed border-[#d4af37]/30 text-center">
              <span className="material-symbols-outlined text-6xl text-[#d4af37]/40 mb-4 inline-block" style={{ fontVariationSettings: "'FILL' 1" }}>reviews</span>
              <h3 className="text-lg font-black mb-2" style={{ color: '#1a1a2e' }}>{t('productDetail.noReviews')}</h3>
              <p className="text-[#6b7280] font-medium">{t('productDetail.beFirstReviewer')}</p>
            </div>
          )}
        </section>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="mt-24 py-16 md:py-20 bg-gradient-to-br from-[#fffbf0]/40 to-white">
            <div className="max-w-screen-xl mx-auto px-4 md:px-8">
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-3 justify-center mb-3">
                  <span className="w-10 h-[2px] bg-gradient-to-r from-transparent to-[#d4af37] rounded-full"></span>
                  <span className="text-[#d4af37] uppercase text-xs tracking-[0.35em] font-bold">{t('productDetail.youMayAlsoLike')}</span>
                  <span className="w-10 h-[2px] bg-gradient-to-l from-transparent to-[#d4af37] rounded-full"></span>
                </div>
                <h2
                  className="text-3xl md:text-4xl font-black tracking-tight"
                  style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #2c2c4a 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
                >
                  {t('productDetail.relatedProducts')}
                </h2>
                <p className="text-[#6b7280] mt-3 font-medium">{t('productDetail.relatedDesc')}</p>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                {relatedProducts.map((relatedProduct, index) => {
                  const displayImage = getImageUrl(relatedProduct.imageUrl || relatedProduct.image || relatedProduct.image_url) || 'https://via.placeholder.com/300x400?text=No+Image';
                  const isRelatedFlashSale = flashSaleData?.isActive && flashSaleData?.endTime > now &&
                    (flashSaleData.ids && flashSaleData.ids.length > 0
                      ? flashSaleData.ids.map(Number).includes(Number(relatedProduct.id))
                      : true);
                  const relatedDisplayPrice = isRelatedFlashSale ? relatedProduct.price * 0.8 : relatedProduct.price;
                  return (
                    <Link
                      to={`/product/${relatedProduct.id}`}
                      key={relatedProduct.id || index}
                      className="group bg-white rounded-2xl border-2 border-gray-100 hover:border-[#d4af37]/50 shadow-sm hover:shadow-2xl hover:shadow-[#d4af37]/15 transition-all duration-500 hover:-translate-y-2 overflow-hidden block"
                      onClick={() => window.scrollTo(0, 0)}
                    >
                      <div className="relative aspect-[3/4] overflow-hidden bg-[#fafaf7]">
                        <img className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={relatedProduct.name} src={displayImage} loading="lazy" />
                        {isRelatedFlashSale && (
                          <div className="absolute top-3 left-3 bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-1 text-[10px] font-black uppercase tracking-widest shadow-md rounded-full">
                            -20%
                          </div>
                        )}
                        <button className="absolute bottom-3 right-3 bg-gradient-to-r from-[#1a1a2e] to-[#2c2c4a] text-[#d4af37] p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:scale-110 shadow-lg">
                          <span className="material-symbols-outlined">add_shopping_cart</span>
                        </button>
                      </div>
                      <div className="p-4">
                        <p className="text-[10px] uppercase tracking-widest text-[#d4af37] font-black mb-1 truncate">
                          {relatedProduct.brand && relatedProduct.brand !== 'No Brand' ? relatedProduct.brand : t('products.auraKBrand')}
                        </p>
                        <h3 className="font-bold text-sm mb-2 truncate" style={{ color: '#1a1a2e' }}>{translateProductName(relatedProduct.name)}</h3>
                        {isRelatedFlashSale ? (
                          <div className="flex items-center gap-2">
                            <p className="text-red-600 font-black">{formatPrice(relatedDisplayPrice)}</p>
                            <p className="text-xs text-gray-400 line-through font-medium">{formatPrice(relatedProduct.price)}</p>
                          </div>
                        ) : (
                          <p className="font-black" style={{ color: '#1a1a2e' }}>{formatPrice(relatedProduct.price)}</p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />

      {/* Size Guide Modal */}
      {showSizeGuide && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowSizeGuide(false)}>
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div
              className="px-6 py-5 flex justify-between items-center relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #2c2c4a 100%)' }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#d4af37]/10 rounded-full blur-3xl pointer-events-none"></div>
              <div className="relative">
                <h2 className="text-xl font-black text-white">{t('productDetail.sizeGuide')}</h2>
                <p className="text-[#d4af37] text-sm mt-1 font-medium">{t('productDetail.sizeGuideUnit')}</p>
              </div>
              <button onClick={() => setShowSizeGuide(false)} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                <span className="material-symbols-outlined text-white text-xl">close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[75vh]">
              <div className="mb-6 p-4 bg-[#fffbf0] border-2 border-[#d4af37]/30 rounded-2xl">
                <h3 className="font-black mb-3 flex items-center gap-2" style={{ color: '#1a1a2e' }}>
                  <span className="material-symbols-outlined text-[#d4af37] text-lg">info</span>
                  {t('productDetail.howToMeasure')}
                </h3>
                <ul className="text-sm space-y-2 text-[#4a4a6a]">
                  <li className="flex gap-2"><span>•</span><div><strong style={{ color: '#1a1a2e' }}>{t('productDetail.chest')}:</strong> {t('productDetail.chestDesc')}</div></li>
                  <li className="flex gap-2"><span>•</span><div><strong style={{ color: '#1a1a2e' }}>{t('productDetail.waist')}:</strong> {t('productDetail.waistDesc')}</div></li>
                  <li className="flex gap-2"><span>•</span><div><strong style={{ color: '#1a1a2e' }}>{t('productDetail.hips')}:</strong> {t('productDetail.hipsDesc')}</div></li>
                </ul>
              </div>

              <div className="overflow-x-auto rounded-2xl border-2 border-[#d4af37]/20">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #2c2c4a 100%)' }}>
                      <th className="px-4 py-3 text-left font-black text-white border-b border-[#d4af37]/30">Size</th>
                      <th className="px-4 py-3 text-center font-black text-white border-b border-[#d4af37]/30">{t('productDetail.chest')} (cm)</th>
                      <th className="px-4 py-3 text-center font-black text-white border-b border-[#d4af37]/30">{t('productDetail.waist')} (cm)</th>
                      <th className="px-4 py-3 text-center font-black text-white border-b border-[#d4af37]/30">{t('productDetail.hips')} (cm)</th>
                      <th className="px-4 py-3 text-center font-black text-white border-b border-[#d4af37]/30">{t('productDetail.height')} (cm)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#d4af37]/10">
                    {[
                      { size: 'XS', chest: '80–84', waist: '62–66', hip: '86–90', height: '150–155' },
                      { size: 'S',  chest: '84–88', waist: '66–70', hip: '90–94', height: '155–160' },
                      { size: 'M',  chest: '88–92', waist: '70–74', hip: '94–98', height: '160–165' },
                      { size: 'L',  chest: '92–96', waist: '74–78', hip: '98–102', height: '165–170' },
                      { size: 'XL', chest: '96–100', waist: '78–82', hip: '102–106', height: '170–175' },
                      { size: '2XL', chest: '100–106', waist: '82–88', hip: '106–112', height: '175–180' },
                      { size: '3XL', chest: '106–112', waist: '88–94', hip: '112–118', height: '180–185' },
                    ].map((row, i) => (
                      <tr key={row.size} className={i % 2 === 0 ? 'bg-white' : 'bg-[#fffbf0]/50'}>
                        <td className="px-4 py-3 font-black text-[#d4af37]">{row.size}</td>
                        <td className="px-4 py-3 text-center font-bold" style={{ color: '#1a1a2e' }}>{row.chest}</td>
                        <td className="px-4 py-3 text-center font-bold" style={{ color: '#1a1a2e' }}>{row.waist}</td>
                        <td className="px-4 py-3 text-center font-bold" style={{ color: '#1a1a2e' }}>{row.hip}</td>
                        <td className="px-4 py-3 text-center font-bold" style={{ color: '#1a1a2e' }}>{row.height}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="mt-5 text-xs text-center font-medium" style={{ color: '#6b7280' }}>
                {t('productDetail.sizeTip')}
              </p>
            </div>

            <div className="px-6 py-4 border-t border-[#d4af37]/20 flex justify-end" style={{ background: '#fffbf0' }}>
              <button
                onClick={() => setShowSizeGuide(false)}
                className="inline-flex items-center gap-2 px-7 py-2.5 bg-gradient-to-r from-[#1a1a2e] to-[#2c2c4a] text-[#d4af37] font-black rounded-full hover:from-[#d4af37] hover:to-[#e8c468] hover:text-[#1a1a2e] transition-all shadow-md text-sm uppercase tracking-widest"
              >
                <span className="material-symbols-outlined text-sm">check_circle</span>
                {t('productDetail.gotIt')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;
