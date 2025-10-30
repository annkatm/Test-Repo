import React from 'react';
import { Laptop } from 'lucide-react';

const ItemCategories = ({ categories = [], selectedCategory, onSelectAll, onSelectCategory }) => {
  return (
    <div id="categories-section" className="rounded-xl shadow-md shadow-gray-300 col-span-12 md:col-span-3 overflow-y-auto h-138 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <div className="p-6 h-full">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Item Categories</h2>
        <div className="grid grid-cols-2 gap-3">
          <button
            key="all"
            onClick={onSelectAll}
            className={`aspect-square bg-gray-100 rounded-lg flex flex-col items-center justify-center hover:shadow transition-all cursor-pointer ${
              selectedCategory === null ? 'ring-2 ring-blue-500' : ''
            }`}
          >
            <Laptop className="h-8 w-8 text-gray-600 mb-2" />
            <span className="text-sm font-semibold text-gray-800 text-center px-1 truncate">All</span>
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => onSelectCategory(category)}
              className={`aspect-square bg-gray-100 rounded-lg flex flex-col items-center justify-center hover:shadow transition-all cursor-pointer ${
                selectedCategory === (category.name || category) ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              {category.image ? (
                <div className="w-16 h-16 rounded-lg flex items-center justify-center overflow-hidden mb-2">
                  <img
                    src={
                      category.image.startsWith('http')
                        ? category.image
                        : category.image.startsWith('/storage')
                        ? `${window.location.origin}${category.image}`
                        : `${window.location.origin}/storage/${category.image}`
                    }
                    alt={category.name || 'Category'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.style.display = 'none';
                      e.target.nextElementSibling.style.display = 'flex';
                    }}
                  />
                  <Laptop className="h-8 w-8 text-gray-600 hidden" />
                </div>
              ) : (
                <Laptop className="h-8 w-8 text-gray-600 mb-2" />
              )}
              <span className="text-sm font-semibold text-gray-800 text-center px-1 truncate">
                {category.name || 'Category'}
              </span>
            </button>
          ))}
          {categories.length === 0 && (
            <div className="col-span-2 text-center text-sm text-gray-500 py-8">No categories found</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ItemCategories;
