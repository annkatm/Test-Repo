import React from 'react';
import { X, Calendar, User, Package, MapPin, FileText, Clock, CheckCircle } from 'lucide-react';

const ViewTransactionModal = ({ isOpen, onClose, transactionData }) => {
  if (!isOpen || !transactionData) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatRequestMode = (mode) => {
    return mode === 'work_from_home' ? 'Work From Home' : 'Onsite';
  };

  const formatCondition = (condition) => {
    if (!condition) return 'N/A';
    return condition.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Helper function to get avatar URL
  const getAvatarUrl = (data) => {
    const avatar = data?.avatar_url || data?.profile_photo_url || data?.photo_url || data?.employee_image || data?.avatar || null;
    if (!avatar) return null;
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

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="relative bg-white rounded-2xl shadow-2xl w-[460px] max-w-[95vw] border border-blue-100" style={{ boxShadow: '0 8px 32px rgba(29, 78, 216, 0.35)' }}>
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
            <div className="space-y-2">
              {transactionData.items && transactionData.items.length > 0 ? (
                transactionData.items.map((item, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                    <Package className="h-5 w-5 text-blue-600" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.equipment_name || item.name}</p>
                      <p className="text-sm text-gray-600">{item.specifications || item.specs || 'Equipment'}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                  <Package className="h-5 w-5 text-blue-600" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{transactionData.equipment_name || transactionData.item || 'Equipment'}</p>
                    <p className="text-sm text-gray-600">Equipment Item</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Request Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Request Mode</label>
            <div className="w-full px-3 py-2 rounded-md bg-gray-100 text-gray-900">
              {formatRequestMode(transactionData.request_mode || transactionData.requestMode)}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <div className="w-full px-3 py-2 rounded-md bg-gray-100 text-gray-900">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                transactionData.status === 'released' 
                  ? 'bg-green-100 text-green-800' 
                  : transactionData.status === 'returned'
                  ? 'bg-blue-100 text-blue-800'
                  : transactionData.status === 'pending'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {transactionData.status?.charAt(0).toUpperCase() + transactionData.status?.slice(1) || 'Active'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
          >
            Cancel
          </button>
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
