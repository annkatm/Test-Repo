import React from 'react';

// Minimal modal used by ViewRequest and ViewApproved
const VerifyReturnModal = ({ isOpen, onClose, returnData }) => {
  if (!isOpen) return null;
  const data = returnData || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 border border-blue-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-blue-600">Verify Return</h3>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Employee</span><span className="font-medium text-gray-900">{data.full_name || data.employee_name || 'N/A'}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Item</span><span className="font-medium text-gray-900">{data.equipment_name || 'N/A'}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Return Date</span><span className="font-medium text-gray-900">{data.return_date || data.expected_return_date || 'N/A'}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Condition on Return</span><span className="font-medium text-gray-900">{data.condition_on_return || data.condition || 'N/A'}</span></div>
        </div>

        <div className="flex justify-end mt-5">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700">Close</button>
        </div>
      </div>
    </div>
  );
};

export default VerifyReturnModal;
