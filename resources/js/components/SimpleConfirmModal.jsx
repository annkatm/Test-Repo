import React from 'react';
import { Check, X, AlertTriangle } from 'lucide-react';

const SimpleConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm',
  message = 'Are you sure you want to continue?',
  confirmText = 'Confirm',
  confirmTone = 'primary' // 'primary' | 'danger'
}) => {
  if (!isOpen) return null;

  const isApprove = confirmTone === 'primary';
  const isReject = confirmTone === 'danger';

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
            <X className="h-4 w-4" />
          </button>
          
          <div className="flex items-center space-x-3 mb-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
              isApprove ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {isApprove ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <X className="h-4 w-4 text-red-600" />
              )}
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-800">{title}</h3>
              <p className="text-xs text-gray-600">Please confirm your action</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-3">
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
            {isApprove && (
              <p className="text-sm text-gray-700 mt-1">This will move it to the approved list.</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
              isApprove 
                ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500' 
                : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimpleConfirmModal;


