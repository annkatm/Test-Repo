import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';

// This component now renders as a modal directly
const OnProcessTransactions = ({
  onBack,
  requests = [],
  deniedRequests = [],
  setDeniedRequests = () => {},
  fetchDeniedRequests = async () => [],
}) => {
  const logActivity = (message, variant = 'info') => {
    try {
      const prev = JSON.parse(localStorage.getItem('employee_activities') || '[]');
      const entry = { id: Date.now(), message, variant, time: new Date().toISOString() };
      const next = [entry, ...(Array.isArray(prev) ? prev : [])].slice(0, 50);
      localStorage.setItem('employee_activities', JSON.stringify(next));
    } catch (_) {}
  };
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDeniedRequests, setShowDeniedRequests] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalPages = Math.max(1, Math.ceil((requests?.length || 0) / pageSize));
  const paginatedRequests = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return (requests || []).slice(start, end);
  }, [requests, page, pageSize]);

  return (
    <>
      {actionLoading && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/30">
          <div className="h-12 w-12 border-4 border-white/60 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      )}

      {/* Main Modal - Toggles between On Process and Denied Requests */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
        <div className="relative w-full max-w-6xl max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
            <h2 className="text-xl font-bold text-blue-600">
              {showDeniedRequests ? 'Denied Requests' : 'On Process'}
            </h2>
            <button
              onClick={() => { logActivity('On Process: Closed modal', 'info'); onBack(); }}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
            >
              <X size={24} />
            </button>
          </div>

          <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
            {/* Main Table Section */}
            <div className="flex-1 p-6 overflow-y-auto">
              {!showDeniedRequests ? (
                // On Process Table
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left p-3 text-base font-semibold text-gray-800">Date</th>
                      <th className="text-left p-3 text-base font-semibold text-gray-800">Item</th>
                      <th className="text-left p-3 text-base font-semibold text-gray-800">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRequests.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                        onClick={() => logActivity(`On Process: Clicked pending row ${row.id} (${row.item})`, 'info')}
                      >
                        <td className="p-3 text-base text-gray-800 font-semibold">{row.date}</td>
                        <td className="p-3 text-base text-gray-800 font-semibold">{row.item}</td>
                        <td className="p-3">
                          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {paginatedRequests.length === 0 && (
                      <tr>
                        <td colSpan="3" className="p-6 text-center text-gray-500">No records</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ) : (
                // Denied Requests Table
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left p-3 text-base font-semibold text-gray-800">Date</th>
                      <th className="text-left p-3 text-base font-semibold text-gray-800">Item</th>
                      <th className="text-left p-3 text-base font-semibold text-gray-800">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deniedRequests.map((request) => (
                      <tr
                        key={request.id}
                        onClick={() => { setSelectedRequest(request.id); logActivity(`Denied: Selected request ${request.id} (${request.item})`, 'info'); }}
                        className={`cursor-pointer hover:bg-blue-50 transition-colors border-b border-gray-100 ${
                          selectedRequest === request.id ? 'bg-blue-100' : ''
                        }`}
                      >
                        <td className="p-3 text-base text-gray-800 font-semibold">{request.date}</td>
                        <td className="p-3 text-base text-gray-800 font-semibold">{request.item}</td>
                        <td className="p-3 text-sm">
                          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                            {request.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {deniedRequests.length === 0 && (
                      <tr>
                        <td colSpan="3" className="p-6 text-center text-gray-500">No denied requests</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* Sidebar - Toggles between Denied Request Card and Inspect Panel */}
            <div className="w-full md:w-80 lg:w-96 bg-gray-50 p-6 border-t md:border-t-0 md:border-l border-gray-200 flex flex-col gap-4 overflow-y-auto">
              {!showDeniedRequests ? (
                // Denied Request Card (shown in On Process view)
                <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium opacity-90">Denied Request</h3>
                    <div className="w-10 h-10 bg-white bg-opacity-25 rounded-full flex items-center justify-center">
                      <div className="w-4 h-4 bg-white bg-opacity-50 rounded-full"></div>
                    </div>
                  </div>
                  <div className="text-4xl font-bold mb-4">{deniedRequests?.length || 0}</div>
                  <button
                    onClick={async () => {
                      await fetchDeniedRequests();
                      setShowDeniedRequests(true);
                      setSelectedRequest(null);
                      logActivity('On Process: Opened Denied Requests', 'info');
                    }}
                    className="w-full text-sm bg-blue-700 text-white px-4 py-2 rounded-md hover:bg-blue-800 transition"
                  >
                    View All
                  </button>
                </div>
              ) : (
                // Inspect Panel (shown in Denied Requests view)
                <>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-800 text-lg">Inspect</h3>
                    <button
                      onClick={() => {
                        setShowDeniedRequests(false);
                        setSelectedRequest(null);
                        logActivity('Denied: Back to On Process', 'info');
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      ← Back
                    </button>
                  </div>

                  {selectedRequest ? (
                    <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                      <p className="font-semibold text-gray-800">
                        {deniedRequests.find(r => r.id === selectedRequest)?.item}
                      </p>
                      <p className="text-sm text-gray-500">
                        {deniedRequests.find(r => r.id === selectedRequest)?.brand}
                      </p>
                      <p className="text-sm text-gray-500">
                        {deniedRequests.find(r => r.id === selectedRequest)?.model}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 text-center">
                      <p className="text-gray-500 text-sm">Select a request to inspect</p>
                    </div>
                  )}

                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2 text-sm">View Denied Reason</h4>
                    <textarea
                      value={
                        selectedRequest
                          ? deniedRequests.find(r => r.id === selectedRequest)?.reason || ''
                          : ''
                      }
                      readOnly
                      placeholder="No request selected"
                      className="w-full bg-gray-50 rounded-lg border border-gray-300 p-3 min-h-[100px] text-base text-gray-800 resize-none focus:outline-none cursor-default"
                    />
                  </div>

                  <button
                    disabled={!selectedRequest || actionLoading}
                    onClick={() => {
                      if (!selectedRequest || actionLoading) return;
                      setActionLoading(true);
                      setTimeout(() => {
                        setShowDeniedRequests(false);
                        setSelectedRequest(null);
                        logActivity('Denied: Submitted Appeal', 'success');
                        onBack();
                        setActionLoading(false);
                      }, 1000);
                    }}
                    className={`w-full py-2.5 rounded-lg font-medium text-sm shadow-sm transition-all ${
                      selectedRequest
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    } disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    Appeal
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Footer: Pagination - Only show for On Process view */}
          {!showDeniedRequests && (
            <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { const next = Math.max(1, page - 1); if (next !== page) logActivity(`On Process: Page ${next}`, 'info'); setPage(next); }}
                  className="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={page === 1}
                >
                  Prev
                </button>
                <span className="text-sm text-gray-700">Page {page} of {totalPages}</span>
                <button
                  onClick={() => { const next = Math.min(totalPages, page + 1); if (next !== page) logActivity(`On Process: Page ${next}`, 'info'); setPage(next); }}
                  className="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={page === totalPages}
                >
                  Next
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Display</span>
                <select
                  value={pageSize}
                  onChange={(e) => { const n = Number(e.target.value); setPageSize(n); setPage(1); logActivity(`On Process: Page size ${n}`, 'info'); }}
                  className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                >
                  {[5,10,20,50].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default OnProcessTransactions;
