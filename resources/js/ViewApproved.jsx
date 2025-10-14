import React, { useState, useEffect, useRef } from 'react';
import { Search, Printer, ChevronDown, Clock, User, CheckCircle } from 'lucide-react';
import GlobalHeader from './components/GlobalHeader';
import HomeSidebar from './HomeSidebar';
import ConfirmModal from './components/ConfirmModal.jsx';
import PrintReceipt from './components/PrintReceipt.jsx';
import { transactionService, apiUtils } from './services/api.js';
import api from './services/api';

const ViewApproved = () => {
  const [approved, setApproved] = useState([]);
  const [clickedItems, setClickedItems] = useState(new Set()); // Track clicked items
  
  useEffect(() => {
    // Fetch approved requests from backend
    const fetchApproved = async () => {
      try {
        const res = await fetch('/api/requests?status=approved');
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setApproved(data.data);
        }
      } catch (e) {
        console.error('Failed to fetch approved requests:', e);
      }
    };
    fetchApproved();
  }, []);

  const [currentHolders, setCurrentHolders] = useState([]);
  const [verifyReturns, setVerifyReturns] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({
    new_requests: 0,
    current_holders: 0,
    verify_returns: 0
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [view, setView] = useState('viewApproved');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scrollY, setScrollY] = useState(0);
  const scrollContainerRef = useRef(null);
  
  // Modal states
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: null,
    transactionData: null
  });
  const [printModal, setPrintModal] = useState({
    isOpen: false,
    transactionData: null
  });

  // Track clicked items
  const handleRowClick = (itemId, view) => {
    const key = `${view}-${itemId}`;
    setClickedItems(prev => new Set([...prev, key]));
  };

  // Check if item was clicked
  const isItemClicked = (itemId, view) => {
    const key = `${view}-${itemId}`;
    return clickedItems.has(key);
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []);

  // Handle scroll events for fade-out effect
  useEffect(() => {
    const handleScroll = () => {
      if (scrollContainerRef.current) {
        setScrollY(scrollContainerRef.current.scrollTop);
      }
    };

    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch dashboard stats
      const statsResponse = await transactionService.getDashboard();
      if (statsResponse.success) {
        setDashboardStats(statsResponse.data);
      }
      
      // Fetch approved requests (status = 'approved' - ready for release)
      const approvedResponse = await api.get('/requests', { params: { status: 'approved' } });
      if (approvedResponse.data.success) {
        setApproved(approvedResponse.data.data);
      } else {
        console.error('Failed to fetch approved requests:', approvedResponse.data.message);
      }
      
      // Fetch current holders (status = 'released' - equipment released)
      const holdersResponse = await transactionService.getAll({ status: 'released' });
      if (holdersResponse.success) {
        setCurrentHolders(holdersResponse.data);
      } else {
        console.error('Failed to fetch current holders:', holdersResponse.message);
      }
      
      // Fetch verify returns (status = 'returned' - equipment returned)
      const returnsResponse = await transactionService.getAll({ status: 'returned' });
      if (returnsResponse.success) {
        setVerifyReturns(returnsResponse.data);
      } else {
        console.error('Failed to fetch verify returns:', returnsResponse.message);
      }
      
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(apiUtils.handleError(err));
    } finally {
      setLoading(false);
    }
  };

  // UI helpers
  const formatRequestMode = (mode) => {
    const normalized = (mode || '').toString().toLowerCase();
    if (['work_from_home', 'wfh', 'work from home'].includes(normalized)) return 'W.F.H';
    return 'On-site';
  };

  const handleSelect = (next) => {
    setView(next);
    setIsMenuOpen(false);
  };

  // Handle release action
  const handleRelease = async (data) => {
    try {
      // Resolve the actual transaction id from the approved request row
      let txId = null;

      // Primary: by request_id
      const byRequest = await transactionService.getAll({ request_id: data.id });
      if (byRequest?.success && Array.isArray(byRequest.data) && byRequest.data.length > 0) {
        txId = byRequest.data[0].id;
      }

      // Fallback: by employee and equipment for older rows not linked
      if (!txId && (data.employee_id && data.equipment_id)) {
        const byRefs = await transactionService.getAll({ employee_id: data.employee_id, equipment_id: data.equipment_id, status: 'pending' });
        if (byRefs?.success && Array.isArray(byRefs.data) && byRefs.data.length > 0) {
          txId = byRefs.data[0].id;
        }
      }

      if (!txId) {
        alert('No transaction found for this approved request to release.');
        return;
      }

      const response = await transactionService.release(txId, {
        notes: data.notes,
        condition_on_issue: data.condition_on_issue
      });
      
      if (response.success) {
        // Update the local state
        setApproved(prev => prev.filter(item => item.id !== data.id));
        setCurrentHolders(prev => [...prev, response.data]);
        
        // Update dashboard stats
        setDashboardStats(prev => ({
          ...prev,
          current_holders: prev.current_holders + 1
        }));
        
        // Close modal
        setConfirmModal({ isOpen: false, type: null, transactionData: null });
        
        // Show success message
        alert('Equipment released successfully!');
      }
    } catch (err) {
      console.error('Error releasing equipment:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Unknown error occurred';
      alert('Error releasing equipment: ' + errorMessage);
    }
  };

  // Handle print action
  const handlePrint = async (transactionData) => {
    try {
      if (!transactionData || !transactionData.id) {
        console.error('Invalid row for printing:', transactionData);
        alert('Error: Invalid data for printing');
        return;
      }

      // Rows in ViewApproved are requests; resolve the related transaction by request_id
      const txList = await transactionService.getAll({ request_id: transactionData.id });
      if (!txList?.success || !Array.isArray(txList.data) || txList.data.length === 0) {
        alert('No transaction found for this approved request.');
        return;
      }

      const tx = txList.data[0];

      // Try backend print endpoint first
      try {
        const response = await transactionService.print(tx.id);
        if (response?.success) {
          const r = response.data;
          const flat = {
            full_name: r?.employee?.full_name || `${r?.employee?.first_name || ''} ${r?.employee?.last_name || ''}`.trim(),
            position: r?.employee?.position || '',
            department: r?.employee?.department || '',
            equipment_name: r?.equipment?.name || tx?.equipment_name || '',
            serial_number: r?.equipment?.serial_number || '',
            notes: r?.release_info?.notes || tx?.notes || '',
          };

          setPrintModal({ isOpen: true, transactionData: flat });
          return;
        }
      } catch (e) {
        // Fall through to local fallback below
        console.warn('Backend print failed, falling back to local data flattening.', e);
      }

      // Fallback: assemble minimal receipt data from available request/transaction fields
      const flatFallback = {
        full_name: transactionData.full_name || tx?.full_name || `${tx?.first_name || ''} ${tx?.last_name || ''}`.trim(),
        position: transactionData.position || tx?.position || '',
        department: transactionData.department || tx?.department || '',
        equipment_name: transactionData.equipment_name || tx?.equipment_name || '',
        serial_number: tx?.serial_number || tx?.equipment_serial_number || '',
        notes: tx?.notes || transactionData?.notes || '',
      };

      setPrintModal({ isOpen: true, transactionData: flatFallback });
    } catch (err) {
      console.error('Error fetching print data:', err);
      alert('Error generating receipt: ' + apiUtils.handleError(err));
    }
  };

  // Modal handlers
  const openConfirmModal = (type, transactionData) => {
    setConfirmModal({
      isOpen: true,
      type,
      transactionData
    });
  };

  const closeConfirmModal = () => {
    setConfirmModal({ isOpen: false, type: null, transactionData: null });
  };

  const closePrintModal = () => {
    setPrintModal({ isOpen: false, transactionData: null });
  };

  return (
     <div className="h-screen overflow-hidden bg-white flex">
      <div className="flex-shrink-0">
        <HomeSidebar />
      </div>
      
      <div className="flex-1 flex flex-col">
        <GlobalHeader title="View Approved" />

        <main className="px-10 py-6 mb-10 flex flex-col overflow-hidden">
          {/* Scrollable Content Container */}
          <div 
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto transaction-scrollbar sticky-transition"
            style={{ maxHeight: 'calc(100vh - 200px)' }}
          >
            {/* Labels that fade out on scroll */}
            <div 
              className={`transition-all duration-500 ease-in-out ${
                scrollY > 50 ? 'opacity-0 transform -translate-y-2' : 'opacity-100 transform translate-y-0'
              }`}
            >
              <h2 className="text-4xl font-bold text-blue-600 transition-all duration-300">Transaction</h2>
              <h3 className="text-base font-semibold text-gray-700 mt-3 tracking-wide transition-all duration-300">QUICK ACCESS</h3>
            </div>

            {/* Stats Cards - scroll with content initially, then stick at top */}
            <div className="sticky top-0 z-10 bg-white pb-4 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-9 transition-all duration-300">
                <div className="bg-gradient-to-b from-[#0064FF] to-[#003C99] text-white rounded-2xl p-3 shadow flex flex-col h-26">
                  <h4 className="text-sm uppercase tracking-wider opacity-80">New Approved</h4>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-5xl font-bold">{loading ? '...' : dashboardStats.new_requests}</p>
                    <Clock className="w-8 h-8 text-white/70" />
                  </div>
                </div>
                <div className="bg-gray-100 rounded-2xl p-3 shadow flex flex-col h-26">
                  <h4 className="text-sm font-semibold text-gray-600">Current holder</h4>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-2xl font-bold text-gray-900">{loading ? '...' : dashboardStats.current_holders}</p>
                    <User className="w-8 h-8 text-gray-500" />
                  </div>
                </div>
                <div className="bg-gray-100 rounded-2xl p-6 shadow flex flex-col h-26">
                  <h4 className="text-sm font-semibold text-gray-600">Verify Return</h4>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-2xl font-bold text-gray-900">{loading ? '...' : dashboardStats.verify_returns}</p>
                    <CheckCircle className="w-8 h-8 text-gray-500" />
                  </div>
                </div>
              </div>
            </div>

          {/* Mode dropdown moved to section headers for alignment with titles */}

          {view === 'viewApproved' && (
            <>
              <div className="mt-10 flex items-center justify-between">
                <h3 className="text-3xl font-semibold text-gray-700">View Approved</h3>
                <div className="relative">
                  <button
                    type="button"
                    className="w-44 h-10 bg-gray-300 rounded-md flex items-center justify-between px-4 text-gray-700"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                  >
                    <span className="text-sm font-medium">
                      {view === 'viewApproved' ? 'View Approved' : 
                       view === 'currentHolder' ? 'Current holder' : 'Verify return'}
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  {isMenuOpen && (
                    <div className="absolute right-0 z-10 mt-2 w-44 bg-white rounded-md shadow border border-gray-200">
                      <button onClick={() => handleSelect('viewApproved')} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">View Approved</button>
                      <button onClick={() => handleSelect('currentHolder')} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">Current holder</button>
                      <button onClick={() => handleSelect('verifyReturn')} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">Verify return</button>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4 bg-white rounded-2xl shadow p-4 md:p-6 border border-gray-100 transition-all duration-300">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left min-w-full">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr className="border-b">
                        <th className="py-2 px-3">Name</th>
                        <th className="py-2 px-3">Position</th>
                        <th className="py-2 px-3">Item</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3">Approved by</th>
                        <th className="py-2 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loading ? (
                      <tr>
                        <td colSpan="6" className="py-8 text-center text-gray-500">
                          Loading approved transactions...
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan="6" className="py-8 text-center text-red-500">
                          Error: {error}
                        </td>
                      </tr>
                    ) : approved.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-8 text-center text-gray-500">
                          No approved transactions found
                        </td>
                      </tr>
                    ) : (
                      approved.map((row) => (
                        <tr 
                          key={row.id} 
                          onClick={() => handleRowClick(row.id, 'viewApproved')}
                          className={`border-b last:border-0 cursor-pointer transition-colors duration-200 ${
                            isItemClicked(row.id, 'viewApproved') 
                              ? 'bg-gray-200 hover:bg-blue-50' 
                              : 'hover:bg-blue-50'
                          }`}
                        >
                          <td className="py-3 px-3">{row.full_name || 'N/A'}</td>
                          <td className="py-3 px-3">{row.position || 'N/A'}</td>
                          <td className="py-3 px-3">{row.equipment_name || 'N/A'}</td>
                          <td className="py-3 px-3"><span className="px-2.5 py-0.5 rounded-full text-xs bg-green-100 text-green-700">{row.status || 'approved'}</span></td>
                          <td className="py-3 px-3">{row.approved_by_name || 'N/A'}</td>
                          <td className="py-3 px-3">
                            <div className="flex items-center justify-end space-x-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePrint(row);
                                }}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Print Receipt"
                              >
                                <Printer className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openConfirmModal('release', row);
                                }}
                                className="px-3 py-1 bg-green-600 text-white rounded-full text-xs hover:bg-green-700 transition-colors"
                              >
                                Release
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {view === 'currentHolder' && (
            <>
              <div className="mt-10 flex items-center justify-between">
                <h3 className="text-3xl font-semibold text-gray-700">Current holder</h3>
                <div className="relative">
                  <button
                    type="button"
                    className="w-44 h-10 bg-gray-300 rounded-md flex items-center justify-between px-4 text-gray-700"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                  >
                    <span className="text-sm font-medium">
                      {view === 'viewApproved' ? 'View Approved' : 
                       view === 'currentHolder' ? 'Current holder' : 'Verify return'}
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  {isMenuOpen && (
                    <div className="absolute right-0 z-10 mt-2 w-44 bg-white rounded-md shadow border border-gray-200">
                      <button onClick={() => handleSelect('viewApproved')} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">View Approved</button>
                      <button onClick={() => handleSelect('currentHolder')} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">Current holder</button>
                      <button onClick={() => handleSelect('verifyReturn')} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">Verify return</button>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4 bg-white rounded-2xl shadow p-4 md:p-6 border border-gray-100 transition-all duration-300">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left min-w-full">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr className="border-b">
                        <th className="py-2 px-3">Name</th>
                        <th className="py-2 px-3">Position</th>
                        <th className="py-2 px-3">Item</th>
                        <th className="py-2 px-3">Request mode</th>
                        <th className="py-2 px-3">End Date</th>
                        <th className="py-2 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loading ? (
                      <tr>
                        <td colSpan="6" className="py-8 text-center text-gray-500">
                          Loading current holders...
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan="6" className="py-8 text-center text-red-500">
                          Error: {error}
                        </td>
                      </tr>
                    ) : currentHolders.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-8 text-center text-gray-500">
                          No current holders found
                        </td>
                      </tr>
                    ) : (
                      currentHolders.map((row) => (
                        <tr 
                          key={row.id}
                          onClick={() => handleRowClick(row.id, 'currentHolder')}
                          className={`border-b last:border-0 cursor-pointer transition-colors duration-200 ${
                            isItemClicked(row.id, 'currentHolder') 
                              ? 'bg-gray-200 hover:bg-blue-50' 
                              : 'hover:bg-blue-50'
                          }`}
                        >
                          <td className="py-3 px-3">{row.full_name || 'N/A'}</td>
                          <td className="py-3 px-3">{row.position || 'N/A'}</td>
                          <td className="py-3 px-3">{row.equipment_name || 'N/A'}</td>
                          <td className="py-3 px-3">{formatRequestMode(row.request_mode)}</td>
                          <td className="py-3 px-3 text-red-600">{row.expected_return_date || 'N/A'}</td>
                          <td className="py-3 px-3">
                            <div className="flex items-center justify-end space-x-4 text-gray-700">
                              <span className="px-3 py-1 rounded-full text-xs bg-blue-100 text-blue-700">Active</span>
                              <span className="px-3 py-1 rounded-full text-xs bg-green-600 text-white">Released</span>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {view === 'verifyReturn' && (
            <>
              <div className="mt-10 flex items-center justify-between">
                <h3 className="text-3xl font-semibold text-gray-700">Verify return</h3>
                <div className="relative">
                  <button
                    type="button"
                    className="w-44 h-10 bg-gray-300 rounded-md flex items-center justify-between px-4 text-gray-700"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                  >
                    <span className="text-sm font-medium">
                      {view === 'viewApproved' ? 'View Approved' : 
                       view === 'currentHolder' ? 'Current holder' : 'Verify return'}
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  {isMenuOpen && (
                    <div className="absolute right-0 z-10 mt-2 w-44 bg-white rounded-md shadow border border-gray-200">
                      <button onClick={() => handleSelect('viewApproved')} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">View Approved</button>
                      <button onClick={() => handleSelect('currentHolder')} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">Current holder</button>
                      <button onClick={() => handleSelect('verifyReturn')} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">Verify return</button>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4 bg-white rounded-2xl shadow p-4 md:p-6 border border-gray-100 transition-all duration-300">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left min-w-full">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr className="border-b">
                        <th className="py-2 px-3">Name</th>
                        <th className="py-2 px-3">Position</th>
                        <th className="py-2 px-3">Item</th>
                        <th className="py-2 px-3">End Date</th>
                        <th className="py-2 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loading ? (
                      <tr>
                        <td colSpan="5" className="py-8 text-center text-gray-500">
                          Loading verify returns...
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan="5" className="py-8 text-center text-red-500">
                          Error: {error}
                        </td>
                      </tr>
                    ) : verifyReturns.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="py-8 text-center text-gray-500">
                          No returns to verify found
                        </td>
                      </tr>
                    ) : (
                      verifyReturns.map((row) => (
                        <tr 
                          key={row.id}
                          onClick={() => handleRowClick(row.id, 'verifyReturn')}
                          className={`border-b last:border-0 cursor-pointer transition-colors duration-200 ${
                            isItemClicked(row.id, 'verifyReturn') 
                              ? 'bg-gray-200 hover:bg-blue-50' 
                              : 'hover:bg-blue-50'
                          }`}
                        >
                          <td className="py-3 px-3">{row.full_name || 'N/A'}</td>
                          <td className="py-3 px-3">{row.position || 'N/A'}</td>
                          <td className="py-3 px-3">{row.equipment_name || 'N/A'}</td>
                          <td className="py-3 px-3 text-red-600">{row.return_date || row.expected_return_date || 'N/A'}</td>
                          <td className="py-3 px-3">
                            <div className="flex items-center justify-end space-x-3">
                              <span className="px-3 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700">Pending</span>
                              <span className="px-3 py-1 rounded-full text-xs bg-green-600 text-white">Returned</span>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
          </div>
        </main>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirmModal}
        onConfirm={handleRelease}
        transactionData={confirmModal.transactionData}
        type={confirmModal.type}
      />

      {/* Print Receipt Modal */}
      <PrintReceipt
        isOpen={printModal.isOpen}
        onClose={closePrintModal}
        transactionData={printModal.transactionData}
      />
    </div>
  );
};

export default ViewApproved;