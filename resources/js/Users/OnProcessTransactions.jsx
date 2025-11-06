import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';

// Props now accept dynamic data instead of hardcoded examples
// - requests: array of on-process requests [{ id, date, item, status, details: [{icon,name,description}] }]
const OnProcessTransactions = ({
  onBack,
  requests = [],
  deniedRequests = [],
  setDeniedRequests = () => { },
  fetchDeniedRequests = async () => [],
}) => {
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [list, setList] = useState(requests || []);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isDeniedModalOpen, setIsDeniedModalOpen] = useState(false);
  const [isViewAllOpen, setIsViewAllOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); // page size not used for the main scroll list

  const totalPages = Math.max(1, Math.ceil((list?.length || 0) / pageSize));
  const paginatedRequests = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return (list || []).slice(start, end);
  }, [list, page, pageSize]);

  const selectedRequestData = (list || []).find(req => req.id === selectedRequest);

  useEffect(() => {
    setList(Array.isArray(requests) ? requests : []);
  }, [requests]);

  const handleRowClick = (request) => {
    setSelectedRequest(request.id);
  };

  return (
    <div className="h-full min-h-0 bg-gray-50 p-4 sm:p-6 lg:p-8">
      {/* Hide scrollbars but keep scroll behavior */}
      <style>
        {`
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          .no-scrollbar::-webkit-scrollbar { display: none; }
        `}
      </style>
      {actionLoading && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/30">
          <div className="h-12 w-12 border-4 border-white/60 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header Row - Title and Back Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 -mt-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#2262C6]">On Process</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="bg-white text-blue-600 font-medium px-6 py-3 rounded-lg shadow hover:shadow-md hover:bg-blue-50 transition-all border border-gray-200 w-full sm:w-auto"
            >
              ← Back
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - Table */}
          <div className={`${selectedRequest ? 'lg:col-span-8' : 'lg:col-span-12'}`}>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Table Header - Hidden on mobile, visible on tablet+ */}
              <div className="hidden sm:grid grid-cols-12 bg-gray-50 text-gray-700 font-semibold text-base py-4 px-4 sm:px-6 border-b border-gray-200">
                <div className="col-span-3">Date</div>
                <div className="col-span-6">Item</div>
                <div className="col-span-3">Status</div>
              </div>

              {/* Scrollable Table Rows Container */}
              <div className="max-h-[60vh] overflow-y-auto no-scrollbar">
                <div className="divide-y divide-gray-100">
                  {(list || []).map((row, i) => (
                    <div
                      key={i}
                      onClick={() => handleRowClick(row)}
                      className={`grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-0 items-start sm:items-center py-4 sm:py-6 px-4 sm:px-6 hover:bg-blue-50 transition-colors cursor-pointer ${selectedRequest === row.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                        }`}
                    >
                      {/* Mobile layout */}
                      <div className="sm:hidden space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Date</p>
                            <p className="text-gray-800 text-base font-semibold">{row.date}</p>
                          </div>
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                            {row.status}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Item</p>
                          <p className="text-gray-700 text-base font-semibold">{row.item}</p>
                        </div>
                      </div>

                      {/* Desktop layout */}
                      <div className="hidden sm:contents">
                        <div className="col-span-3 text-gray-800 text-base font-semibold">
                          {row.date}
                        </div>
                        <div className="col-span-6 text-gray-800 text-base font-semibold">
                          {row.item}
                        </div>
                        <div className="col-span-3">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                            {row.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Sliding Panel */}
          <div
            className={`
              fixed lg:relative inset-0 lg:inset-auto z-40 lg:z-auto
              lg:col-span-4 
              ${selectedRequest ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'}
            `}
          >
            {/* Mobile backdrop */}
            <div
              className="lg:hidden absolute inset-0"
              onClick={() => setSelectedRequest(null)}
            />

            {/* Panel content */}
            <div className="absolute right-0 top-0 bottom-0 w-full sm:w-96 lg:w-auto lg:relative bg-gray-50 lg:bg-transparent overflow-y-auto p-4 sm:p-6 lg:p-0">
              <div className="flex flex-col space-y-8">
                {/* Inspect Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                  {/* Header with X button */}
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-gray-900">Inspect</h2>
                    <button
                      onClick={() => setSelectedRequest(null)}
                      className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Overview of specific data */}
                  {selectedRequestData ? (
                    <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-gray-500">Item</div>
                        <div className="text-gray-900 font-semibold">{selectedRequestData.item || '-'}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Brand</div>
                        <div className="text-gray-900 font-semibold">{selectedRequestData.brand || '-'}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Model</div>
                        <div className="text-gray-900 font-semibold">{selectedRequestData.model || '-'}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Request No.</div>
                        <div className="text-gray-900 font-semibold">{selectedRequestData.number || selectedRequestData.request_number || '-'}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Date</div>
                        <div className="text-gray-900 font-semibold">{selectedRequestData.date || '-'}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Status</div>
                        <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                          {selectedRequestData.status || '-'}
                        </div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-gray-500">Reason</div>
                        <div className="text-gray-800">{selectedRequestData.reason || '—'}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-6 text-sm text-gray-500">Select a request to see details.</div>
                  )}

                  {/* Dynamic items based on selected request */}
                  {selectedRequestData?.details.map((item, index) => (
                    <div
                      key={index}
                      className={`flex items-start gap-4 pb-4 ${index < selectedRequestData.details.length - 1 ? 'mb-4 border-b border-gray-100' : 'mb-6'
                        }`}
                    >
                      <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-200 shrink-0">
                        <img src={item.icon} alt={item.name} className="w-7 h-7 object-contain" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 mb-1">{item.name}</p>
                        <p className="text-base text-gray-600 leading-relaxed">{item.description}</p>
                      </div>
                    </div>
                  ))}

                  {/* Cancel Request Button */}
                  <button
                    onClick={() => setIsCancelModalOpen(true)}
                    className="w-full bg-red-50 text-red-600 font-medium px-4 py-2.5 rounded-lg hover:bg-red-100 transition-colors border border-red-200"
                  >
                    Cancel Request
                  </button>
                </div>

                {/* Denied Request Card */}
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
                      const fetched = await fetchDeniedRequests();
                      setIsDeniedModalOpen(true);
                    }}
                    className="w-full text-sm bg-blue-700 text-white px-4 py-2 rounded-md hover:bg-blue-800 transition"
                  >
                    View All
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {isCancelModalOpen && selectedRequestData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="relative bg-white rounded-xl shadow-2xl p-6 w-full max-w-[482px] animate-fadeIn">
            <button
              onClick={() => setIsCancelModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
            >
              <X size={20} />
            </button>
            <h2 className="text-sm font-semibold text-gray-900 mb-6">Cancel Confirmation</h2>

            {/* Dynamic items in modal */}
            {selectedRequestData.details.map((item, index) => (
              <div
                key={index}
                className={`flex items-start gap-4 pb-4 ${index < selectedRequestData.details.length - 1 ? 'mb-4 border-b border-gray-200' : 'mb-8'
                  }`}
              >
                <img
                  src={item.icon}
                  alt={item.name}
                  className="w-14 h-14 object-contain shrink-0"
                />
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 mb-1">{item.name}</p>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}

            {/* Confirm Button */}
            <div className="flex justify-center">
              <button
                onClick={async () => {
                  if (actionLoading) return;
                  setActionLoading(true);
                  try {
                    const reqId = selectedRequestData?.id;
                    const equipId = selectedRequestData?.equipment_id || selectedRequestData?.equipment?.id || selectedRequestData?.equipmentId || selectedRequestData?.item_id || null;
                    // Attempt to cancel via common endpoints (non-fatal if fail)
                    if (reqId) {
                      const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
                      const baseHeaders = { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' };
                      const headers = csrf ? { ...baseHeaders, 'X-CSRF-TOKEN': csrf } : baseHeaders;
                      try { await fetch(`/api/requests/${reqId}/cancel`, { method: 'POST', headers, credentials: 'same-origin' }); } catch (_) {}
                      try { await fetch(`/api/requests/${reqId}`, { method: 'DELETE', headers, credentials: 'same-origin' }); } catch (_) {}
                    }
                    // Notify EmployeeHome to restore this equipment to the available list and un-reserve it for this user
                    if (equipId) {
                      // Persist a restore request so EmployeeHome can process it even if not mounted yet
                      try {
                        const key = 'ireply_restore_queue';
                        const raw = localStorage.getItem(key);
                        const arr = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
                        if (!arr.includes(String(equipId))) arr.push(String(equipId));
                        localStorage.setItem(key, JSON.stringify(arr));
                      } catch (_) {}
                      // Also dispatch a live event for when EmployeeHome is mounted
                      try { window.dispatchEvent(new CustomEvent('ireply:equipment:restore', { detail: { equipment_id: equipId } })); } catch (_) {}
                    } else {
                      // If missing, still ask for a general refresh
                      try { window.dispatchEvent(new CustomEvent('ireply:equipment:restore')); } catch (_) {}
                    }
                    // Tell dashboards to drop this request from any pending/on-process lists
                    try { window.dispatchEvent(new CustomEvent('ireply:request:cancelled', { detail: { request_id: reqId, equipment_id: equipId } })); } catch (_) {}
                    // Optimistically remove from local On Process list
                    try { setList((prev) => (Array.isArray(prev) ? prev.filter(r => String(r.id) !== String(reqId) && String(r.equipment_id || '') !== String(equipId || '')) : prev)); } catch (_) {}
                  } finally {
                    setIsCancelModalOpen(false);
                    setSelectedRequest(null);
                    onBack();
                    setActionLoading(false);
                  }
                }}
                disabled={actionLoading}
                className="px-8 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Denied Requests Modal */}
      {isDeniedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="relative w-full max-w-6xl max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
              <h2 className="text-xl font-bold text-blue-600">Denied Requests</h2>
              <button
                onClick={() => setIsDeniedModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
              {/* Table Section */}
              <div className="overflow-x-auto max-h-[50vh] overflow-y-auto no-scrollbar">
                <table className="w-full min-w-[480px]">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left p-3 text-base font-semibold text-gray-800">Date</th>
                      <th className="text-left p-3 text-base font-semibold text-gray-800">Item</th>
                      <th className="text-left p-3 text-base font-semibold text-gray-800">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deniedRequests.map((request) => (
                      <tr
                        key={request.id}
                        onClick={() => setSelectedRequest(request.id)}
                        className={`cursor-pointer hover:bg-blue-50 transition-colors border-b border-gray-100 ${selectedRequest === request.id ? 'bg-blue-100' : ''
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
                  </tbody>
                </table>
              </div>

              {/* Inspect Section */}
              <div className="w-full md:w-80 lg:w-96 bg-gray-50 p-6 border-t md:border-t-0 md:border-l border-gray-200 flex flex-col gap-4 overflow-y-auto">
                <h3 className="font-semibold text-gray-800 text-lg">Inspect</h3>

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
                      setIsDeniedModalOpen(false);
                      setSelectedRequest(null);
                      onBack();
                      setActionLoading(false);
                    }, 1000);
                  }}
                  className={`w-full py-2.5 rounded-lg font-medium text-sm shadow-sm transition-all ${selectedRequest
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    } disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  Appeal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View All (On Process) Modal */}
      {isViewAllOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="relative w-full max-w-6xl max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
              <h2 className="text-xl font-bold text-[#2262C6]">On Process</h2>
              <button
                onClick={() => setIsViewAllOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
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
                    <tr key={row.id} className="border-b border-gray-100">
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
            </div>

            {/* Footer: Pagination (left) and Page-size (right) */}
            <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  className="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-100"
                  disabled={page === 1}
                >
                  Prev
                </button>
                <span className="text-sm text-gray-700">Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  className="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-100"
                  disabled={page === totalPages}
                >
                  Next
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Display</span>
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                  className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                >
                  {[5, 10, 20, 50].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnProcessTransactions;
