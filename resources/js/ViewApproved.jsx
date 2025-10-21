import React, { useState, useEffect, useRef } from 'react';
import { Search, Printer, ChevronDown, Clock, User, CheckCircle } from 'lucide-react';
import GlobalHeader from './components/GlobalHeader';
import HomeSidebar from './HomeSidebar';
import ConfirmModal from './components/ConfirmModal.jsx';
import PrintReceipt from './components/PrintReceipt.jsx';
import ViewTransactionModal from './components/ViewTransactionModal';
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

  const [viewHolderModal, setViewHolderModal] = useState({
    isOpen: false,
    holderData: null
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

  // Group approved requests by employee
  const groupApprovedByEmployee = (requests) => {
    const grouped = {};
    requests.forEach(req => {
      const employeeName = req.full_name || req.employee_name || req.name || 'Unknown';
      if (!grouped[employeeName]) {
        grouped[employeeName] = {
          id: req.id, // Use first request ID as group ID
          full_name: employeeName,
          position: req.position || 'N/A',
          status: req.status || 'approved',
          approved_by_name: req.approved_by_name || 'N/A',
          employee_id: req.employee_id,
          requests: [],
          items: []
        };
      }
      grouped[employeeName].requests.push(req);
      grouped[employeeName].items.push({
        id: req.equipment_id,
        requestId: req.id,
        equipment_name: req.equipment_name || 'Unknown Item',
        equipment_id: req.equipment_id
      });
    });
    return Object.values(grouped);
  };

  const groupedApproved = groupApprovedByEmployee(approved);

  // Group current holders by employee
  const groupCurrentHoldersByEmployee = (holders) => {
    const grouped = {};
    holders.forEach(holder => {
      const employeeName = holder.full_name || holder.employee_name || holder.name || 'Unknown';
      if (!grouped[employeeName]) {
        grouped[employeeName] = {
          id: holder.id,
          full_name: employeeName,
          position: holder.position || 'N/A',
          request_mode: holder.request_mode,
          expected_return_date: holder.expected_return_date,
          holders: [],
          items: []
        };
      }
      grouped[employeeName].holders.push(holder);
      grouped[employeeName].items.push({
        id: holder.equipment_id || holder.id,
        equipment_name: holder.equipment_name || 'Unknown Item'
      });
    });
    return Object.values(grouped);
  };

  const groupedCurrentHolders = groupCurrentHoldersByEmployee(currentHolders);

  // Group verify returns by employee
  const groupVerifyReturnsByEmployee = (returns) => {
    const grouped = {};
    returns.forEach(returnItem => {
      const employeeName = returnItem.full_name || returnItem.employee_name || returnItem.name || 'Unknown';
      if (!grouped[employeeName]) {
        grouped[employeeName] = {
          id: returnItem.id,
          full_name: employeeName,
          position: returnItem.position || 'N/A',
          return_date: returnItem.return_date || returnItem.expected_return_date,
          returns: [],
          items: []
        };
      }
      grouped[employeeName].returns.push(returnItem);
      grouped[employeeName].items.push({
        id: returnItem.equipment_id || returnItem.id,
        equipment_name: returnItem.equipment_name || 'Unknown Item'
      });
    });
    return Object.values(grouped);
  };

  const groupedVerifyReturns = groupVerifyReturnsByEmployee(verifyReturns);

  // Handle release action
  const handleRelease = async (data) => {
    try {
      // Handle grouped requests
      const requests = data.requests || [data];
      const releasedTransactions = [];
      const processedRequestIds = [];

      for (const request of requests) {
        // Resolve the actual transaction id from the approved request row
        let txId = null;
        let existingTransaction = null;

        // Primary: by request_id
        const byRequest = await transactionService.getAll({ request_id: request.id });
        if (byRequest?.success && Array.isArray(byRequest.data) && byRequest.data.length > 0) {
          txId = byRequest.data[0].id;
          existingTransaction = byRequest.data[0];
        }

        // Fallback: by employee and equipment for older rows not linked
        if (!txId && (request.employee_id && request.equipment_id)) {
          const byRefs = await transactionService.getAll({ employee_id: request.employee_id, equipment_id: request.equipment_id, status: 'pending' });
          if (byRefs?.success && Array.isArray(byRefs.data) && byRefs.data.length > 0) {
            txId = byRefs.data[0].id;
            existingTransaction = byRefs.data[0];
          }
        }

        if (!txId) {
          console.warn(`No transaction found for request ${request.id}`);
          continue;
        }

        // Check if already released
        if (existingTransaction?.status === 'released') {
          console.log(`Transaction ${txId} is already released, moving to current holders...`);
          releasedTransactions.push(existingTransaction);
          processedRequestIds.push(request.id);
          continue;
        }

        try {
          const response = await transactionService.release(txId, {
            notes: data.notes || request.notes,
            condition_on_issue: data.condition_on_issue || request.condition_on_issue
          });
          
          if (response.success) {
            releasedTransactions.push(response.data);
            processedRequestIds.push(request.id);
          }
        } catch (releaseError) {
          // If error indicates already released, fetch the transaction and add to current holders
          const errorMsg = releaseError.response?.data?.message || releaseError.message || '';
          if (errorMsg.toLowerCase().includes('already released')) {
            console.log(`Transaction ${txId} is already released, fetching and moving to current holders...`);
            
            // Fetch the released transaction with status 'released'
            const releasedTx = await transactionService.getAll({ id: txId, status: 'released' });
            if (releasedTx?.success && Array.isArray(releasedTx.data) && releasedTx.data.length > 0) {
              releasedTransactions.push(releasedTx.data[0]);
              processedRequestIds.push(request.id);
            } else if (existingTransaction) {
              // Use the existing transaction data if we can't fetch it
              releasedTransactions.push(existingTransaction);
              processedRequestIds.push(request.id);
            }
          } else {
            // Re-throw if it's a different error
            throw releaseError;
          }
        }
      }

      if (releasedTransactions.length > 0) {
        // Update the local state - remove all processed requests from approved
        setApproved(prev => prev.filter(item => !processedRequestIds.includes(item.id)));
        
        // Add released transactions to current holders
        setCurrentHolders(prev => [...prev, ...releasedTransactions]);
        
        // Update dashboard stats
        setDashboardStats(prev => ({
          ...prev,
          new_requests: Math.max(0, prev.new_requests - releasedTransactions.length),
          current_holders: prev.current_holders + releasedTransactions.length
        }));
        
        // Close modal
        setConfirmModal({ isOpen: false, type: null, transactionData: null });
        
        // Show success message
        const itemText = releasedTransactions.length === 1 ? 'item' : 'items';
        const alreadyReleasedCount = releasedTransactions.filter(tx => tx.status === 'released').length;
        const newlyReleasedCount = releasedTransactions.length - alreadyReleasedCount;
        
        let message = '';
        if (alreadyReleasedCount > 0 && newlyReleasedCount > 0) {
          message = `${newlyReleasedCount} ${itemText} released successfully! ${alreadyReleasedCount} ${alreadyReleasedCount === 1 ? 'was' : 'were'} already released. Moving to Current Holder view...`;
        } else if (alreadyReleasedCount > 0) {
          message = `${alreadyReleasedCount} ${itemText} ${alreadyReleasedCount === 1 ? 'was' : 'were'} already released. Moving to Current Holder view...`;
        } else {
          message = `${releasedTransactions.length} ${itemText} released successfully! Switching to Current Holder view...`;
        }
        
        alert(message);
        
        // Automatically switch to Current Holder view to show the released items
        setTimeout(() => {
          setView('currentHolder');
        }, 1000);
      } else {
        alert('No transactions found to release.');
      }
    } catch (err) {
      console.error('Error releasing equipment:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Unknown error occurred';
      if (window.showToast) {
        window.showToast({
          type: 'error',
          title: 'Release Failed',
          message: 'Error releasing equipment: ' + errorMessage,
          duration: 6000
        });
      } else {
        alert('Error releasing equipment: ' + errorMessage);
      }
    }
  };


  // Handle print action
  const handlePrint = async (transactionData) => {
    try {
      // Handle grouped requests - get all items for printing
      const requests = transactionData.requests || [transactionData];
      
      if (!requests || requests.length === 0) {
        console.error('Invalid row for printing:', transactionData);
        if (window.showToast) {
          window.showToast({
            type: 'error',
            title: 'Print Error',
            message: 'Error: Invalid data for printing',
            duration: 5000
          });
        } else {
          alert('Error: Invalid data for printing');
        }
        return;
      }


      // Collect all equipment items with their details
      const allItems = [];
      for (const request of requests) {
        const txList = await transactionService.getAll({ request_id: request.id });
        if (txList?.success && Array.isArray(txList.data) && txList.data.length > 0) {
          const tx = txList.data[0];
          
          // Try to get serial number from multiple sources
          let serialNumber = tx?.serial_number 
            || tx?.equipment_serial_number 
            || tx?.equipment?.serial_number
            || request?.serial_number
            || request?.equipment_serial_number;
          
          // If still no serial number, try fetching equipment details
          if (!serialNumber && request.equipment_id) {
            try {
              const equipmentResponse = await api.get(`/equipment/${request.equipment_id}`);
              if (equipmentResponse?.data?.success) {
                serialNumber = equipmentResponse.data.data?.serial_number;
              }
            } catch (e) {
              console.warn('Could not fetch equipment details:', e);
            }
          }
          
          allItems.push({
            equipment_name: request.equipment_name || tx?.equipment_name || tx?.equipment?.name || 'N/A',
            serial_number: serialNumber || 'N/A',
            date_released: tx?.release_date || tx?.released_at || tx?.created_at || new Date().toISOString(),
            date_returned: tx?.return_date || tx?.returned_at || null
          });
        } else {
          // If no transaction found, try to fetch equipment serial number directly
          let serialNumber = request?.serial_number || request?.equipment_serial_number;
          
          if (!serialNumber && request.equipment_id) {
            try {
              const equipmentResponse = await api.get(`/equipment/${request.equipment_id}`);
              if (equipmentResponse?.data?.success) {
                serialNumber = equipmentResponse.data.data?.serial_number;
              }
            } catch (e) {
              console.warn('Could not fetch equipment details:', e);
            }
          }
          
          allItems.push({
            equipment_name: request.equipment_name || 'N/A',
            serial_number: serialNumber || 'N/A',
            date_released: request?.release_date || request?.created_at || new Date().toISOString(),
            date_returned: request?.return_date || request?.returned_at || null
          });
        }
      }

      // Use first request for employee info
      const firstRequest = requests[0];

      // Prepare print data with all items
      const printData = {
        full_name: transactionData.full_name || firstRequest.full_name || 'N/A',
        position: transactionData.position || firstRequest.position || 'N/A',
        department: firstRequest.department || transactionData.department || 'IT Department',
        items: allItems,
        notes: transactionData.notes || firstRequest.notes || ''
      };

      console.log('ViewApproved - Print data prepared:', printData);
      console.log('ViewApproved - All items with serial numbers:', allItems);

      setPrintModal({ isOpen: true, transactionData: printData });
    } catch (err) {
      console.error('Error fetching print data:', err);
      if (window.showToast) {
        window.showToast({
          type: 'error',
          title: 'Print Error',
          message: 'Error generating receipt: ' + apiUtils.handleError(err),
          duration: 6000
        });
      } else {
        alert('Error generating receipt: ' + apiUtils.handleError(err));
      }
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

  const handleViewHolder = (holderId) => {
    const holder = currentHolders.find(h => h.id === holderId);
    if (holder) {
      setViewHolderModal({
        isOpen: true,
        holderData: holder
      });
    }
  };

  const handleCloseViewHolderModal = () => {
    setViewHolderModal({
      isOpen: false,
      holderData: null
    });
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
                    <p className="text-2xl font-bold text-gray-900">{loading ? '...' : groupedCurrentHolders.length}</p>
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
                    ) : groupedApproved.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-8 text-center text-gray-500">
                          No approved transactions found
                        </td>
                      </tr>
                    ) : (
                      groupedApproved.map((group) => (
                        <tr 
                          key={group.id} 
                          onClick={() => handleRowClick(group.id, 'viewApproved')}
                          className={`border-b last:border-0 cursor-pointer transition-colors duration-200 ${
                            isItemClicked(group.id, 'viewApproved') 
                              ? 'bg-gray-200 hover:bg-blue-50' 
                              : 'hover:bg-blue-50'
                          }`}
                        >
                          <td className="py-3 px-3">{group.full_name}</td>
                          <td className="py-3 px-3">{group.position}</td>
                          <td className="py-3 px-3">
                            <span>
                              {group.items.length === 1 
                                ? group.items[0].equipment_name 
                                : `${group.items.length} items`}
                            </span>
                          </td>
                          <td className="py-3 px-3"><span className="px-2.5 py-0.5 rounded-full text-xs bg-green-100 text-green-700">{group.status}</span></td>
                          <td className="py-3 px-3">{group.approved_by_name}</td>
                          <td className="py-3 px-3">
                            <div className="flex items-center justify-end space-x-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePrint(group);
                                }}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Print Receipt"
                              >
                                <Printer className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openConfirmModal('release', group);
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
                    ) : groupedCurrentHolders.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-8 text-center text-gray-500">
                          No current holders found
                        </td>
                      </tr>
                    ) : (
                      groupedCurrentHolders.map((group) => (
                        <tr 
                          key={group.id}
                          onClick={() => handleViewHolder(group.holders[0]?.id || group.id)}
                          className="border-b last:border-0 cursor-pointer transition-colors duration-200 hover:bg-blue-50"
                        >
                          <td className="py-3 px-3">{group.full_name}</td>
                          <td className="py-3 px-3">{group.position}</td>
                          <td className="py-3 px-3">
                            <span>
                              {group.items.length === 1 
                                ? group.items[0].equipment_name 
                                : `${group.items.length} items`}
                            </span>
                          </td>
                          <td className="py-3 px-3">{formatRequestMode(group.request_mode)}</td>
                          <td className="py-3 px-3 text-red-600">{group.expected_return_date || 'N/A'}</td>
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
                    ) : groupedVerifyReturns.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="py-8 text-center text-gray-500">
                          No returns to verify found
                        </td>
                      </tr>
                    ) : (
                      groupedVerifyReturns.map((group) => (
                        <tr 
                          key={group.id}
                          onClick={() => handleRowClick(group.id, 'verifyReturn')}
                          className={`border-b last:border-0 cursor-pointer transition-colors duration-200 ${
                            isItemClicked(group.id, 'verifyReturn') 
                              ? 'bg-gray-200 hover:bg-blue-50' 
                              : 'hover:bg-blue-50'
                          }`}
                        >
                          <td className="py-3 px-3">{group.full_name}</td>
                          <td className="py-3 px-3">{group.position}</td>
                          <td className="py-3 px-3">
                            <span>
                              {group.items.length === 1 
                                ? group.items[0].equipment_name 
                                : `${group.items.length} items`}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-red-600">{group.return_date || 'N/A'}</td>
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

      {/* View Holder Modal */}
      <ViewTransactionModal
        isOpen={viewHolderModal.isOpen}
        onClose={handleCloseViewHolderModal}
        transactionData={viewHolderModal.holderData}
      />

    </div>
  );
};

export default ViewApproved;