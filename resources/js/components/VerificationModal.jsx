import React from 'react';
import { Check, X, AlertTriangle, User, Briefcase, Package, Laptop, Mouse, Keyboard, Calendar, X as CloseIcon } from 'lucide-react';

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

  // Get icon based on item name
  const getItemIcon = (itemName) => {
    const name = itemName?.toLowerCase() || '';
    if (name.includes('laptop') || name.includes('computer')) return Laptop;
    if (name.includes('mouse')) return Mouse;
    if (name.includes('keyboard')) return Keyboard;
    if (name.includes('monitor') || name.includes('display')) return Package;
    return Package; // Default icon
  };

  // Parse items from requestData
  const items = requestData?.items || [];
  
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  };

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
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
              <User className="h-6 w-6 text-gray-500" />
            </div>
            
            {/* Employee Info */}
            <div className="flex-1">
              <h4 className="text-base font-bold text-white">{requestData?.employee_name || requestData?.name || 'Employee'}</h4>
              <p className="text-xs text-blue-100">{requestData?.role || 'Employee'}</p>
            </div>
            
            {/* Status */}
            <div className="text-white font-medium text-sm">
              {requestData?.employee_type || 'Regular'}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-3">
          {/* Date Fields - Side by Side */}
          <div className="grid grid-cols-2 gap-3 mb-4">
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

            {/* Return Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Return Date</label>
              <div className="relative">
                <input
                  type="text"
                  value={formatDate(requestData?.expected_return_date || requestData?.return_date) || 'N/A'}
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
            <div className="space-y-2">
              {items.length > 0 ? (
                items.map((item, index) => {
                  const IconComponent = getItemIcon(item.equipment_name || item.name);
                  return (
                    <div key={item.id || index} className="bg-gray-50 border border-gray-200 rounded-lg p-2">
                      <div className="flex items-center space-x-2">
                        <IconComponent className="h-4 w-4 text-gray-600 flex-shrink-0" />
                        <div className="flex items-center space-x-2 min-w-0">
                          <h5 className="text-sm font-semibold text-gray-900 flex-shrink-0">
                            {item.equipment_name || item.name || 'Item'}
                          </h5>
                          {(item.specifications || item.specs) && (
                            <span className="text-sm text-gray-600 truncate">
                              {item.specifications || item.specs}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
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