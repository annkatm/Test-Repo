import React from 'react';
import { X, Calendar, User, Package, MapPin, FileText, Clock } from 'lucide-react';

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto" style={{ boxShadow: '0 25px 50px -12px rgba(0, 100, 255, 0.4), 0 0 0 1px rgba(0, 100, 255, 0.1)' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Transaction Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Employee & Equipment Info */}
            <div className="space-y-6">
              {/* Employee Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <User className="h-5 w-5 text-blue-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">Employee Information</h3>
                </div>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium text-gray-600">Name:</span>
                    <p className="text-gray-900">{transactionData.name}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Position:</span>
                    <p className="text-gray-900">{transactionData.position}</p>
                  </div>
                </div>
              </div>

              {/* Equipment Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <Package className="h-5 w-5 text-green-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">Equipment Information</h3>
                </div>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium text-gray-600">Item:</span>
                    <p className="text-gray-900">{transactionData.item}</p>
                  </div>
                  {transactionData.brand && (
                    <div>
                      <span className="text-sm font-medium text-gray-600">Brand:</span>
                      <p className="text-gray-900">{transactionData.brand}</p>
                    </div>
                  )}
                  {transactionData.model && (
                    <div>
                      <span className="text-sm font-medium text-gray-600">Model:</span>
                      <p className="text-gray-900">{transactionData.model}</p>
                    </div>
                  )}
                  {transactionData.categoryName && (
                    <div>
                      <span className="text-sm font-medium text-gray-600">Category:</span>
                      <p className="text-gray-900">{transactionData.categoryName}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Request Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <MapPin className="h-5 w-5 text-purple-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">Request Information</h3>
                </div>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium text-gray-600">Request Mode:</span>
                    <p className="text-gray-900">{formatRequestMode(transactionData.requestMode)}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Request Date:</span>
                    <p className="text-gray-900">{formatDate(transactionData.requestDate)}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Transaction Number:</span>
                    <p className="text-gray-900 font-mono">{transactionData.transactionNumber || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Transaction Timeline & Status */}
            <div className="space-y-6">
              {/* Transaction Timeline */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <Clock className="h-5 w-5 text-orange-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">Transaction Timeline</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Request Submitted</p>
                      <p className="text-xs text-gray-600">{formatDate(transactionData.requestDate)}</p>
                    </div>
                  </div>
                  
                  {transactionData.releaseDate && (
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Equipment Released</p>
                        <p className="text-xs text-gray-600">{formatDate(transactionData.releaseDate)}</p>
                      </div>
                    </div>
                  )}
                  
                  {transactionData.expectedReturnDate && (
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Expected Return</p>
                        <p className="text-xs text-gray-600">{formatDate(transactionData.expectedReturnDate)}</p>
                      </div>
                    </div>
                  )}
                  
                  {transactionData.returnDate && (
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Equipment Returned</p>
                        <p className="text-xs text-gray-600">{formatDate(transactionData.returnDate)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Equipment Condition */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <FileText className="h-5 w-5 text-indigo-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">Equipment Condition</h3>
                </div>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium text-gray-600">Release Condition:</span>
                    <p className="text-gray-900">{formatCondition(transactionData.releaseCondition)}</p>
                  </div>
                  {transactionData.returnCondition && (
                    <div>
                      <span className="text-sm font-medium text-gray-600">Return Condition:</span>
                      <p className="text-gray-900">{formatCondition(transactionData.returnCondition)}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              {(transactionData.releaseNotes || transactionData.returnNotes) && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <FileText className="h-5 w-5 text-gray-600 mr-2" />
                    <h3 className="text-lg font-semibold text-gray-900">Notes</h3>
                  </div>
                  <div className="space-y-2">
                    {transactionData.releaseNotes && (
                      <div>
                        <span className="text-sm font-medium text-gray-600">Release Notes:</span>
                        <p className="text-gray-900 text-sm mt-1">{transactionData.releaseNotes}</p>
                      </div>
                    )}
                    {transactionData.returnNotes && (
                      <div>
                        <span className="text-sm font-medium text-gray-600">Return Notes:</span>
                        <p className="text-gray-900 text-sm mt-1">{transactionData.returnNotes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Status Badge */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Current Status:</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    transactionData.status === 'released' 
                      ? 'bg-green-100 text-green-800' 
                      : transactionData.status === 'returned'
                      ? 'bg-blue-100 text-blue-800'
                      : transactionData.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {transactionData.status?.charAt(0).toUpperCase() + transactionData.status?.slice(1)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewTransactionModal;
