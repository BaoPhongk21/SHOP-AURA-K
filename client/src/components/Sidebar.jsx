import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import Card from './UI/Card';
import Button from './UI/Button';
import Input from './UI/Input';

const Sidebar = ({
  categories = [],
  selectedCategory = null,
  onCategoryChange = () => {},
  minPrice: minPriceProp = 1000000,
  onMinPriceChange = () => {},
  priceFilter = 100000000,
  onPriceChange = () => {},
  translateCategoryName = (name) => name,
  getCategoryIcon = (name) => 'label',
  formatPrice = (price) => price.toString(),
  t = (key) => key,
}) => {
  const { language } = useLanguage();
  const [minPrice, setMinPrice] = useState(minPriceProp);
  const [maxPrice, setMaxPrice] = useState(priceFilter);

  const defaultCategories = [
    { id: null, name: 'Tất cả sản phẩm', icon: 'grid_view' },
    { id: 1, name: 'Áo', icon: 'checkroom' },
    { id: 2, name: 'Quần', icon: 'checkroom' },
    { id: 3, name: 'Váy & Đầm', icon: 'female' },
    { id: 4, name: 'Phụ kiện', icon: 'shopping_bag' },
  ];

  const displayCategories = categories && categories.length > 0
    ? [
        { id: null, name: language === 'vi' ? 'Tất cả sản phẩm' : 'All Products', icon: 'grid_view' },
        ...categories.map((cat) => ({
          id: cat.id,
          name: translateCategoryName(cat.name || cat.title || ''),
          icon: getCategoryIcon(cat.name || cat.title || ''),
        })),
      ]
    : defaultCategories;

  const handleApplyPrice = () => {
    onPriceChange(maxPrice);
  };

  return (
    <aside className="hidden lg:flex flex-col p-6 space-y-8 h-full w-72 border-r border-gray-200 bg-gradient-to-b from-indigo-50/50 to-white shrink-0 overflow-y-auto">
      {/* Header */}
      <div className="pb-6 border-b-2 border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 uppercase tracking-widest">
          {language === 'vi' ? 'Danh Mục' : 'Categories'}
        </h3>
      </div>

      {/* Categories */}
      <div className="space-y-2">
        {displayCategories.map((cat) => {
          return (
            <button
              key={`sidebar-cat-${cat.id ?? 'all'}`}
              onClick={() => onCategoryChange(cat.id)}
              className={`w-full flex items-center px-4 py-3 rounded-xl transition-all duration-300 font-inter font-semibold text-sm ${
                selectedCategory === cat.id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/40'
                  : 'text-gray-700 hover:bg-white hover:text-indigo-600 border-2 border-transparent hover:border-indigo-300'
              }`}
            >
              <span className="material-symbols-outlined mr-3 text-base">{cat.icon}</span>
              <span className="truncate">{cat.name}</span>
            </button>
          );
        })}
      </div>

      {/* Price Filter */}
      <Card className="p-5 bg-gradient-to-br from-white to-indigo-50/30">
        <h4 className="font-bold text-sm uppercase tracking-widest text-gray-900 mb-5">
          {language === 'vi' ? 'Lọc theo giá' : 'Filter by Price'}
        </h4>

        {/* Price Filter Inputs */}
        <div className="space-y-4 mb-5">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
              {language === 'vi' ? 'Giá tối thiểu' : 'Min Price'}
            </label>
            <Input
              type="text"
              placeholder="1.000.000"
              value={minPrice.toLocaleString('vi-VN')}
              onChange={(e) => {
                const numeric = Number(e.target.value.replace(/\D/g, '')) || 0;
                setMinPrice(numeric);
                onMinPriceChange(numeric);
              }}
              className="text-gray-900 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
              {language === 'vi' ? 'Giá tối đa' : 'Max Price'}
            </label>
            <Input
              type="text"
              placeholder="100.000.000"
              value={maxPrice.toLocaleString('vi-VN')}
              onChange={(e) => {
                const numeric = Number(e.target.value.replace(/\D/g, '')) || 0;
                setMaxPrice(numeric);
              }}
              className="text-gray-900 py-2 text-sm"
            />
          </div>
        </div>

        {/* Apply Button */}
        <Button variant="primary" size="sm" onClick={handleApplyPrice} className="w-full">
          <span className="material-symbols-outlined text-sm">check</span>
          {language === 'vi' ? 'Áp dụng' : 'Apply'}
        </Button>
      </Card>
    </aside>
  );
};

export default Sidebar;
