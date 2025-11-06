import React from 'react';
import useDashboardStats from '../hooks/useDashboardStats';

const StatsCards = ({ transactionStats, onBorrowedClick, onOverdueClick }) => {
  const { stats, loading } = useDashboardStats();

  // Use dynamic stats if available, fallback to transactionStats
  const currentlyBorrowed = stats.items_currently_borrowed || transactionStats.borrowed || 0;
  const deniedItems = stats.denied_requests || transactionStats.overdue || 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
      <div
        className="rounded-2xl bg-blue-600 text-white p-6 shadow-[0_8px_20px_rgba(0,0,0,0.25)] transform transition-transform hover:scale-[1.02] cursor-pointer"
        onClick={onBorrowedClick}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium opacity-90 mb-1">Item Currently Borrowed</h3>
            <div className="text-4xl font-bold">
              {loading ? '...' : currentlyBorrowed}
            </div>
            {stats.last_updated && (
              <div className="text-xs opacity-75 mt-1">
                Updated: {new Date(stats.last_updated).toLocaleTimeString()}
              </div>
            )}
          </div>
          <div className="w-12 h-12 bg-white/25 rounded-full flex items-center justify-center shadow-inner">📦</div>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-gray-100 p-6 shadow-[0_6px_15px_rgba(0,0,0,0.15)] transform transition-transform hover:scale-[1.02] cursor-pointer" onClick={onOverdueClick}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-600 mb-1">Denied Items</h3>
            <div className="text-4xl font-bold text-gray-900">
              {loading ? '...' : deniedItems}
            </div>
            {stats.pending_requests > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                {stats.pending_requests} pending
              </div>
            )}
          </div>
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center shadow-inner">❌</div>
        </div>
      </div>
    </div>
  );
};

export default StatsCards;