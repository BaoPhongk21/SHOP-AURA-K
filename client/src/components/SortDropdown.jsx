import React from 'react';
import { useLanguage } from '../context/LanguageContext';

const SortDropdown = ({ sortBy, onChange }) => {
  const { language } = useLanguage();

  const sortOptions = [
    {
      value: 'newest',
      label: language === 'vi' ? 'Mới nhất' : 'Latest',
    },
    {
      value: 'price_asc',
      label: language === 'vi' ? 'Giá thấp → cao' : 'Low → High',
    },
    {
      value: 'price_desc',
      label: language === 'vi' ? 'Giá cao → thấp' : 'High → Low',
    },
    {
      value: 'name_asc',
      label: language === 'vi' ? 'Tên A → Z' : 'Name A → Z',
    },
  ];

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">
        {language === 'vi' ? 'Sắp xếp' : 'Sort'}
      </span>
      <div className="relative">
        <select
          value={sortBy}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none bg-white border-2 border-gray-200 text-gray-900 font-semibold px-4 py-2 rounded-full text-sm cursor-pointer focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all pr-10 hover:border-gray-300"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-600 font-bold">
          unfold_more
        </span>
      </div>
    </div>
  );
};

export default SortDropdown;
