import React, { useMemo, useState } from 'react';

export const readHistory = () => {
  try {
    const raw = localStorage.getItem('ireply_history');
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (_) {
    return [];
  }
};

export const getHistoryCount = () => {
  try {
    const c = localStorage.getItem('ireply_history_count');
    if (c != null) return Number(c) || 0;
    return readHistory().length;
  } catch (_) {
    return 0;
  }
};

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
  const noop = () => {};
  const [localSearch, setLocalSearch] = useState('');
  const [localPerPage, setLocalPerPage] = useState(10);
  const [localPage, setLocalPage] = useState(1);

  const sTerm = searchTerm ?? localSearch;
  const setST = setSearchTerm ?? setLocalSearch;
  const perPage = itemsPerPage ?? localPerPage;
  const setPerPage = setItemsPerPage ?? setLocalPerPage;
  const page = currentPage ?? localPage;
  const setPage = setCurrentPage ?? setLocalPage;
  const log = logActivity ?? noop;

  const sourceData = (sortedData && sortedData.length ? sortedData : readHistory());

  const olderThan24h = (a) => {
    const raw = a?.time ?? a?.date ?? null;
    if (!raw) return false;
    const ts = new Date(raw).getTime();
    if (Number.isNaN(ts)) return false;
    const now = Date.now();
    return now - ts > 24 * 60 * 60 * 1000;
  };

  const filtered = useMemo(() => {
    const q = (sTerm || '').toString().toLowerCase().trim();
    const arr = Array.isArray(sourceData) ? sourceData : [];
    const base = q
      ? arr.filter((it) => (it?.item || it?.message || '').toString().toLowerCase().includes(q))
      : arr;
    const onlyOld = base.filter(olderThan24h);
    return onlyOld
      .slice()
      .sort((a, b) => new Date(b.date || b.time || 0) - new Date(a.date || a.time || 0));
  }, [sourceData, sTerm]);

  const localTotalPages = Math.max(1, Math.ceil(filtered.length / Math.max(1, perPage)));
  const effectiveTotalPages = totalPages ?? localTotalPages;
  const clampedPage = Math.min(Math.max(1, page), effectiveTotalPages);
  const pageData = useMemo(() => {
    const start = (clampedPage - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, clampedPage, perPage]);

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
          value={sTerm}
          onChange={(e) => {
            setST(e.target.value);
            log(`History search: ${e.target.value}`, 'info');
          }}
          className="px-4 py-2 w-64 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 py-3 px-6 bg-gray-50 border-b border-gray-200 font-semibold text-gray-700 text-sm">
          <div className="col-span-4">Date</div>
          <div className="col-span-5">Item</div>
          <div className="col-span-3">Status</div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-gray-100">
          {pageData.map((item) => (
            <div key={item.id || item.time} className="grid grid-cols-12 py-3 px-6 text-sm">
              <div className="col-span-4">{new Date(item.date || item.time).toLocaleDateString()}</div>
              <div className="col-span-5 truncate">{item.item}</div>
              <div className="col-span-3">{item.status || item.variant || '-'}</div>
            </div>
          ))}
          {pageData.length === 0 && (
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
            onClick={() => setPage(Math.max(clampedPage - 1, 1))}
            disabled={clampedPage === 1}
            className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-lg bg-white text-gray-700 text-sm hover:bg-blue-50 hover:border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ←
          </button>

          {/* Page Numbers */}
          {Array.from({ length: effectiveTotalPages }, (_, i) => i + 1).slice(Math.max(0, clampedPage - 2), Math.min(effectiveTotalPages, clampedPage + 1)).map((i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={`w-10 h-10 flex items-center justify-center border rounded-lg text-sm font-medium transition-all ${clampedPage === i
                ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50 hover:border-blue-400'
                }`}
            >
              {i}
            </button>
          ))}

          {/* Next Button */}
          <button
            onClick={() => setPage(Math.min(clampedPage + 1, effectiveTotalPages))}
            disabled={clampedPage === effectiveTotalPages}
            className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-lg bg-white text-gray-700 text-sm hover:bg-blue-50 hover:border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            →
          </button>
        </div>

        {/* Items per page */}
        <div className="flex items-center gap-2 mt-4 sm:mt-0">
          <span className="text-sm text-gray-700">Items per page:</span>
          <select
            value={perPage}
            onChange={(e) => {
              setPerPage(Number(e.target.value));
              setPage(1);
              log(`History items per page set to ${Number(e.target.value)}`, 'info');
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