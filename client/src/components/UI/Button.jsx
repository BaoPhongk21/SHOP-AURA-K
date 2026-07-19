import React from 'react';

const Button = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  type = 'button',
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-bold rounded-xl transition-all duration-300 gap-2 focus:outline-none';
  
  const variants = {
    primary: 'bg-[#1a1a2e] text-[#d4af37] hover:bg-[#2c2c4a] shadow-md hover:shadow-lg disabled:bg-gray-300 disabled:text-gray-500',
    outline: 'border-2 border-[#1a1a2e] text-[#1a1a2e] hover:bg-[#fffbf0] disabled:border-gray-300 disabled:text-gray-400',
    ghost: 'text-[#4a4a6a] hover:bg-gray-100 hover:text-[#1a1a2e]',
    danger: 'bg-red-600 text-white hover:bg-red-700 shadow-md',
  };
  
  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };
  
  const classes = `${baseClasses} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className} ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`;

  return (
    <button
      type={type}
      className={classes}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
