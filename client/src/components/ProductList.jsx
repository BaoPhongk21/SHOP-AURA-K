import React from 'react';
import ProductCard from './ProductCard';

const sampleProducts = [
  {
    id: 101,
    name: 'UNIQLO Easy Care Shirt',
    brand: 'UNIQLO',
    price: 790000,
    image: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80',
    isNew: true,
  },
  {
    id: 102,
    name: 'UNIQLO Smart Trouser',
    brand: 'UNIQLO',
    price: 990000,
    image: 'https://images.unsplash.com/photo-1520975914202-df700f5e5e1f?auto=format&fit=crop&w=600&q=80',
    isNew: false,
  },
  {
    id: 103,
    name: 'UNIQLO Linen Blouse',
    brand: 'UNIQLO',
    price: 650000,
    image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=600&q=80',
    isNew: true,
  },
  {
    id: 104,
    name: 'UNIQLO Wide Jeans',
    brand: 'UNIQLO',
    price: 1100000,
    image: 'https://images.unsplash.com/photo-1514996937319-344454492b37?auto=format&fit=crop&w=600&q=80',
    isNew: false,
  },
  {
    id: 105,
    name: 'UNIQLO Pleated Dress',
    brand: 'UNIQLO',
    price: 1290000,
    image: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80',
    isNew: false,
  },
  {
    id: 106,
    name: 'UNIQLO Minimalist Bag',
    brand: 'UNIQLO',
    price: 450000,
    image: 'https://images.unsplash.com/photo-1533687585530-6e0a70b0b2e2?auto=format&fit=crop&w=600&q=80',
    isNew: false,
  },
  {
    id: 107,
    name: 'UNIQLO Knit Polo',
    brand: 'UNIQLO',
    price: 690000,
    image: 'https://images.unsplash.com/photo-1495121605193-b116b5b9c5d5?auto=format&fit=crop&w=600&q=80',
    isNew: true,
  },
  {
    id: 108,
    name: 'UNIQLO Tailored Skirt',
    brand: 'UNIQLO',
    price: 880000,
    image: 'https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?auto=format&fit=crop&w=600&q=80',
    isNew: false,
  },
];

const ProductList = ({ products = sampleProducts }) => {
  const useProducts = products && products.length > 0 ? products : sampleProducts;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {useProducts.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          isFlashSale={false}
          index={index}
        />
      ))}
    </div>
  );
};

export default ProductList;
