import React, { useState } from 'react';
import { Package, Laptop, Mouse, Keyboard } from 'lucide-react';

// Minimal modal used by ViewRequest and ViewApproved
const VerifyReturnModal = ({ isOpen, onClose, returnData, onConfirmReturn }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  
  if (!isOpen) return null;
  const data = returnData || {};

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

  // Get icon based on item name
  const getItemIcon = (itemName) => {
    const name = itemName?.toLowerCase() || '';
    if (name.includes('laptop') || name.includes('computer')) return Laptop;
    if (name.includes('mouse')) return Mouse;
    if (name.includes('keyboard')) return Keyboard;
    if (name.includes('monitor') || name.includes('display')) return Package;
    return Package; // Default icon
  };

  const avatarUrl = getAvatarUrl(data);
  const employeeName = data.full_name || data.employee_name || 'N/A';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 border border-blue-100">
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
            <div className="space-y-3">
              {data.items && data.items.length > 0 ? (
                (() => {
                  // Group items by equipment name
                  const groupedItems = {};
                  data.items.forEach((item) => {
                    const equipmentName = item.equipment_name || item.name || 'Item';
                    if (!groupedItems[equipmentName]) {
                      groupedItems[equipmentName] = [];
                    }
                    groupedItems[equipmentName].push(item);
                  });

                  return Object.entries(groupedItems).map(([equipmentName, equipmentItems], groupIndex) => {
                    const IconComponent = getItemIcon(equipmentName);
                    
                    return (
                      <div key={groupIndex} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                        {/* Item Header Section */}
                        <div className="px-3 py-2.5">
                          <div className="flex items-center space-x-3">
                            <IconComponent className="h-5 w-5 text-gray-700 flex-shrink-0" />
                            <h5 className="text-sm font-semibold text-gray-900">
                              {equipmentName}
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
                                <span className="text-xs font-medium text-gray-700">Serial</span>
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
                              const serialNumber = item.serial_number || 'N/A';
                              
                              return (
                                <div 
                                  key={item.id || itemIndex} 
                                  className={`grid grid-cols-2 ${itemIndex < equipmentItems.length - 1 ? 'border-b border-gray-200' : ''}`}
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
                  await onConfirmReturn(data);
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
                Confirm Return
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerifyReturnModal;
