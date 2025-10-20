import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import api from '../services/api';

const EditTransactionModal = ({ isOpen, onClose, transactionData, onUpdate }) => {
  const [formData, setFormData] = useState({
    expected_return_date: '',
    release_condition: 'good_condition',
    return_condition: 'good_condition',
    release_notes: '',
    return_notes: '',
    status: 'released'
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen && transactionData) {
      setFormData({
        expected_return_date: transactionData.expectedReturnDate || '',
        release_condition: transactionData.releaseCondition || 'good_condition',
        return_condition: transactionData.returnCondition || 'good_condition',
        release_notes: transactionData.releaseNotes || '',
        return_notes: transactionData.returnNotes || '',
        status: transactionData.status || 'released'
      });
      setError(null);
      setSuccess(false);
    }
  }, [isOpen, transactionData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await api.put(`/transactions/${transactionData.id}`, formData);
      
      if (response.data.success) {
        setSuccess(true);
        // Call the onUpdate callback to refresh the parent component
        if (onUpdate) {
          onUpdate(response.data.data);
        }
        // Close modal after a short delay
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setError(response.data.message || 'Failed to update transaction');
      }
    } catch (err) {
      console.error('Error updating transaction:', err);
      setError(err.response?.data?.message || 'Failed to update transaction. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  if (!isOpen || !transactionData) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" style={{ boxShadow: '0 25px 50px -12px rgba(0, 100, 255, 0.4), 0 0 0 1px rgba(0, 100, 255, 0.1)' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Edit Transaction</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            disabled={loading}
          >
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Transaction Info Display */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Transaction Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">Employee:</span>
                <p className="text-gray-900">{transactionData.name}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Equipment:</span>
                <p className="text-gray-900">{transactionData.item}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Transaction #:</span>
                <p className="text-gray-900 font-mono">{transactionData.transactionNumber || 'N/A'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Current Status:</span>
                <p className="text-gray-900 capitalize">{transactionData.status}</p>
              </div>
            </div>
          </div>

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">
                    Transaction updated successfully!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Expected Return Date */}
            <div>
              <label htmlFor="expected_return_date" className="block text-sm font-medium text-gray-700 mb-2">
                Expected Return Date
              </label>
              <input
                type="date"
                id="expected_return_date"
                name="expected_return_date"
                value={formatDate(formData.expected_return_date)}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* Status */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="released">Released</option>
                <option value="returned">Returned</option>
                <option value="lost">Lost</option>
                <option value="damaged">Damaged</option>
              </select>
            </div>

            {/* Release Condition */}
            <div>
              <label htmlFor="release_condition" className="block text-sm font-medium text-gray-700 mb-2">
                Release Condition
              </label>
              <select
                id="release_condition"
                name="release_condition"
                value={formData.release_condition}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="good_condition">Good Condition</option>
                <option value="brand_new">Brand New</option>
                <option value="damaged">Damaged</option>
              </select>
            </div>

            {/* Return Condition */}
            <div>
              <label htmlFor="return_condition" className="block text-sm font-medium text-gray-700 mb-2">
                Return Condition
              </label>
              <select
                id="return_condition"
                name="return_condition"
                value={formData.return_condition}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="good_condition">Good Condition</option>
                <option value="brand_new">Brand New</option>
                <option value="damaged">Damaged</option>
              </select>
            </div>

            {/* Release Notes */}
            <div>
              <label htmlFor="release_notes" className="block text-sm font-medium text-gray-700 mb-2">
                Release Notes
              </label>
              <textarea
                id="release_notes"
                name="release_notes"
                value={formData.release_notes}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter any notes about the equipment release..."
              />
            </div>

            {/* Return Notes */}
            <div>
              <label htmlFor="return_notes" className="block text-sm font-medium text-gray-700 mb-2">
                Return Notes
              </label>
              <textarea
                id="return_notes"
                name="return_notes"
                value={formData.return_notes}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter any notes about the equipment return..."
              />
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5 mr-2" />
                    Update Transaction
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditTransactionModal;
