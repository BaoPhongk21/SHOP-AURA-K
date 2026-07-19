import React from 'react';
import StatCard from './UI/StatCard';

const StatCardWrapper = ({ title, value, icon, color = 'blue', ...props }) => {
  return <StatCard title={title} value={value} icon={icon} color={color} variant="modern" {...props} />;
};

export default StatCardWrapper;
