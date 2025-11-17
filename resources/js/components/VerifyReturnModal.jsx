import React, { useState, useEffect } from 'react';

// Minimal modal used by ViewRequest and ViewApproved
const VerifyReturnModal = ({ isOpen, onClose, returnData, onConfirmReturn }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [itemConditions, setItemConditions] = useState({});
  const [verificationNotes, setVerificationNotes] = useState('');
  const data = returnData || {};

  // Initialize conditions and reset notes when modal opens
  useEffect(() => {
    if (!isOpen || !data.items) {
      setItemConditions({});
      setVerificationNotes('');
      return;
    }

    const initialConditions = {};
    data.items.forEach((item, index) => {
      const itemKey = item.id || `item-${index}`;
      initialConditions[itemKey] = 'good_condition'; // Default to good condition
    });
    setItemConditions(initialConditions);
    setVerificationNotes('');
  }, [isOpen, data.items]);

  if (!isOpen) return null;
  
  // Handle condition change for an item
  const handleConditionChange = (itemKey, condition) => {
    setItemConditions(prev => ({
      ...prev,
      [itemKey]: condition
    }));
  };

  // Helper function to get avatar URL
  const getAvatarUrl = (data) => {
    const avatar = data?.avatar_url || data?.profile_photo_url || data?.photo_url || data?.employee_image || data?.avatar || null;
    // Check if avatar is null, undefined, empty string, or just whitespace
    if (!avatar || (typeof avatar === 'string' && avatar.trim() === '')) return null;
    if (avatar.includes('http') || avatar.startsWith('/storage/')) return avatar;
    return `/storage/${avatar}`;
  };

  // Helper function to get initials
  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get icon URL based on category name
  const getItemIconUrl = (categoryName) => {
    if (!categoryName) return 'https://api.iconify.design/mdi:package-variant.svg';
    
    const category = categoryName.toLowerCase().trim();
    
    // Map categories to icon URLs using Iconify API
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
      'mobile': 'https://api.iconify.design/mdi:cellphone.svg',
      'router': 'https://api.iconify.design/mdi:router-wireless.svg',
      'switch': 'https://api.iconify.design/mdi:network-switch.svg',
      'server': 'https://api.iconify.design/mdi:server.svg',
      'desktop': 'https://api.iconify.design/mdi:desktop-classic.svg',
      'projector': 'https://api.iconify.design/mdi:projector.svg',
      'speaker': 'https://api.iconify.design/mdi:speaker.svg',
      'microphone': 'https://api.iconify.design/mdi:microphone.svg',
      'usb': 'https://api.iconify.design/mdi:usb.svg',
      'cable': 'https://api.iconify.design/mdi:cable-data.svg',
      'adapter': 'https://api.iconify.design/mdi:power-plug.svg',
      'charger': 'https://api.iconify.design/mdi:power-plug.svg',
      'dock': 'https://api.iconify.design/mdi:dock-window.svg',
      'stand': 'https://api.iconify.design/mdi:monitor-stand.svg',
    };
    
    // Check for exact match first
    if (iconMap[category]) {
      return iconMap[category];
    }
    
    // Check for partial matches
    for (const [key, url] of Object.entries(iconMap)) {
      if (category.includes(key) || key.includes(category)) {
        return url;
      }
    }
    
    // Default icon
    return 'https://api.iconify.design/mdi:package-variant.svg';
  };

  const avatarUrl = getAvatarUrl(data);
  const employeeName = data.full_name || data.employee_name || 'N/A';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <style jsx>{`
        .verify-return-scroll::-webkit-scrollbar {
          width: 8px;
        }
        .verify-return-scroll::-webkit-scrollbar-track {
          background: #f7fafc;
          border-radius: 4px;
        }
        .verify-return-scroll::-webkit-scrollbar-thumb {
          background: #cbd5e0;
          border-radius: 4px;
        }
        .verify-return-scroll::-webkit-scrollbar-thumb:hover {
          background: #a0aec0;
        }
      `}</style>
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-[520px] max-w-[95vw] p-5 border border-blue-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-blue-600">Verify Return</h3>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        {/* Employee Info with Avatar */}
        <div className="bg-blue-50 rounded-lg p-3 mb-4 flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center overflow-hidden text-white font-semibold text-sm flex-shrink-0">
            {avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt={employeeName} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.textContent = getInitials(employeeName);
                }}
              />
            ) : (
              getInitials(employeeName)
            )}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{employeeName}</p>
            <p className="text-xs text-gray-600">Employee</p>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          {/* Items Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Items to Return</label>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 verify-return-scroll" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e0 #f7fafc' }}>
              {data.items && data.items.length > 0 ? (
                (() => {
                  // Group items by category_id/category_name first, then by equipment_id
                  const groupedItems = {};
                  data.items.forEach((item) => {
                    // Use category_id if available, otherwise use category_name as unique identifier
                    const categoryId = item.category_id || item.category_name || 'Uncategorized';
                    const equipmentId = item.id || item.equipment_id || 'unknown';
                    // Create unique group key: category_id + equipment_id
                    const groupKey = `${categoryId}|${equipmentId}`;
                    
                    if (!groupedItems[groupKey]) {
                      groupedItems[groupKey] = {
                        categoryId: categoryId,
                        categoryName: item.category_name || item.category || 'Uncategorized',
                        equipmentId: equipmentId,
                        items: []
                      };
                    }
                    groupedItems[groupKey].items.push(item);
                  });

                  return Object.entries(groupedItems).map(([groupKey, group], groupIndex) => {
                    const iconUrl = getItemIconUrl(group.categoryName);
                    
                    return (
                      <div key={groupIndex} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                        {/* Item Header Section */}
                        <div className="px-3 py-2.5 bg-white">
                          <div className="flex items-center space-x-3">
                            <img 
                              src={iconUrl} 
                              alt={group.categoryName}
                              className="h-5 w-5 flex-shrink-0"
                              onError={(e) => {
                                // Fallback to default icon if image fails to load
                                e.target.src = 'https://api.iconify.design/mdi:package-variant.svg';
                              }}
                            />
                            <h5 className="text-sm font-semibold text-gray-900">
                              {group.categoryName}
                            </h5>
                          </div>
                        </div>
                        
                        {/* Divider */}
                        <div className="border-t border-gray-200"></div>
                        
                        {/* Table Section */}
                        <div className="overflow-hidden">
                          {/* Table Header */}
                          <div className="bg-gray-100 border-b border-gray-200">
                            <div className="flex">
                              <div className="px-3 py-1.5 border-r border-gray-200" style={{ width: '30%' }}>
                                <span className="text-xs font-medium text-gray-700">Model</span>
                              </div>
                              <div className="px-3 py-1.5 border-r border-gray-200" style={{ width: '30%' }}>
                                <span className="text-xs font-medium text-gray-700">Serial</span>
                              </div>
                              <div className="px-3 py-1.5" style={{ width: '40%' }}>
                                <span className="text-xs font-medium text-gray-700">Specs</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Table Rows with Condition Selection */}
                          <div className="bg-white">
                            {group.items.map((item, itemIndex) => {
                              const specs = item.specifications || item.specs || '';
                              const model = item.model || item.brand || 'N/A';
                              const serialNumber = item.serial_number || 'N/A';
                              const itemKey = item.id || `item-${groupIndex}-${itemIndex}`;
                              const currentCondition = itemConditions[itemKey] || 'good_condition';
                              
                              return (
                                <div 
                                  key={item.id || itemIndex} 
                                  className={`grid grid-cols-2 ${itemIndex < group.items.length - 1 ? 'border-b border-gray-200' : ''}`}
                                >
                                  <div className="px-3 py-2 border-r border-gray-200">
                                    <span className="text-xs text-gray-700">{serialNumber}</span>
                                  </div>
                                  <div className="px-3 py-2">
                                    <span className="text-xs text-gray-700">{specs || 'N/A'}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                  <p className="text-sm text-gray-500">No items to return</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Admin Verification Notes */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Admin Verification Notes (Optional)
          </label>
          <textarea
            value={verificationNotes}
            onChange={(e) => setVerificationNotes(e.target.value)}
            placeholder="Add any verification notes or observations..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            rows="2"
            maxLength="500"
          />
          <p className="text-xs text-gray-500 mt-1">{verificationNotes.length}/500 characters</p>
        </div>

        <div className="flex justify-end gap-3 mt-5">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-4 py-2 rounded-md bg-gray-300 text-gray-700 hover:bg-gray-400 transition-colors"
            disabled={isProcessing}
          >
            Close
          </button>
          <button 
            type="button" 
            onClick={async () => {
              if (onConfirmReturn) {
                setIsProcessing(true);
                try {
                  // Pass the item conditions and verification notes along with the return data
                  await onConfirmReturn({ 
                    ...data, 
                    itemConditions,
                    verificationNotes 
                  });
                } finally {
                  setIsProcessing(false);
                }
              }
            }}
            disabled={isProcessing}
            className="px-6 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isProcessing ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Verify & Complete Return
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerifyReturnModal;
