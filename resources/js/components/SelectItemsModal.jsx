import React, { useState, useEffect } from 'react';
import { X, CheckSquare, Square } from 'lucide-react';

const SelectItemsModal = ({ isOpen, onClose, transactionData, onConfirm }) => {
  const [selectedItems, setSelectedItems] = useState([]);

  useEffect(() => {
    // Reset selection when modal opens with new data
    if (isOpen && transactionData?.items) {
      // Select all items by default
      setSelectedItems(transactionData.items.map((_, index) => index));
    }
  }, [isOpen, transactionData]);

  if (!isOpen || !transactionData) return null;

  const items = transactionData.items || [];

  const toggleItem = (index) => {
    setSelectedItems(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index];
      }
    });
  };

  const toggleAll = () => {
    if (selectedItems.length === items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(items.map((_, index) => index));
    }
  };

  const handleConfirm = () => {
    const selected = items.filter((_, index) => selectedItems.includes(index));
    onConfirm(selected);
  };

  // Get icon URL based on category name
  const getItemIconUrl = (categoryName) => {
    if (!categoryName) return 'https://api.iconify.design/mdi:package-variant.svg';
    
    const category = categoryName.toLowerCase().trim();
    
    const iconMap = {
      'laptop': 'https://api.iconify.design/mdi:laptop.svg',
      'computer': 'https://api.iconify.design/mdi:laptop.svg',
      'mouse': 'https://api.iconify.design/mdi:mouse.svg',
      'keyboard': 'https://api.iconify.design/mdi:keyboard.svg',
      'monitor': 'https://api.iconify.design/mdi:monitor.svg',
      'display': 'https://api.iconify.design/mdi:monitor.svg',
      'headphone': 'https://api.iconify.design/mdi:headphones.svg',
      'headphones': 'https://api.iconify.design/mdi:headphones.svg',
      'webcam': 'https://api.iconify.design/mdi:webcam.svg',
      'camera': 'https://api.iconify.design/mdi:camera.svg',
      'printer': 'https://api.iconify.design/mdi:printer.svg',
      'scanner': 'https://api.iconify.design/mdi:scanner.svg',
      'tablet': 'https://api.iconify.design/mdi:tablet.svg',
      'phone': 'https://api.iconify.design/mdi:phone.svg',
      'telephone': 'https://api.iconify.design/mdi:phone.svg',
      'mobile': 'https://api.iconify.design/mdi:cellphone.svg',
      'router': 'https://api.iconify.design/mdi:router-wireless.svg',
      'switch': 'https://api.iconify.design/mdi:network-switch.svg',
      'server': 'https://api.iconify.design/mdi:server.svg',
      'desktop': 'https://api.iconify.design/mdi:desktop-classic.svg',
      'projector': 'https://api.iconify.design/mdi:projector.svg',
      'speaker': 'https://api.iconify.design/mdi:speaker.svg',
      'microphone': 'https://api.iconify.design/mdi:microphone.svg',
    };
    
    if (iconMap[category]) return iconMap[category];
    
    for (const [key, url] of Object.entries(iconMap)) {
      if (category.includes(key) || key.includes(category)) {
        return url;
      }
    }
    
    return 'https://api.iconify.design/mdi:package-variant.svg';
  };

  // Group items by category
  const groupedItems = {};
  items.forEach((item, index) => {
    const categoryName = item.category_name || item.category || 'Uncategorized';
    const categoryId = item.category_id || categoryName;
    const groupKey = `${categoryId}|${item.equipment_id || item.id}`;
    
    if (!groupedItems[groupKey]) {
      groupedItems[groupKey] = {
        categoryName,
        items: []
      };
    }
    groupedItems[groupKey].items.push({ ...item, originalIndex: index });
  });

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <style jsx>{`
        div::-webkit-scrollbar {
          width: 8px;
        }
        div::-webkit-scrollbar-track {
          background: #f7fafc;
          border-radius: 4px;
        }
        div::-webkit-scrollbar-thumb {
          background: #cbd5e0;
          border-radius: 4px;
        }
        div::-webkit-scrollbar-thumb:hover {
          background: #a0aec0;
        }
      `}</style>
      <div className="relative bg-white rounded-2xl shadow-2xl w-[600px] max-w-[95vw] max-h-[90vh] flex flex-col border border-blue-100" style={{ boxShadow: '0 8px 32px rgba(29, 78, 216, 0.35)' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Select Items to Print</h3>
            <p className="text-sm text-gray-600">Choose which items to include in the accountability form</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Select All Toggle */}
          <div className="mb-4 pb-4 border-b border-gray-200">
            <button
              onClick={toggleAll}
              className="flex items-center space-x-3 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
            >
              {selectedItems.length === items.length ? (
                <CheckSquare className="h-5 w-5 text-blue-600" />
              ) : (
                <Square className="h-5 w-5" />
              )}
              <span>
                {selectedItems.length === items.length ? 'Deselect All' : 'Select All'} 
                ({selectedItems.length} of {items.length} selected)
              </span>
            </button>
          </div>

          {/* Items List */}
          <div className="space-y-3">
            {Object.entries(groupedItems).map(([groupKey, group], groupIndex) => {
              const iconUrl = getItemIconUrl(group.categoryName);
              
              return (
                <div key={groupIndex} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  {/* Category Header */}
                  <div className="px-3 py-2.5 bg-gray-50">
                    <div className="flex items-center space-x-3">
                      <img 
                        src={iconUrl} 
                        alt={group.categoryName}
                        className="h-5 w-5 flex-shrink-0"
                        onError={(e) => {
                          e.target.src = 'https://api.iconify.design/mdi:package-variant.svg';
                        }}
                      />
                      <h5 className="text-sm font-semibold text-gray-900">
                        {group.categoryName}
                      </h5>
                    </div>
                  </div>
                  
                  {/* Items */}
                  <div className="divide-y divide-gray-200">
                    {group.items.map((item) => {
                      const isSelected = selectedItems.includes(item.originalIndex);
                      
                      return (
                        <button
                          key={item.originalIndex}
                          onClick={() => toggleItem(item.originalIndex)}
                          className={`w-full px-4 py-3 flex items-start space-x-3 hover:bg-blue-50 transition-colors ${
                            isSelected ? 'bg-blue-50' : 'bg-white'
                          }`}
                        >
                          <div className="pt-0.5">
                            {isSelected ? (
                              <CheckSquare className="h-5 w-5 text-blue-600" />
                            ) : (
                              <Square className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1 text-left">
                            <div className="grid grid-cols-3 gap-3 text-sm">
                              <div>
                                <span className="text-xs text-gray-500 block mb-1">Serial</span>
                                <span className="text-gray-900 font-medium">
                                  {item.serial_number || 'N/A'}
                                </span>
                              </div>
                              <div>
                                <span className="text-xs text-gray-500 block mb-1">Brand</span>
                                <span className="text-gray-900">
                                  {item.brand || 'N/A'}
                                </span>
                              </div>
                              <div>
                                <span className="text-xs text-gray-500 block mb-1">Specs</span>
                                <span className="text-gray-900 text-xs line-clamp-2">
                                  {item.specifications || item.specs || 'N/A'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end items-center space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-md bg-gray-500 text-white hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedItems.length === 0}
            className={`px-6 py-2 rounded-md transition-colors ${
              selectedItems.length === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            Select ({selectedItems.length})
          </button>
        </div>
      </div>
    </div>
  );
};

export default SelectItemsModal;
