import React, { useEffect, useState } from 'react';
import { X, Calendar, User, Package, MapPin, FileText, Clock, CheckCircle, Printer } from 'lucide-react';

const ViewTransactionModal = ({ isOpen, onClose, transactionData, hideCancel = false, buttonText = 'Release', onRelease = null, onPrint = null }) => {
  if (!isOpen || !transactionData) return null;

  const handleButtonClick = () => {
    if (onRelease) {
      onRelease(transactionData);
    } else {
      onClose();
    }
  };

  const [items, setItems] = useState(Array.isArray(transactionData?.items) ? transactionData.items : []);

  useEffect(() => {
    const base = Array.isArray(transactionData?.items) ? transactionData.items : [];
    const need = base.filter(it => {
      const missingCat = !(it?.category_name || it?.category);
      const missingSerial = !(
        it?.serial_number || it?.equipment_serial_number || it?.serial || it?.asset_tag || it?.equipment?.serial_number
      );
      const missingBrand = !(it?.brand || it?.equipment?.brand);
      const missingSpecs = !(it?.specifications || it?.specs || it?.equipment?.specifications);
      return missingCat || missingSerial || missingBrand || missingSpecs;
    });
    if (need.length === 0) { setItems(base); return; }
    Promise.all(base.map(async (it) => {
      const id = it?.equipment_id || it?.id;
      if (!id) return it;
      try {
        const resp = await fetch(`/api/equipment/${id}`, { credentials: 'same-origin' });
        const j = await resp.json();
        const d = j?.data || j || {};
        const cat = d?.category?.name || d?.category_name || null;
        const enriched = {
          ...it,
          category_name: it.category_name || it.category || cat || it.category_name,
          brand: it.brand || d.brand || it.brand,
          specifications: it.specifications || it.specs || d.specifications || [d.brand, d.model].filter(Boolean).join(' ') || it.specifications,
          serial_number: it.serial_number || it.equipment_serial_number || it.serial || it.asset_tag || d.serial_number || d.asset_tag || it.serial_number,
          equipment: it.equipment || d
        };
        return enriched;
      } catch (_e) { return it; }
    })).then((arr) => {
      // Deduplicate by (equipment_id|id) + serial
      const seen = new Set();
      const deduped = arr.filter((it) => {
        const eqId = it?.equipment_id || it?.id || 'na';
        const sn = it?.serial_number || it?.equipment?.serial_number || '';
        const key = `${eqId}|${sn}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setItems(deduped);
    }).catch(() => setItems(base));
  }, [isOpen, transactionData]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCondition = (condition) => {
    if (!condition) return 'N/A';
    return condition.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
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

  const avatarUrl = getAvatarUrl(transactionData);
  const employeeName = transactionData?.full_name || transactionData?.name || 'N/A';

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
      'telephone': 'https://api.iconify.design/mdi:phone.svg',
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
      <div className="relative bg-white rounded-2xl shadow-2xl w-[520px] max-w-[95vw] border border-blue-100" style={{ boxShadow: '0 8px 32px rgba(29, 78, 216, 0.35)' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <div>
              <h3 className="text-lg font-bold text-gray-900">Current Holder Details</h3>
              <p className="text-sm text-gray-600">Please review the details below</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        {/* Employee Info Header - Blue Section */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center overflow-hidden text-blue-600 font-semibold text-sm">
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
                <h4 className="text-lg font-bold text-white">
                  {employeeName}
                </h4>
                <p className="text-sm text-white/90">Employee</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm text-white font-medium">
                {transactionData.position || 'Regular'}
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Date Fields */}
          <div>
            {/* Request Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Request Date</label>
              <div className="relative">
                <div className="w-full px-3 py-2 rounded-md bg-gray-100 text-gray-900 flex items-center justify-between">
                  <span>{formatDate(transactionData.request_date || transactionData.created_at)}</span>
                  <Calendar className="h-4 w-4 text-gray-500" />
                </div>
              </div>
            </div>
          </div>

          {/* Items Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Items</label>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e0 #f7fafc' }}>
              {items && items.length > 0 ? (
                (() => {
                  // Group items by category_id/category_name first, then by equipment_id
                  const groupedItems = {};
                  items.forEach((item) => {
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
                              <div className="px-3 py-1.5 border-r border-gray-200" style={{ width: '25%' }}>
                                <span className="text-xs font-medium text-gray-700">Serial</span>
                              </div>
                              <div className="px-3 py-1.5 border-r border-gray-200" style={{ width: '25%' }}>
                                <span className="text-xs font-medium text-gray-700">Brand</span>
                              </div>
                              <div className="px-3 py-1.5" style={{ width: '50%' }}>
                                <span className="text-xs font-medium text-gray-700">Specs</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Table Rows */}
                          <div className="bg-white">
                            {group.items.map((item, itemIndex) => {
                              const specs = item.specifications
                                || item.specs
                                || item.equipment?.specifications
                                || [item.brand, item.model].filter(Boolean).join(' ')
                                || item.category_name
                                || '';
                              const brand = item.brand || item.equipment?.brand || 'N/A';
                              const serialNumber = item.serial_number
                                || item.equipment_serial_number
                                || item.serial
                                || item.asset_tag
                                || item.equipment?.serial_number
                                || item.originalData?.serial_number
                                || item.originalData?.serial_no
                                || item.originalData?.serial
                                || 'N/A';
                              
                              return (
                                <div 
                                  key={item.id || itemIndex} 
                                  className={`flex ${itemIndex < group.items.length - 1 ? 'border-b border-gray-200' : ''}`}
                                >
                                  <div className="px-3 py-2 border-r border-gray-200" style={{ width: '25%' }}>
                                    <span className="text-xs text-gray-700">{serialNumber}</span>
                                  </div>
                                  <div className="px-3 py-2 border-r border-gray-200" style={{ width: '25%' }}>
                                    <span className="text-xs text-gray-700">{brand}</span>
                                  </div>
                                  <div className="px-3 py-2" style={{ width: '50%' }}>
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
                  <p className="text-sm text-gray-500">No items found</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200">
          {onPrint ? (
            <button
              onClick={() => onPrint(transactionData)}
              className="flex items-center space-x-2 px-4 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            >
              <Printer className="h-4 w-4" />
              <span>Print Accountability Form</span>
            </button>
          ) : (
            <div></div>
          )}
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewTransactionModal;
