import React from 'react';
import { CheckCircle, X, User, Briefcase, Package, Calendar, Clock } from 'lucide-react';

const SuccessModal = ({ 
  isOpen, 
  onClose, 
  type, 
  requestData, 
  action = 'approved' // 'approved' or 'rejected'
}) => {
  if (!isOpen) return null;

  const isApproved = action === 'approved';
  const isRejected = action === 'rejected';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden border border-gray-200 transform transition-all duration-300 scale-100" style={{ boxShadow: '0 25px 50px -12px rgba(0, 100, 255, 0.4), 0 0 0 1px rgba(0, 100, 255, 0.1)' }}>
        {/* Header */}
        <div className={`px-6 py-5 ${isApproved ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200' : 'bg-gradient-to-r from-red-50 to-rose-50 border-b border-red-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-full ${isApproved ? 'bg-green-100' : 'bg-red-100'} shadow-lg`}>
                <CheckCircle className={`h-8 w-8 ${isApproved ? 'text-green-600' : 'text-red-600'}`} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  Request {isApproved ? 'Approved' : 'Rejected'} Successfully!
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {isApproved ? 'The request has been approved and processed.' : 'The request has been rejected.'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {/* Success Message */}
          <div className={`rounded-xl p-4 mb-6 ${isApproved ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-full ${isApproved ? 'bg-green-100' : 'bg-red-100'}`}>
                <CheckCircle className={`h-5 w-5 ${isApproved ? 'text-green-600' : 'text-red-600'}`} />
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  Request from {requestData?.employee_name || requestData?.full_name || requestData?.name || 'Employee'} has been {action} successfully!
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {isApproved 
                    ? 'The equipment will be prepared for assignment.' 
                    : 'The employee has been notified of the rejection.'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Request Summary */}
          <div className="bg-gray-50 rounded-xl p-5 mb-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
              <Package className="h-4 w-4 mr-2" />
              Request Summary
            </h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <User className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <span className="text-sm text-gray-600">Employee:</span>
                  <span className="text-sm font-semibold text-gray-900 ml-2">{requestData?.employee_name || requestData?.full_name || requestData?.name || 'N/A'}</span>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Briefcase className="h-4 w-4 text-purple-600" />
                </div>
                <div className="flex-1">
                  <span className="text-sm text-gray-600">Position:</span>
                  <span className="text-sm font-semibold text-gray-900 ml-2">{requestData?.employee_type || requestData?.position || 'N/A'}</span>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Package className="h-4 w-4 text-orange-600" />
                </div>
                <div className="flex-1">
                  <span className="text-sm text-gray-600">Equipment:</span>
                  {requestData?.items && requestData.items.length > 0 ? (
                    requestData.items.length === 1 ? (
                      <span className="text-sm font-semibold text-gray-900 ml-2">
                        {requestData.items[0].equipment_name || requestData.items[0].name}
                      </span>
                    ) : (
                      <div className="ml-2">
                        {requestData.items.map((item, index) => (
                          <div key={index} className="text-sm font-semibold text-gray-900">
                            • {item.equipment_name || item.name}
                          </div>
                        ))}
                      </div>
                    )
                  ) : (
                    <span className="text-sm font-semibold text-gray-900 ml-2">
                      {requestData?.item || requestData?.equipment_name || 'N/A'}
                    </span>
                  )}
                </div>
              </div>
              {requestData?.requestDate && (
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Calendar className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <span className="text-sm text-gray-600">Request Date:</span>
                    <span className="text-sm font-semibold text-gray-900 ml-2">{requestData?.requestDate}</span>
                  </div>
                </div>
              )}
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Clock className="h-4 w-4 text-gray-600" />
                </div>
                <div className="flex-1">
                  <span className="text-sm text-gray-600">Processed:</span>
                  <span className="text-sm font-semibold text-gray-900 ml-2">
                    {new Date().toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className={`px-6 py-3 text-sm font-semibold text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105 ${
                isApproved 
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 focus:ring-green-500 shadow-lg' 
                  : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 focus:ring-red-500 shadow-lg'
              }`}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuccessModal;
