import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import Card from './UI/Card';
import Button from './UI/Button';
import { CartContext } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { getImageUrl } from '../pages/Register/api.config';

const ProductCard = ({
  product,
  isFlashSale = false,
  discount = 0,
  displayPrice = 0,
  index = 0,
}) => {
  const { t, formatPrice, translateProductName } = useLanguage();
  const { addToCart } = useContext(CartContext);

  const displayImage = getImageUrl(product.imageUrl || product.image || product.image_url) 
    || `https://picsum.photos/300/400?random=${product.id}`;

  const handleAddToCart = (e) => {
    e.preventDefault();
    const totalStock = product.variants
      ? product.variants.reduce((sum, v) => sum + (Number(v.stock_quantity) || 0), 0)
      : (product.stock_quantity || 10);
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      size: 'Freesize',
      image: displayImage,
      stock_quantity: totalStock,
    });
  };

  return (
    <Link
      to={`/product/${product.id}`}
      className="group"
      data-aos="fade-up"
      data-aos-delay={(index % 10) * 50}
    >
      <Card hover className="overflow-hidden h-full flex flex-col">
        {/* Image Container */}
        <div className="relative aspect-square bg-gradient-to-br from-indigo-50 to-gray-50 overflow-hidden">
          <img
            alt={translateProductName(product.name)}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            src={displayImage}
            loading="lazy"
          />

          {/* Flash Sale Badge */}
          {isFlashSale && (
            <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1 z-10">
              <span className="material-symbols-outlined text-sm">local_fire_department</span>
              -{discount}%
            </div>
          )}

          {/* New Badge - Only show if isNew is true */}
          {product.isNew && (
            <div className="absolute top-4 right-4 bg-accent-500 text-white px-3 py-1 rounded-full text-[10px] font-semibold shadow-lg z-10">
              {t('products.newBadge')}
            </div>
          )}

          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 flex flex-col justify-between">
          {/* Brand */}
          <div className="mb-3">
            <p className="text-xs uppercase tracking-widest font-bold text-gray-700 mb-2">
              {product.brand && product.brand !== 'No Brand' ? product.brand : t('products.auraKBrand')}
            </p>
          </div>

          {/* Name */}
          <h3 className="text-base font-bold text-gray-900 group-hover:text-primary transition-colors line-clamp-2 mb-3">
            {translateProductName(product.name)}
          </h3>

          {/* Price */}
          <div className="mb-5">
            {isFlashSale ? (
              <div className="flex items-center gap-2">
                <span className="text-xl font-semibold text-red-600">
                  {formatPrice(displayPrice)}
                </span>
                <span className="text-xs text-gray-400 line-through font-medium">
                  {formatPrice(product.price)}
                </span>
              </div>
            ) : (
              <span className="text-xl font-semibold text-primary">
                {formatPrice(product.price)}
              </span>
            )}
          </div>

          {/* Add to Cart Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddToCart}
            className="w-full mt-auto"
          >
            <span className="material-symbols-outlined text-base">shopping_cart</span>
            {t('products.addToCart')}
          </Button>
        </div>
      </Card>
    </Link>
  );
};

export default ProductCard;
