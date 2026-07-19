import { useState, useEffect, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Footer from '../../components/Footer';
import Sidebar from '../../components/Sidebar';
import ProductCard from '../../components/ProductCard';
import SortDropdown from '../../components/SortDropdown';
import { CartContext } from '../../context/CartContext';
import useDebounce from '../../hooks/useDebounce';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { useLanguage } from '../../context/LanguageContext';
import { getImageUrl } from '../Register/api.config';
import { API_BASE_URL } from '../../config/api.config';
import { useSettings } from '../../components/SettingsContext';

const Products = () => {
  const { t, language, formatPrice, translateCategoryName, translateProductName } = useLanguage();
  const { settings } = useSettings();
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(location.state?.categoryId || null); // Ưu tiên lấy ID từ trang chủ truyền sang
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [priceFilter, setPriceFilter] = useState(100000000); // Mặc định mức giá cao nhất
  const [sortBy, setSortBy] = useState('newest'); // Trạng thái sắp xếp
  const [searchQuery, setSearchQuery] = useState(''); // State lưu từ khóa tìm kiếm

  // Áp dụng hook useDebounce cho searchQuery với độ trễ 300ms
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const productsPerPage = 10;
  const { flashSaleData, addToCart } = useContext(CartContext);

  useEffect(() => {
    window.scrollTo(0, 0);
    AOS.init({ duration: 800, once: true, easing: 'ease-out-cubic', offset: 50 });
  }, []);

  useEffect(() => {
    // Lấy danh sách danh mục để hiển thị ở sidebar
    const fetchCategories = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/categories`);
        const data = await response.json();
        if (data.success) {
          // Lọc bỏ các danh mục không liên quan đến shop quần áo
          const hiddenCategories = ['beauty', 'fragrances', 'furniture', 'groceries'];
          const filtered = data.data.filter(cat => !hiddenCategories.includes(cat.name.toLowerCase()));
          setCategories(filtered);
        }
      } catch (err) {
        console.error("Lỗi khi lấy danh mục:", err);
      }
    };
    fetchCategories();
  }, []);

  // Lắng nghe sự thay đổi từ location.state (khi người dùng chuyển hướng từ trang chủ sang)
  // Cập nhật category được chọn nếu nó được truyền từ trang khác qua location state
  useEffect(() => {
    if (location.state?.categoryId !== undefined) {
      setSelectedCategory(location.state?.categoryId || null);
      setCurrentPage(1);
      // Xóa state trong history để tránh việc bị áp dụng lại khi remount / reload / chuyển ngôn ngữ
      window.history.replaceState({}, document.title);
    }
  }, [location.state?.categoryId]);

  // Reset trang về 1 khi thay đổi danh mục chọn
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory]);

  // Mỗi khi selectedCategory thay đổi, useEffect sẽ chạy lại để lấy dữ liệu sản phẩm mới
  useEffect(() => {
    const abortController = new AbortController();

    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        let url = `${API_BASE_URL}/api/v1/products?page=${currentPage}&limit=${productsPerPage}&sort=${sortBy}&minPrice=500000&maxPrice=${priceFilter}`;
        if (selectedCategory) {
          url += `&category=${selectedCategory}`;
        }
        if (debouncedSearchQuery) {
          url += `&search=${encodeURIComponent(debouncedSearchQuery)}`;
        }
        const response = await fetch(url, { signal: abortController.signal });
        if (!response.ok) {
          throw new Error(`Lỗi HTTP: ${response.status}`);
        }
        const data = await response.json();
        if (data.success) {
          setProducts(data.data);
          if (data.pagination) {
            setTotalPages(data.pagination.totalPages);
          }
        } else {
          throw new Error(data.message || 'Lỗi không xác định từ server');
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Lỗi khi lấy danh sách sản phẩm:', error);
          setError(error.message);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };
    fetchProducts();

    return () => {
      abortController.abort(); // Hủy request cũ nếu component unmount hoặc dependency thay đổi quá nhanh
    };
  }, [selectedCategory, currentPage, sortBy, priceFilter, debouncedSearchQuery]); // Quan trọng: Lắng nghe sự thay đổi của tất cả bộ lọc

  // Các bộ lọc đã được xử lý ở Backend, chỉ cần gán lại danh sách sản phẩm
  const currentProducts = products;

  // Hàm hỗ trợ chọn icon dựa theo từ khóa trong tên danh mục
  const getCategoryIcon = (categoryName) => {
    const rawName = (categoryName || '').toLowerCase();
    const translatedName = translateCategoryName(categoryName || '').toLowerCase();
    const name = `${rawName} ${translatedName}`;

    if (name.includes('nữ') || name.includes('women') || name.includes('female')) return 'female';
    if (name.includes('nam') || name.includes('men') || name.includes('male')) return 'male';
    if (name.includes('áo') || name.includes('shirt') || name.includes('top') || name.includes('blouse') || name.includes('tee')) return 'checkroom';
    if (name.includes('quần') || name.includes('pants') || name.includes('jeans') || name.includes('trousers') || name.includes('shorts')) return 'checkroom';
    if (name.includes('váy') || name.includes('đầm') || name.includes('dress') || name.includes('skirt')) return 'female';
    if (name.includes('phụ kiện') || name.includes('accessories') || name.includes('bag') || name.includes('kính') || name.includes('jewelry') || name.includes('watch')) return 'shopping_bag';
    if (name.includes('giày') || name.includes('shoe') || name.includes('sneaker') || name.includes('boots')) return 'directions_run';
    if (name.includes('gia dụng') || name.includes('nội thất') || name.includes('furniture') || name.includes('home')) return 'chair';
    if (name.includes('laptop') || name.includes('điện thoại') || name.includes('electronics') || name.includes('tech') || name.includes('phone')) return 'devices';
    return 'label';
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 via-white to-gray-50 text-on-surface min-h-screen flex flex-col transition-colors duration-300">
      <div className="pt-20 flex flex-1 max-w-7xl mx-auto w-full">
        {/* Sidebar */}
        <Sidebar
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          priceFilter={priceFilter}
          onPriceChange={(price) => {
            setPriceFilter(price);
            setCurrentPage(1);
          }}
          translateCategoryName={translateCategoryName}
          getCategoryIcon={getCategoryIcon}
          formatPrice={formatPrice}
          t={t}
        />

        {/* Main Product Area */}
        <main className="flex-1 p-6 md:p-8">
          {/* Search Bar */}
          <div className="mb-8 relative">
            <div className="relative">
              <input
                type="text"
                placeholder={t('nav.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-white border-2 border-gray-200 text-gray-900 text-sm rounded-2xl py-3 pl-12 pr-4 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all shadow-sm focus:shadow-md"
              />
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">
                search
              </span>
            </div>
          </div>

          {/* Header & Sort */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-2">
                {t('products.title')}
              </h1>
              <p className="text-sm text-gray-500">
                {products.length} {t('products.results')}
              </p>
            </div>
            <SortDropdown sortBy={sortBy} onChange={setSortBy} />
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div key={`skeleton-${idx}`} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                    <div className="aspect-square skeleton" />
                    <div className="p-5 space-y-3">
                      <div className="h-3 w-1/3 skeleton rounded" />
                      <div className="h-4 w-3/4 skeleton rounded" />
                      <div className="h-5 w-1/2 skeleton rounded" />
                      <div className="h-10 w-full skeleton rounded-xl" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="col-span-full flex justify-center py-12">
                <div className="text-center">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined text-3xl text-red-600">error</span>
                  </div>
                  <p className="text-red-600 font-medium">
                    {language === 'vi' ? 'Lỗi' : 'Error'}: {error}
                  </p>
                </div>
              </div>
            ) : products.length === 0 ? (
              <div className="col-span-full flex justify-center py-12">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined text-3xl text-gray-400">shopping_bag</span>
                  </div>
                  <p className="text-gray-800 font-semibold">
                    {t('products.noProducts')}
                  </p>
                </div>
              </div>
            ) : (
              currentProducts.map((product, index) => {
                const displayImage = getImageUrl(product.imageUrl || product.image || product.image_url) 
                  || `https://picsum.photos/300/400?random=${product.id}`;

                const now = new Date().getTime();
                const isFlashSale = flashSaleData?.isActive && flashSaleData?.endTime > now && flashSaleData?.ids?.map(Number).includes(Number(product.id));
                const discount = Number(flashSaleData?.discount) || 20;
                const displayPrice = isFlashSale ? product.price * (100 - discount) / 100 : product.price;

                return (
                  <ProductCard
                    key={product.id || index}
                    product={product}
                    isFlashSale={isFlashSale}
                    discount={discount}
                    displayPrice={displayPrice}
                    index={index}
                  />
                );
              })
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-16 flex justify-center items-center gap-3">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="w-10 h-10 flex items-center justify-center rounded-lg border-2 border-gray-200 text-gray-600 hover:border-indigo-500 hover:text-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <span className="material-symbols-outlined text-sm">chevron_left</span>
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-10 h-10 flex items-center justify-center rounded-lg font-bold transition-all ${
                    currentPage === page
                      ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                      : 'border-2 border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="w-10 h-10 flex items-center justify-center rounded-lg border-2 border-gray-200 text-gray-600 hover:border-indigo-500 hover:text-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
          )}
        </main>
      </div>

      <Footer />
    </div>
  );
};

export default Products;
