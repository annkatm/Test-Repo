import React from 'react';
import { CheckCircle, X } from 'lucide-react';

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
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden border border-gray-200" style={{ boxShadow: '0 25px 50px -12px rgba(0, 100, 255, 0.4), 0 0 0 1px rgba(0, 100, 255, 0.1)' }}>
        {/* Header */}
        <div className={`px-6 py-5 ${isApproved ? 'bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200' : 'bg-gradient-to-r from-red-50 to-red-100 border-b border-red-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-full ${isApproved ? 'bg-blue-100' : 'bg-red-100'} shadow-lg`}>
                <CheckCircle className={`h-8 w-8 ${isApproved ? 'text-blue-600' : 'text-red-600'}`} />
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
          <div className={`rounded-xl p-4 ${isApproved ? 'bg-blue-50 border border-blue-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-full ${isApproved ? 'bg-blue-100' : 'bg-red-100'}`}>
                <CheckCircle className={`h-5 w-5 ${isApproved ? 'text-blue-600' : 'text-red-600'}`} />
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
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className={`px-6 py-3 text-sm font-semibold text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105 ${
                isApproved 
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:ring-blue-500 shadow-lg' 
                  : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 focus:ring-red-500 shadow-lg'
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
