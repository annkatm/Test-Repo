import React, { useState } from 'react';
import { AlertTriangle, X, Package, User, Briefcase } from 'lucide-react';

const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm,
  transactionData,
  type = 'release' // 'release' or 'print'
}) => {
  const [notes, setNotes] = useState('');
  const [condition, setCondition] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    // Validate required fields for release
    if (type === 'release' && !condition.trim()) {
      alert('Equipment condition is required before releasing equipment.');
      return;
    }

    const data = {
      ...transactionData, // Include all original transaction data
      notes: notes.trim() || null,
      condition_on_issue: condition.trim() || null
    };
    onConfirm(data);
    setNotes('');
    setCondition('');
  };

  const handleClose = () => {
    setNotes('');
    setCondition('');
    onClose();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden border border-gray-200 transform transition-all duration-300 scale-100">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-full bg-blue-100 shadow-lg">
                <AlertTriangle className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  Confirm {type === 'release' ? 'Release' : 'Print'}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {type === 'release' 
                    ? 'Are you sure you want to release this equipment?' 
                    : 'Generate a printable receipt for this transaction?'
                  }
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {/* Transaction Summary */}
          <div className="bg-gray-50 rounded-xl p-5 mb-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
              <Package className="h-4 w-4 mr-2" />
              Transaction Summary
            </h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <User className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <span className="text-sm text-gray-600">Employee:</span>
                  <span className="text-sm font-semibold text-gray-900 ml-2">{transactionData?.full_name}</span>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Briefcase className="h-4 w-4 text-purple-600" />
                </div>
                <div className="flex-1">
                  <span className="text-sm text-gray-600">Position:</span>
                  <span className="text-sm font-semibold text-gray-900 ml-2">{transactionData?.position}</span>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Package className="h-4 w-4 text-orange-600" />
                </div>
                <div className="flex-1">
                  <span className="text-sm text-gray-600">Equipment:</span>
                  {transactionData?.items && transactionData.items.length > 0 ? (
                    transactionData.items.length === 1 ? (
                      <span className="text-sm font-semibold text-gray-900 ml-2">
                        {transactionData.items[0].equipment_name}
                      </span>
                    ) : (
                      <div className="ml-2">
                        {transactionData.items.map((item, index) => (
                          <div key={index} className="text-sm font-semibold text-gray-900">
                            • {item.equipment_name}
                          </div>
                        ))}
                      </div>
                    )
                  ) : (
                    <span className="text-sm font-semibold text-gray-900 ml-2">
                      {transactionData?.equipment_name || 'N/A'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Additional Fields for Release */}
          {type === 'release' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Equipment Condition <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  placeholder="e.g., Good, Excellent, Minor scratches"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional notes about the release..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleClose}
              className="px-6 py-3 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all duration-200"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className={`px-6 py-3 text-sm font-semibold text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105 ${
                type === 'release'
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 focus:ring-green-500 shadow-lg'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:ring-blue-500 shadow-lg'
              }`}
            >
              {type === 'release' ? 'Release Equipment' : 'Generate Receipt'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
