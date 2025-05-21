import React from 'react';
import { Category } from '../config';
import OrderItem from './OrderItem';

interface CategorySectionProps {
  category: Category;
}

const CategorySection: React.FC<CategorySectionProps> = ({ category }) => {
  return (
    <section 
      id={category.id} 
      className="py-4 scroll-mt-32"
      data-category-id={category.id}
    >
      <h2 className="text-xl font-bold mb-4 flex items-center">
        <span className="text-2xl mr-2">{category.icon}</span>
        {category.name}
      </h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {category.items.map((item) => (
          <div key={item.id} className="px-4 sm:px-0">
            <OrderItem item={item} />
          </div>
        ))}
      </div>
    </section>
  );
};

export default CategorySection;
