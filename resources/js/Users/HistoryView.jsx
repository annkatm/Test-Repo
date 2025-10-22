import React from 'react';

const HistoryView = ({
  onBack,
  searchTerm,
  setSearchTerm,
  itemsPerPage,
  setItemsPerPage,
  currentPage,
  setCurrentPage,
  totalPages,
  sortedData,
  logActivity,
}) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-[#2262C6]">History</h1>
        <button
          onClick={() => {
            logActivity('Closed History', 'info');
            onBack();
          }}
          className="flex items-center gap-2 bg-white text-blue-600 font-medium px-4 py-2 rounded-lg shadow hover:shadow-md hover:bg-blue-50 transition-all"
        >
          <span className="text-xl">←</span>
          Back
        </button>
      </div>

      {/* Search bar */}
      <div className="flex justify-between items-center">
        <input
          type="text"
          placeholder="Search by item name..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            logActivity(`History search: ${e.target.value}`, 'info');
          }}
          className="px-4 py-2 w-64 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 py-3 px-6 bg-gray-50 border-b border-gray-200 font-semibold text-gray-700 text-sm">
          <div className="col-span-3">Date</div>
          <div className="col-span-3">Item</div>
          <div className="col-span-3">Status</div>
          <div className="col-span-3">Return Date</div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-gray-100">
          {sortedData.map((item) => (
            <div key={item.id || item.time} className="grid grid-cols-12 py-3 px-6 text-sm">
              <div className="col-span-3">{new Date(item.date || item.time).toLocaleDateString()}</div>
              <div className="col-span-3 truncate">{item.item}</div>
              <div className="col-span-3">{item.status || item.variant || '-'}</div>
              <div className="col-span-3">{item.return_date || '-'}</div>
            </div>
          ))}
          {sortedData.length === 0 && (
            <div className="py-6 px-6 text-sm text-gray-500">No history yet.</div>
          )}
        </div>
      </div>

      {/* Pagination Section */}
      <div className="flex flex-col sm:flex-row items-center justify-between mt-6">
        {/* Centered Pagination */}
        <div className="flex items-center justify-center gap-2">
          {/* Previous Button */}
          <button
            onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
            disabled={currentPage === 1}
            className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-lg bg-white text-gray-700 text-sm hover:bg-blue-50 hover:border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ←
          </button>

          {/* Page Numbers */}
          {Array.from({ length: totalPages }, (_, i) => i + 1).slice(Math.max(0, currentPage - 2), Math.min(totalPages, currentPage + 1)).map((i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i)}
              className={`w-10 h-10 flex items-center justify-center border rounded-lg text-sm font-medium transition-all ${currentPage === i
                ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50 hover:border-blue-400'
                }`}
            >
              {i}
            </button>
          ))}

          {/* Next Button */}
          <button
            onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-lg bg-white text-gray-700 text-sm hover:bg-blue-50 hover:border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            →
          </button>
        </div>

        {/* Items per page */}
        <div className="flex items-center gap-2 mt-4 sm:mt-0">
          <span className="text-sm text-gray-700">Items per page:</span>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
              logActivity(`History items per page set to ${Number(e.target.value)}`, 'info');
            }}
            className="border border-gray-300 rounded-lg px-2 py-1 text-sm text-gray-700 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            {[5, 10, 20, 30, 40, 50].map((num) => (
              <option key={num} value={num}>{num}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default HistoryView;
