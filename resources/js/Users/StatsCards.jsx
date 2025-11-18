import React from 'react';

const StatsCards = ({ transactionStats, onBorrowedClick, onOverdueClick }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
      {/* Left: currently borrowed */}
      <div
        className="rounded-2xl bg-blue-600 text-white p-6 shadow-[0_8px_20px_rgba(0,0,0,0.25)] transform transition-transform hover:scale-[1.02] cursor-pointer"
        onClick={onBorrowedClick}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium opacity-90 mb-1">Item Currently Borrowed</h3>
            <div className="text-4xl font-bold">{transactionStats.borrowed}</div>
          </div>
          <div className="w-12 h-12 bg-white/25 rounded-full flex items-center justify-center shadow-inner">📦</div>
        </div>
      </div>

      {/* Right: denied items */}
      <div
        className="rounded-2xl bg-white border border-gray-100 p-6 shadow-[0_6px_15px_rgba(0,0,0,0.15)] transform transition-transform hover:scale-[1.02] cursor-pointer"
        onClick={onOverdueClick}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-600 mb-1">Denied Items</h3>
            <div className="text-4xl font-bold text-gray-900">{transactionStats.overdue}</div>
          </div>
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center shadow-inner">
            <span className="text-lg font-semibold text-red-500">!</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsCards;