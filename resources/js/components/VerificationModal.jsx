import React from 'react';
import { Check, X, AlertTriangle, Calendar, X as CloseIcon } from 'lucide-react';

const VerificationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  type, 
  requestData, 
  title, 
  message, 
  confirmText, 
  cancelText,
  showReasonInput = false,
  reason = '',
  onReasonChange = () => {},
  loading = false
}) => {
  if (!isOpen) return null;

  const isApprove = type === 'approve';
  const isReject = type === 'reject';

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

  // Parse items from requestData
  const items = requestData?.items || [];
  
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
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

  const avatarUrl = getAvatarUrl(requestData);
  const employeeName = requestData?.employee_name || requestData?.full_name || requestData?.name || 'Employee';

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
      <style jsx>{`
        @keyframes slideInFromBottom {
          0% {
            transform: translateY(100px);
            opacity: 0;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .modal-animation {
          animation: slideInFromBottom 0.3s ease-out;
        }
      `}</style>
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto modal-animation" style={{ boxShadow: '0 25px 50px -12px rgba(0, 100, 255, 0.4), 0 0 0 1px rgba(0, 100, 255, 0.1)' }}>
        {/* Header */}
        <div className="px-4 py-3 relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
          
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
              {isApprove ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <X className="h-4 w-4 text-red-600" />
              )}
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-800">{title}</h3>
              <p className="text-xs text-gray-600">Please review the details below</p>
            </div>
          </div>
        </div>

        {/* Blue Banner Section */}
        <div className="bg-blue-600 px-4 py-3">
          <div className="flex items-center space-x-3">
            {/* Profile Picture */}
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
            
            {/* Employee Info */}
            <div className="flex-1">
              <h4 className="text-base font-bold text-white">{employeeName}</h4>
              <p className="text-xs text-blue-100">{requestData?.role || 'Employee'}</p>
            </div>
            
            {/* Status */}
            <div className="text-white font-medium text-sm">
              {requestData?.employee_type || requestData?.position || 'Regular'}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-3">
          {/* Date Fields */}
          <div className="mb-4">
            {/* Request Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Request Date</label>
              <div className="relative">
                <input
                  type="text"
                  value={formatDate(requestData?.created_at || requestData?.request_date)}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 text-sm"
                />
                <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Items Section */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Items</label>
            <div className="space-y-3">
              {items.length > 0 ? (
                (() => {
                  // Group items by equipment name
                  const groupedItems = {};
                  items.forEach((item) => {
                    const equipmentName = item.equipment_name || item.name || 'Item';
                    if (!groupedItems[equipmentName]) {
                      groupedItems[equipmentName] = [];
                    }
                    groupedItems[equipmentName].push(item);
                  });

                  return Object.entries(groupedItems).map(([equipmentName, equipmentItems], groupIndex) => {
                    // Get category from first item in the group
                    const categoryName = equipmentItems[0]?.category_name || equipmentItems[0]?.category || equipmentName;
                    const iconUrl = getItemIconUrl(categoryName);
                    
                    return (
                      <div key={groupIndex} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                        {/* Item Header Section */}
                        <div className="px-3 py-2.5">
                          <div className="flex items-center space-x-3">
                            <img 
                              src={iconUrl} 
                              alt={categoryName}
                              className="h-5 w-5 flex-shrink-0"
                              onError={(e) => {
                                // Fallback to default icon if image fails to load
                                e.target.src = 'https://api.iconify.design/mdi:package-variant.svg';
                              }}
                            />
                            <h5 className="text-sm font-semibold text-gray-900">
                              {categoryName}
                            </h5>
                          </div>
                        </div>
                        
                        {/* Divider */}
                        <div className="border-t border-gray-200"></div>
                        
                        {/* Table Section */}
                        <div className="overflow-hidden">
                          {/* Table Header */}
                          <div className="bg-gray-100 border-b border-gray-200">
                            <div className="grid grid-cols-2">
                              <div className="px-3 py-1.5 border-r border-gray-200">
                                <span className="text-xs font-medium text-gray-700">Brand</span>
                              </div>
                              <div className="px-3 py-1.5">
                                <span className="text-xs font-medium text-gray-700">Specs</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Table Rows */}
                          <div className="bg-white">
                            {equipmentItems.map((item, itemIndex) => {
                              const specs = item.specifications || item.specs || '';
                              const brand = item.brand || 'N/A';
                              
                              return (
                                <div key={item.id || item.requestId || itemIndex}>
                                  <div 
                                    className={`grid grid-cols-2 ${itemIndex < equipmentItems.length - 1 ? 'border-b border-gray-200' : ''}`}
                                  >
                                    <div className="px-3 py-2 border-r border-gray-200">
                                      <span className="text-xs text-gray-700">{brand}</span>
                                    </div>
                                    <div className="px-3 py-2">
                                      <span className="text-xs text-gray-700">{specs || 'N/A'}</span>
                                    </div>
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
                  <p className="text-sm text-gray-500">No items requested</p>
                </div>
              )}
            </div>
          </div>

          {/* Warning for Reject */}
          {isReject && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 mb-3">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">Warning</span>
              </div>
              <p className="text-sm text-yellow-700 mt-1">This action cannot be undone!</p>
            </div>
          )}

          {/* Confirmation Message */}
          <div className="mb-4">
            <p className="text-sm text-gray-700">{message}</p>
            <p className="text-sm text-gray-700 mt-1">This will move it to the approved list.</p>
          </div>

          {/* Reason Input for Reject */}
          {showReasonInput && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for rejection:
              </label>
              <textarea
                value={reason}
                onChange={(e) => onReasonChange(e.target.value)}
                placeholder="Please provide a reason for rejecting this request..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows="2"
              />
              <p className="text-xs text-gray-500 mt-1">
                This will help the employee understand why their request was denied.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={loading}
            className={`px-4 py-2 text-sm font-medium text-red-600 bg-pink-100 border border-pink-200 rounded-lg hover:bg-pink-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition-colors ${
              loading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {cancelText || 'Cancel'}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading || (showReasonInput && !reason.trim())}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
              isApprove 
                ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500' 
                : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
            } ${
              loading || (showReasonInput && !reason.trim())
                ? 'opacity-50 cursor-not-allowed' 
                : ''
            }`}
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              confirmText || (isApprove ? 'Approve Request' : 'Reject Request')
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerificationModal;