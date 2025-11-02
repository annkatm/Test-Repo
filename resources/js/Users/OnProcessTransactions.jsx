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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isDeniedModalOpen, setIsDeniedModalOpen] = useState(false);
  const [isViewAllOpen, setIsViewAllOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); // page size not used for the main scroll list

  const totalPages = Math.max(1, Math.ceil((list?.length || 0) / pageSize));

  // Keep local list in sync with parent-provided requests to avoid any visual delay
  useEffect(() => {
    setList(Array.isArray(requests) ? requests : []);
  }, [requests]);
  const paginatedRequests = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return (list || []).slice(start, end);
  }, [list, page, pageSize]);

  const selectedRequestData = (list || []).find(req => req.id === selectedRequest);
  const [selectedEquipment, setSelectedEquipment] = useState(null);

  useEffect(() => {
    setList(Array.isArray(requests) ? requests : []);
  }, [requests]);

  const mapPending = (arr) => {
    const list = Array.isArray(arr) ? arr : [];
    return list.map((r, idx) => ({
      id: r.id ?? idx + 1,
      date: r.created_at ? new Date(r.created_at).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : (r.date || ''),
      item: r.equipment_name || r.item || r.title || 'Item',
      brand: r.brand || r.equipment?.brand || '',
      model: r.model || r.equipment?.model || '',
      status: r.status || 'Pending',
      equipment_id: r.equipment_id || r.equipment?.id,
      category: r.category_name || r.equipment?.category_name || r.type || r.equipment_type || '',
      details: Array.isArray(r.details) ? r.details : []
    }));
  };

  const fetchCurrentEmployeeId = async () => {
    try {
      const userRes = await fetch('/check-auth', { credentials: 'same-origin' });
      const userData = await userRes.json();
      const user = userData?.user || {};
      // 1) direct numeric employee_id
      if (userData?.authenticated && user?.employee_id) {
        const raw = user.employee_id;
        const numId = Number(raw);
        if (Number.isFinite(numId) && String(numId) !== '0') return numId;
      }
      // 2) linked_employee_id endpoint
      if (userData?.authenticated && user?.linked_employee_id) {
        try {
          const empRes = await fetch(`/api/employees/${user.linked_employee_id}`, { credentials: 'same-origin' });
          const empData = await empRes.json();
          const emp = empData?.data || empData;
          if (emp && emp.id) return emp.id;
        } catch (_) {}
      }
      // 3) employees?user_id
      if (userData?.authenticated && user?.id) {
        try {
          const empRes = await fetch(`/api/employees?user_id=${user.id}`, { credentials: 'same-origin' });
          const empData = await empRes.json();
          const employees = Array.isArray(empData) ? empData : (Array.isArray(empData?.data) ? empData.data : []);
          if (employees.length > 0) return employees[0].id;
        } catch (_) {}
      }
      // 4) fallback: match any employee by email/name
      try {
        const allRes = await fetch('/api/employees', { credentials: 'same-origin' });
        const allData = await allRes.json();
        const list = Array.isArray(allData) ? allData : (Array.isArray(allData?.data) ? allData.data : []);
        if (user?.email) {
          const byEmail = list.find(e => (e.email || '').toLowerCase() === String(user.email).toLowerCase());
          if (byEmail) return byEmail.id;
        }
        if (user?.name) {
          const parts = String(user.name).trim().split(/\s+/);
          const first = parts[0] || '';
          const last = parts.length > 1 ? parts[parts.length - 1] : '';
          const byName = list.find(e => String(e.first_name || '').toLowerCase() === first.toLowerCase() && String(e.last_name || '').toLowerCase() === last.toLowerCase());
          if (byName) return byName.id;
        }
      } catch (_) {}
    } catch (_) {}
    return null;
  };

  const loadPending = async () => {
    setLoading(true);
    setError('');
    try {
      const employeeId = await fetchCurrentEmployeeId();
      // also keep current user for client-side filter fallback
      let currentUser = null;
      try {
        const ur = await fetch('/check-auth', { credentials: 'same-origin' });
        const uj = await ur.json();
        currentUser = uj?.user || null;
      } catch (_) {}
      let url = '/api/requests?status=pending';
      if (employeeId) url += `&employee_id=${encodeURIComponent(employeeId)}`;
      let raw = [];
      try {
        const res = await fetch(url, { credentials: 'same-origin' });
        const data = await res.json();
        if (Array.isArray(data)) raw = data; else if (Array.isArray(data?.data)) raw = data.data; else if (Array.isArray(data?.data?.data)) raw = data.data.data;
      } catch (_) { raw = []; }
      // Fallback: if nothing returned for scoped call, try unscoped and filter client-side
      if ((!raw || raw.length === 0)) {
        try {
          const res2 = await fetch('/api/requests?status=pending', { credentials: 'same-origin' });
          const d2 = await res2.json();
          let arr = Array.isArray(d2) ? d2 : (Array.isArray(d2?.data) ? d2.data : (Array.isArray(d2?.data?.data) ? d2.data.data : []));
          if (employeeId) {
            arr = (arr || []).filter(r => String(r?.employee_id || r?.employee?.id || '') === String(employeeId));
          } else if (currentUser?.id) {
            arr = (arr || []).filter(r => String(r?.user_id || r?.employee?.user_id || '') === String(currentUser.id));
          }
          raw = arr || [];
        } catch (_) {}
      }
      const mapped = mapPending(raw.map(r => ({
        ...r,
        equipment_name: r?.equipment_name || r?.equipment?.name || r?.item || r?.title,
        brand: r?.brand || r?.equipment?.brand || r?.equipment_brand,
        model: r?.model || r?.equipment?.model || r?.equipment_model,
        equipment_id: r?.equipment_id || r?.equipment?.id,
        category_name: r?.category_name || r?.equipment?.category_name || r?.equipment_type,
      })));
      // Merge any locally created queue entries to avoid flicker
      try {
        const rawQueue = localStorage.getItem('ireply_created_queue');
        const queued = Array.isArray(JSON.parse(rawQueue)) ? JSON.parse(rawQueue) : [];
        const mappedQueued = mapPending(queued);
        const seen = new Set(mapped.map(x => String(x.id)));
        const merged = [...mappedQueued.filter(x => !seen.has(String(x.id))), ...mapped];
        setList(merged);
      } catch (_) {
        setList(mapped);
      }
    } catch (e) {
      setError('Failed to load pending requests');
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPending();
    try {
      const raw = localStorage.getItem('ireply_created_queue');
      const arr = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
      if (arr && arr.length > 0) setList(prev => {
        const base = Array.isArray(prev) ? prev : [];
        const mapped = mapPending(arr);
        const exist = new Set(base.map(x => String(x.id)));
        const merged = [...mapped.filter(x => !exist.has(String(x.id))), ...base];
        return merged;
      });
    } catch (_) {}

    const onCreated = (e) => {
      const d = e?.detail || {};
      if (!d) return;
      setList(prev => {
        const base = Array.isArray(prev) ? prev : [];
        const mapped = mapPending([d]);
        const exist = new Set(base.map(x => String(x.id)));
        const add = mapped.filter(x => !exist.has(String(x.id)));
        return [...add, ...base];
      });
    };
    const onCancelled = (e) => {
      const reqId = e?.detail?.request_id;
      const equipId = e?.detail?.equipment_id;
      setList(prev => Array.isArray(prev) ? prev.filter(r => (reqId ? String(r.id) !== String(reqId) : true) && (equipId ? String(r.equipment_id || '') !== String(equipId) : true)) : prev);
    };
    const onApproved = (e) => {
      const reqId = e?.detail?.request_id;
      const equipId = e?.detail?.equipment_id;
      setList(prev => Array.isArray(prev) ? prev.filter(r => (reqId ? String(r.id) !== String(reqId) : true) && (equipId ? String(r.equipment_id || '') !== String(equipId) : true)) : prev);
    };
    window.addEventListener('ireply:request:created', onCreated);
    window.addEventListener('ireply:request:cancelled', onCancelled);
    window.addEventListener('ireply:request:approved', onApproved);
    return () => {
      window.removeEventListener('ireply:request:created', onCreated);
      window.removeEventListener('ireply:request:cancelled', onCancelled);
      window.removeEventListener('ireply:request:approved', onApproved);
    };
  }, []);

  const handleRowClick = (request) => {
    setSelectedRequest(request.id);
  };

  // Fetch equipment details for the selected request to resolve serial/category/brand/model when missing
  useEffect(() => {
    const equipId = selectedRequestData?.equipment_id;
    if (!equipId) { setSelectedEquipment(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/equipment/${equipId}`, { credentials: 'same-origin' });
        const j = await res.json().catch(() => ({}));
        const payload = j && (j.data || j);
        if (!cancelled && payload && typeof payload === 'object') setSelectedEquipment(payload);
      } catch (_) { if (!cancelled) setSelectedEquipment(null); }
    })();
    return () => { cancelled = true; };
  }, [selectedRequestData?.equipment_id]);

  return (
    <div className="h-full min-h-0 bg-white p-4 sm:p-6 lg:p-8">
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
                        <div className="text-gray-900 font-semibold">{
                          selectedRequestData.category ||
                          selectedEquipment?.category_name ||
                          (typeof selectedEquipment?.category === 'string'
                            ? selectedEquipment?.category
                            : (selectedEquipment?.category?.name || selectedEquipment?.category?.title)) ||
                          selectedRequestData.item || '-'
                        }</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Brand</div>
                        <div className="text-gray-900 font-semibold">{selectedRequestData.brand || selectedEquipment?.brand || '-'}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Serial No.</div>
                        <div className="text-gray-900 font-semibold">{selectedEquipment?.serial_number || selectedEquipment?.serial || '-'}</div>
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
                    </div>
                  ) : (
                    <div className="mb-6 text-sm text-gray-500">Select a request to see details.</div>
                  )}

                  

                  {/* Cancel Request Button */}
                  <button
                    onClick={() => setIsCancelModalOpen(true)}
                    className="w-full bg-red-50 text-red-600 font-medium px-4 py-2.5 rounded-lg hover:bg-red-100 transition-colors border border-red-200"
                  >
                    Cancel Request
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
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
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
                    
                    // Cancel the request via API
                    if (reqId) {
                      const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
                      const baseHeaders = { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' };
                      const headers = csrf ? { ...baseHeaders, 'X-CSRF-TOKEN': csrf } : baseHeaders;
                      
                      try {
                        const response = await fetch(`/api/requests/${reqId}/cancel`, { 
                          method: 'POST', 
                          headers, 
                          credentials: 'same-origin' 
                        });
                        
                        const data = await response.json();
                        
                        if (response.ok && data.success) {
                          console.log('Request cancelled successfully:', data);
                          
                          // Only dispatch events if cancel was successful
                          // Notify EmployeeHome to restore this equipment to the available list
                          if (equipId) {
                            try {
                              const key = 'ireply_restore_queue';
                              const raw = localStorage.getItem(key);
                              const arr = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
                              if (!arr.includes(String(equipId))) arr.push(String(equipId));
                              localStorage.setItem(key, JSON.stringify(arr));
                            } catch (_) {}
                            
                            try { 
                              window.dispatchEvent(new CustomEvent('ireply:equipment:restore', { 
                                detail: { equipment_id: equipId } 
                              })); 
                            } catch (_) {}
                          }
                          
                          // Tell dashboards to drop this request from any pending/on-process lists
                          try { 
                            window.dispatchEvent(new CustomEvent('ireply:request:cancelled', { 
                              detail: { 
                                request_id: reqId, 
                                equipment_id: equipId,
                                equipment_name: selectedRequestData?.item || selectedRequestData?.equipment_name
                              } 
                            })); 
                            console.log('[OnProcessTransactions] Dispatched ireply:request:cancelled event for request', reqId);
                          } catch (_) {}
                          
                          // Remove from local On Process list
                          setList((prev) => {
                            if (!Array.isArray(prev)) return prev;
                            return prev.filter(r => String(r.id) !== String(reqId));
                          });
                        } else {
                          console.warn('Cancel request returned non-success:', data);
                          alert('Failed to cancel request: ' + (data.message || 'Unknown error'));
                          return; // Don't proceed if cancel failed
                        }
                      } catch (error) {
                        console.error('Error cancelling request:', error);
                        alert('Error cancelling request. Please try again.');
                        return; // Don't proceed if error
                      }
                    }
                    
                    // Close modal and go back
                    setIsCancelModalOpen(false);
                    setSelectedRequest(null);
                    
                    // Only go back if list is now empty, otherwise stay on page
                    setTimeout(() => {
                      const remainingCount = (list || []).filter(r => String(r.id) !== String(reqId)).length;
                      if (remainingCount === 0) {
                        onBack();
                      }
                    }, 100);
                    
                  } catch (error) {
                    console.error('Error in cancel handler:', error);
                  } finally {
                    setActionLoading(false);
                  }
                }}
                disabled={actionLoading}
                className="px-8 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Cancelling...' : 'Confirm'}
              </button>
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
