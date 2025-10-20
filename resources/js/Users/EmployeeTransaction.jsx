import React, { useState, useEffect, useMemo, useRef } from 'react';
import Echo from '../echo';
import { Laptop, X, RefreshCcw, ClipboardList, Mouse, FilePlus2 } from 'lucide-react';
import OnProcessTransactions from './OnProcessTransactions';
import ApprovedTransactions from './ApprovedTransactions';

const EmployeeTransaction = () => {
  const [showExchangeConfirmModal, setShowExchangeConfirmModal] = useState(false);
  const [showBrowseLaptopsModal, setShowBrowseLaptopsModal] = useState(false);
  const [selectedLaptop, setSelectedLaptop] = useState(null);
  const [activeCategory, setActiveCategory] = useState('Laptops');
  const [transactions, setTransactions] = useState([]);
  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [transactionStats, setTransactionStats] = useState({
    borrowed: 0,
    available: 0,
    overdue: 0
  });
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showPendings, setShowPendings] = useState(false);
  const [isDeniedModalOpen, setIsDeniedModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedRow, setSelectedRow] = useState(1);
  const [currentView, setCurrentView] = useState('transactions');
  const [showHistory, setShowHistory] = useState(false);
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Laptops');
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [exchangeReason, setExchangeReason] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [sortOption, setSortOption] = useState("date-desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [actionLoading, setActionLoading] = useState(false);
  const [activities, setActivities] = useState([]);
  // Toasts for upper-right popup notifications
  const [toasts, setToasts] = useState([]);

  const showToast = (message, variant = 'info', ttl = 4500) => {
    const id = Date.now() + Math.random();
    const toast = { id, message, variant };
    setToasts((prev) => [toast, ...prev].slice(0, 6));
    // auto remove
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, ttl);
  };
  const [notificationCount, setNotificationCount] = useState(() => {
    try {
      const v = Number(localStorage.getItem('employee_history_unseen') || '0');
      return Number.isNaN(v) ? 0 : v;
    } catch (_e) {
      return 0;
    }
  });
  const prevHistoryLenRef = useRef(0);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('employee_activities') || '[]');
      if (Array.isArray(saved)) setActivities(saved);
    } catch (_) {}
  }, []);

  const logActivity = (message, variant = 'info') => {
    const entry = { id: Date.now(), message, variant, time: new Date().toISOString() };
    setActivities((prev) => {
      const next = [entry, ...prev].slice(0, 50);
      try { localStorage.setItem('employee_activities', JSON.stringify(next)); } catch (_) {}
      return next;
    });
  };

  // Increment the unseen history/notification counter and optionally append a local history/activity entry
  const incrementNotification = (count = 1, entry = null) => {
    setNotificationCount((prev) => {
      const next = prev + count;
      try { localStorage.setItem('employee_history_unseen', String(next)); } catch (_) {}
      return next;
    });

    if (entry) {
      // Prepend to activities and historyData locally so UI reflects it immediately
      setActivities((prev) => {
        const next = [entry, ...prev].slice(0, 50);
        try { localStorage.setItem('employee_activities', JSON.stringify(next)); } catch (_) {}
        return next;
      });
      setHistoryData((prev) => [entry, ...prev]);
    }
  };

  // Global function for other parts of the app to notify this component about new events
  // Usage: window.IReplyNotify('Your request was approved', 'success')
  useEffect(() => {
    window.IReplyNotify = (message, variant = 'info', addToHistory = true, historyEntry = null) => {
      const entry = historyEntry || { id: Date.now(), item: message, message, variant, date: new Date().toISOString(), time: new Date().toISOString(), local: Boolean(historyEntry) };
      if (addToHistory) {
        incrementNotification(1, entry);
        // dispatch a specific history event for other listeners
        try {
          window.dispatchEvent(new CustomEvent('ireply:history', { detail: entry }));
        } catch (_) {}
      } else {
        incrementNotification(1, null);
      }
      // keep a log in activities
      setActivities((prev) => {
        const next = [entry, ...prev].slice(0, 50);
        try { localStorage.setItem('employee_activities', JSON.stringify(next)); } catch (_) {}
        return next;
      });
      // show toast popup for the notification
      try { showToast(typeof message === 'string' ? message : (entry.message || 'Notification'), variant); } catch (_) {}
    };

    const notifyHandler = (e) => {
      const detail = e?.detail || {};
      const message = detail.message || detail.msg || 'New activity';
      const variant = detail.variant || 'info';
      const entry = { id: Date.now(), item: message, message, variant, date: new Date().toISOString(), time: new Date().toISOString() };
      incrementNotification(1, entry);
      showToast(message, variant);
    };

    const historyHandler = (e) => {
      const detail = e?.detail || {};
      if (!detail) return;
      const entry = {
        id: detail.id || Date.now(),
        item: detail.item || detail.message || detail.msg || 'History item',
        message: detail.message || detail.msg || detail.item || 'History item',
        variant: detail.variant || 'info',
        date: detail.date || new Date().toISOString(),
        time: detail.time || detail.date || new Date().toISOString(),
        local: true
      };
      // Append to local history and increment unseen
      incrementNotification(1, entry);
      showToast(entry.message || entry.item, entry.variant || 'info');
    };

    window.addEventListener('ireply:notify', notifyHandler);
    window.addEventListener('ireply:history', historyHandler);

    return () => {
      try { delete window.IReplyNotify; } catch (_) {}
      window.removeEventListener('ireply:notify', notifyHandler);
      window.removeEventListener('ireply:history', historyHandler);
    };
  }, []);

  const timeAgo = (iso) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    const m = Math.floor(diff / 60); if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24); return `${d}d ago`;
  };

  // Helper to fetch recent activity entries
  const getRecentActivities = (limit = 10, filterVariant = null) => {
    const list = filterVariant ? activities.filter((a) => a.variant === filterVariant) : activities;
    return list.slice(0, Math.max(0, limit));
  };

  // History data will be fetched from API
  const [historyData, setHistoryData] = useState([]);

  // Fetch denied requests
  const fetchDeniedRequests = async () => {
    try {
      const res = await fetch('/api/requests?status=denied');
      const data = await res.json();
      
      console.log('Denied requests response:', data); // Debug log
      
      if (data.success && Array.isArray(data.data)) {
        const mapped = data.data.map((r, idx) => ({
          id: r.id ?? idx + 1,
          date: r.created_at ? new Date(r.created_at).toLocaleDateString("en-US", {
            month: "2-digit",
            day: "2-digit",
            year: "numeric",
          }) : '',
          item: r.equipment_name || r.item || r.items || r.title || 'Request',
          brand: r.brand || '',
          model: r.model || '',
          status: 'Denied',
          reason: r.denial_reason || r.reason || 'No reason provided'
        }));
        setDeniedRequests(mapped);
        return mapped;
      } else {
        // Set to empty array if no data
        setDeniedRequests([]);
        return [];
      }
    } catch (e) {
      console.error('Failed to fetch denied requests', e);
      setDeniedRequests([]);
      return [];
    }
  };

  const iconFor = (variant) => {
    if (variant === 'return') return { Icon: RefreshCcw, bg: 'bg-blue-50', text: 'text-blue-700' };
    if (variant === 'exchange') return { Icon: RefreshCcw, bg: 'bg-purple-50', text: 'text-purple-700' };
    if (variant === 'success') return { Icon: FilePlus2, bg: 'bg-green-50', text: 'text-green-700' };
    if (variant === 'warning') return { Icon: Mouse, bg: 'bg-yellow-50', text: 'text-yellow-700' };
    return { Icon: ClipboardList, bg: 'bg-gray-50', text: 'text-gray-700' };
  };

  // 🔍 Filter by search term
  const filteredData = useMemo(() => {
    return historyData.filter((item) =>
      item.item.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [historyData, searchTerm]);

  // 🔃 Sort the data
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      if (sortOption === "date-asc") return new Date(a.date) - new Date(b.date);
      if (sortOption === "date-desc") return new Date(b.date) - new Date(a.date);
      if (sortOption === "item-asc") return a.item.localeCompare(b.item);
      if (sortOption === "item-desc") return b.item.localeCompare(a.item);
      return 0;
    });
  }, [filteredData, sortOption]);

  // 📄 Pagination
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedData.slice(indexOfFirstItem, indexOfLastItem);

  const handleChangePage = (page) => setCurrentPage(page);


  // Denied requests will be fetched from API
  const [deniedRequests, setDeniedRequests] = useState([]);

  const handleReasonChange = (e) => {
    if (selectedRequest) {
      setDeniedRequests(deniedRequests.map(request =>
        request.id === selectedRequest.id
          ? { ...request, reason: e.target.value }
          : request
      ));
      setSelectedRequest({ ...selectedRequest, reason: e.target.value });
    }
  };

  // Approved transactions will be fetched from API
  const [approvedTransactions, setApprovedTransactions] = useState([]);

  // Equipment data will be fetched from API
  const [laptopBrands, setLaptopBrands] = useState([]);
  const [exchangeItems, setExchangeItems] = useState([]);

  // Database connection functions for transactions
  const fetchTransactionStats = async () => {
    try {
      const response = await fetch('/api/transactions/stats');
      const data = await response.json();

      if (data.success) {
        setTransactionStats({
          borrowed: data.data.borrowed || 0,
          available: data.data.available || 0,
          overdue: data.data.overdue || 0
        });
      }
    } catch (error) {
      console.error('Failed to fetch transaction stats:', error);
    }
  };

  const fetchPendingTransactions = async () => {
    try {
      const response = await fetch('/api/requests?status=pending');
      const data = await response.json();

      if (data.success && Array.isArray(data.data)) {
        setPendingTransactions(data.data);
      } else {
        setPendingTransactions([]);
      }
    } catch (error) {
      console.error('Failed to fetch pending requests:', error);
      setPendingTransactions([]);
    }
  };

  const fetchApprovedTransactions = async () => {
    try {
      const response = await fetch('/api/transactions/approved');
      const data = await response.json();

      if (data.success && Array.isArray(data.data)) {
        setTransactions(data.data);
      } else {
        setTransactions([]);
      }
    } catch (error) {
      console.error('Failed to fetch approved transactions:', error);
      setTransactions([]);
    }
  };

  const fetchTransactionHistory = async () => {
    try {
      const response = await fetch('/api/transactions/history');
      const data = await response.json();

      if (data.success && Array.isArray(data.data)) {
        // Merge server history with any local-only entries we have in historyData
        setHistoryData((prevLocal) => {
          const server = data.data || [];
          // Keep local entries that are marked as local or have ids not found in server
          const localOnly = (prevLocal || []).filter((h) => {
            if (!h) return false;
            // if item has a flag local === true keep it
            if (h.local) return true;
            // if id is missing or not present in server, keep it
            if (!h.id) return true;
            return !server.some((s) => String(s.id) === String(h.id));
          });

          const merged = [...localOnly, ...server];
          try { prevHistoryLenRef.current = Array.isArray(merged) ? merged.length : 0; } catch (_) {}
          return merged;
        });
        return data.data;
      } else {
        // keep local entries if server returns no data
        setHistoryData((prev) => prev || []);
        return [];
      }
    } catch (error) {
      console.error('Failed to fetch transaction history:', error);
      // keep local entries on error
      setHistoryData((prev) => prev || []);
      return [];
    }
  };

  // Poll history endpoint periodically to detect new history entries
  useEffect(() => {
    let stopped = false;
    const check = async () => {
      try {
        const data = await fetchTransactionHistory();
        if (stopped) return;
        const prevLen = prevHistoryLenRef.current || 0;
        const newLen = Array.isArray(data) ? data.length : 0;
        // If more items than previous length, increment notification by difference
        if (newLen > prevLen) {
          const diff = newLen - prevLen;
          incrementNotification(diff, null);
        }
        prevHistoryLenRef.current = newLen;
      } catch (e) {
        // ignore polling errors
      }
    };

    // initial check
    check();
    const iv = setInterval(check, 30000); // every 30s

    return () => {
      stopped = true;
      clearInterval(iv);
    };
  }, []);

  useEffect(() => {
    const loadTransactionData = async () => {
      await fetchTransactionStats();
      await fetchPendingTransactions();
      await fetchApprovedTransactions();
      const initialHistory = await fetchTransactionHistory();
      // Set the previous history length so the polling doesn't treat existing items as new
      prevHistoryLenRef.current = Array.isArray(initialHistory) ? initialHistory.length : 0;
      await fetchDeniedRequests(); // Fetch denied requests on load

      try {
        const res = await fetch('/api/employees/current-holders');
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          if (transactions.length === 0) {
            setTransactions(data.data);
          }
        }
      } catch (error) {
        console.error('Failed to fetch legacy transaction data:', error);
      }
    };

    loadTransactionData();

    // Setup Echo subscription for real-time events when available
    let subscribedChannel = null;
    (async () => {
      try {
        // determine the employee id for current user
        const res = await fetch('/check-auth', { credentials: 'same-origin' });
        const userData = await res.json();
        let employeeId = null;
        if (userData && userData.user) {
          // try to get linked_employee_id or fall back to lookup
          employeeId = userData.user.linked_employee_id || null;
        }

        if (!employeeId) {
          try {
            const eRes = await fetch('/api/employees');
            const eData = await eRes.json();
            const list = eData.success ? eData.data : eData;
            if (Array.isArray(list) && userData && userData.user && userData.user.email) {
              const found = list.find(emp => emp.email && emp.email.toLowerCase() === userData.user.email.toLowerCase());
              if (found) employeeId = found.id;
            }
          } catch (_) {}
        }

        if (employeeId && Echo) {
          try {
            subscribedChannel = Echo.private(`user.history.${employeeId}`);
            subscribedChannel.listen('RequestCreated', (e) => {
              const payload = e || {};
              const entry = {
                id: payload.id || payload.data?.id || Date.now(),
                item: payload.equipment_name || payload.item || payload.data?.equipment_name || payload.message || 'Request',
                message: payload.message || `Request ${payload.request_number || ''}`,
                variant: 'info',
                date: payload.created_at || payload.date || new Date().toISOString(),
                time: payload.created_at || payload.date || new Date().toISOString()
              };
              // Append to history and increment badge
              incrementNotification(1, entry);
            }).listen('RequestUpdated', (e) => {
              const payload = e || {};
              const entry = {
                id: payload.id || payload.data?.id || Date.now(),
                item: payload.equipment_name || payload.item || payload.data?.equipment_name || payload.message || 'Request',
                message: payload.message || `Request updated ${payload.request_number || ''}`,
                variant: 'info',
                date: payload.updated_at || payload.date || new Date().toISOString(),
                time: payload.updated_at || payload.date || new Date().toISOString()
              };
              incrementNotification(1, entry);
            });
          } catch (e) {
            // ignore Echo errors
          }
        }
      } catch (e) {
        // ignore
      }
    })();

    // Set up polling to refresh denied requests every 30 seconds
    const deniedRequestsInterval = setInterval(() => {
      fetchDeniedRequests();
    }, 30000); // 30 seconds

    // Cleanup interval on unmount
    return () => {
      clearInterval(deniedRequestsInterval);
      try {
        if (subscribedChannel && Echo) subscribedChannel.stopListening();
      } catch (_) {}
    };
  }, []);

  const handleRowClick = (request) => {
    setSelectedRequest(request);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const handleConfirmExchange = () => {
    // Handle the exchange confirmation logic here
    console.log('Exchange reason:', exchangeReason);
    console.log('Uploaded file:', uploadedFile);
    setShowReasonModal(false);
    setShowExchangeConfirmModal(true);
    setExchangeReason('');
    setUploadedFile(null);
  };

  const handleSendExchangeRequest = () => {
    setShowExchangeConfirmModal(false);
    // Reset to transactions view after confirmation
    setTimeout(() => setCurrentView('transactions'), 300);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }


  // ===== HISTORY VIEW =====
  if (showHistory) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-[#2262C6]">History</h1>
          <button
            onClick={() => {
              logActivity('Closed History', 'info');
              setShowHistory(false);
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

        </div>

        {/* Pagination Section */}
        <div className="flex flex-col sm:flex-row items-center justify-between mt-6">
          {/* Centered Pagination */}
          <div className="flex items-center justify-center gap-2">
            {/* Previous Button */}
            <button
              onClick={() => {
                setCurrentPage((prev) => {
                  const next = Math.max(prev - 1, 1);
                  if (next !== prev) logActivity(`History page changed to ${next}`, 'info');
                  return next;
                });
              }}
              disabled={currentPage === 1}
              className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-lg bg-white text-gray-700 text-sm hover:bg-blue-50 hover:border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ←
            </button>

            {/* Page Numbers with Dots */}
            {(() => {
              const visiblePages = 3;
              let startPage = Math.max(1, currentPage - Math.floor(visiblePages / 2));
              let endPage = startPage + visiblePages - 1;

              if (endPage > totalPages) {
                endPage = totalPages;
                startPage = Math.max(1, endPage - visiblePages + 1);
              }

              const pages = [];

              // First page
              if (startPage > 1) {
                pages.push(
                  <button
                    onClick={() => { setCurrentPage(1); logActivity('History page changed to 1', 'info'); }}
                    className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-lg bg-white text-gray-700 text-sm hover:bg-blue-50 hover:border-blue-400"
                  >
                    1
                  </button>
                );
                if (startPage > 2) {
                  pages.push(
                    <span key="dots1" className="px-2 text-gray-500">
                      ...
                    </span>
                  );
                }
              }

              // Visible middle pages
              for (let i = startPage; i <= endPage; i++) {
                pages.push(
                  <button
                    key={i}
                    onClick={() => { setCurrentPage(i); logActivity(`History page changed to ${i}`, 'info'); }}
                    className={`w-10 h-10 flex items-center justify-center border rounded-lg text-sm font-medium transition-all ${currentPage === i
                      ? "bg-blue-600 text-white border-blue-600 shadow-md"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-blue-50 hover:border-blue-400"
                      }`}
                  >
                    {i}
                  </button>
                );
              }

              // Last page
              if (endPage < totalPages) {
                if (endPage < totalPages - 1) {
                  pages.push(
                    <span key="dots2" className="px-2 text-gray-500">
                      ...
                    </span>
                  );
                }
                pages.push(
                  <button
                    key={totalPages}
                    onClick={() => { setCurrentPage(totalPages); logActivity(`History page changed to ${totalPages}`, 'info'); }}
                    className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-lg bg-white text-gray-700 text-sm hover:bg-blue-50 hover:border-blue-400"
                  >
                    {totalPages}
                  </button>
                );
              }

              return pages;
            })()}

            {/* Next Button */}
            <button
              onClick={() => {
                setCurrentPage((prev) => {
                  const next = Math.min(prev + 1, totalPages);
                  if (next !== prev) logActivity(`History page changed to ${next}`, 'info');
                  return next;
                });
              }}
              disabled={currentPage === totalPages}
              className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-lg bg-white text-gray-700 text-sm hover:bg-blue-50 hover:border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              →
            </button>
          </div>

          {/* Items per page (right side) */}
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
                <option key={num} value={num}>
                  {num}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    );
  }



  if (currentView === 'approved') {
    // Convert approved transactions to the format expected by ApprovedTransactions
    const approvedData = transactions.map((transaction, index) => ({
      date: transaction.created_at ? new Date(transaction.created_at).toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      }) : "09/23/2025",
      item: transaction.equipment_name || "Laptop, Projector, etc",
      status: "Approved",
      exchangeItems: [
        {
          name: transaction.equipment_name || "Laptop",
          brand: "Equipment",
          details: transaction.description || "Equipment details",
          icon: "💻"
        }
      ]
    }));

    // Mock borrowed details for the clickable card

    return (
      <ApprovedTransactions
        onBack={() => setCurrentView('transactions')}
        transactionStats={transactionStats}
        approvedTransactions={approvedData}
      />
    );
  }


  if (showPendings) {
    // Convert pending transactions to the format expected by OnProcessTransactions
    const requestsData = pendingTransactions.map((transaction, index) => ({
      id: transaction.id || index + 1,
      date: transaction.created_at ? new Date(transaction.created_at).toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit", 
        year: "numeric",
      }) : "09/23/2025",
      item: transaction.equipment_name || transaction.item || "Laptop, Projector, etc",
      status: transaction.status || "Pending",
      details: [
        {
          name: transaction.equipment_name || "Laptop",
          description: transaction.description || "Equipment details",
          icon: "https://cdn-icons-png.flaticon.com/512/1086/1086933.png"
        }
      ]
    }));

    return (
      <OnProcessTransactions
        onBack={() => setShowPendings(false)}
        requests={requestsData}
        deniedRequests={deniedRequests}
        setDeniedRequests={setDeniedRequests}
        fetchDeniedRequests={fetchDeniedRequests}
      />
    );
  }


  // Main transaction view
  return (
    <div className="grid grid-cols-12 gap-6 h-full">
      <div className="col-span-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold text-[#2262C6] transition-all duration-300">Home</h1>
        </div>

        <div className="grid grid-cols-2 gap-5 mb-8">
          {/* Item Currently Borrowed */}
          <div className="rounded-2xl bg-blue-600 text-white p-6 shadow-[0_8px_20px_rgba(0,0,0,0.25)] transform transition-transform hover:scale-[1.02]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium opacity-90 mb-1">Item Currently Borrowed</h3>
                <div className="text-4xl font-bold">{transactionStats.borrowed}</div>
              </div>
              <div className="w-12 h-12 bg-white/25 rounded-full flex items-center justify-center shadow-inner">
                📦
              </div>
            </div>
          </div>

          {/* Overdue Items */}
          <div className="rounded-2xl bg-white border border-gray-100 p-6 shadow-[0_6px_15px_rgba(0,0,0,0.15)] transform transition-transform hover:scale-[1.02]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">Overdue Items</h3>
                <div className="text-4xl font-bold text-gray-900">{transactionStats.overdue}</div>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center shadow-inner"></div>
            </div>
          </div>
        </div>


        <div className="bg-gray-100 rounded-lg border border-gray-200 mb-8">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#2262C6]">On Process</h2>
              <button
                onClick={async () => {
                  await fetchDeniedRequests(); // Refresh denied requests immediately
                  logActivity('Opened On Process view', 'info');
                  setShowPendings(true);
                }}
                className="text-right text-blue-600 text-sm font-medium hover:text-blue-700">
                View all
              </button>
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-15 gap-5 text-sm font-medium text-gray-700">
              <div className="col-span-2">Item</div>
              <div className="col-span-2">Start Date</div>
              <div className="col-span-2">Return Date</div>
              <div className="col-span-2">details</div>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {pendingTransactions.length > 0 ? pendingTransactions.slice(0, 3).map((transaction, index) => (
              <div
                key={transaction.id || index}
                className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => logActivity(`Clicked pending row: ${transaction.equipment_name || transaction.item || 'Item'} (${transaction.id || index})`, 'info')}
              >
                <div className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-2">
                    <span className="text-sm text-gray-900">
                      {transaction.equipment_name || transaction.item || "Laptop, Projector, etc"}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-sm text-gray-900">
                      {transaction.expected_start_date
                        ? new Date(transaction.expected_start_date).toLocaleDateString("en-US", {
                          month: "2-digit",
                          day: "2-digit",
                          year: "numeric",
                        })
                        : "09/24/2025"}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-sm text-gray-900">
                      {transaction.expected_end_date
                        ? new Date(transaction.expected_end_date).toLocaleDateString("en-US", {
                          month: "2-digit",
                          day: "2-digit",
                          year: "numeric",
                        })
                        : "09/24/2025"}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-sm text-gray-900">
                      {transaction.created_at
                        ? new Date(transaction.created_at).toLocaleDateString("en-US", {
                          month: "2-digit",
                          day: "2-digit",
                          year: "numeric",
                        })
                        : "09/23/2025"}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-sm text-gray-900">
                      {transaction.status || "Pending"}
                    </span>
                  </div>
                </div>
              </div>
            )) : (
              <>
              </>
            )}
          </div>
        </div>

        <div className="bg-gray-100 rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#2262C6]">Approved</h2>
              <button
                onClick={() => {
                  setSelectedRow(null);
                  setCurrentView('approved');
                  logActivity('Opened Approved view', 'info');
                }}
                className="text-right text-blue-600 text-sm font-medium hover:text-blue-700">
                View all
              </button>
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-700">
              <div className="col-span-2">Item</div>
              <div className="col-span-2">Start Date</div>
              <div className="col-span-2">Return Date</div>
              <div className="col-span-2">Date</div>
              <div className="col-span-2">Status</div>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {transactions.length > 0 ? transactions.map((transaction, index) => (
              <div
                key={transaction.id}
                className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => logActivity(`Clicked approved row: ${transaction.equipment_name || 'Item'} (${transaction.id || index})`, 'info')}
              >
                <div className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-3">
                    <span className="text-sm text-gray-900">
                      {transaction.created_at
                        ? new Date(transaction.created_at).toLocaleDateString("en-US", {
                          month: "2-digit",
                          day: "2-digit",
                          year: "numeric",
                        })
                        : "09/23/2025"}
                    </span>
                  </div>
                  <div className="col-span-6">
                    <span className="text-sm text-gray-900">
                      {transaction.equipment_name || "Laptop, Projector, etc"}
                    </span>
                  </div>
                  <div className="col-span-3">
                    <span className="text-sm text-gray-900">Pending</span>
                  </div>
                </div>
              </div>
            )) : (
              <>
                <div className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-3">
                      <span className="text-sm text-gray-900">09/23/2025</span>
                    </div>
                    <div className="col-span-6">
                      <span className="text-sm text-gray-900">Laptop, Projector, etc</span>
                    </div>
                    <div className="col-span-3">
                      <span className="text-sm text-gray-900">Pending</span>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-3">
                      <span className="text-sm text-gray-900">09/22/2025</span>
                    </div>
                    <div className="col-span-6">
                      <span className="text-sm text-gray-900">Laptop, Projector, etc</span>
                    </div>
                    <div className="col-span-3">
                      <span className="text-sm text-gray-900">Pending</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="col-span-4 space-y-6">
        <div className="flex justify-end">
          <button
            onClick={() => {
              logActivity('Opened History', 'info');
              // Reset unseen counter when user opens history
              try { localStorage.setItem('employee_history_unseen', '0'); } catch (_) {}
              setNotificationCount(0);
              // Force refetch history to show latest
              fetchTransactionHistory();
              setShowHistory(true);
            }}
            className="relative flex items-center justify-center bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm font-semibold text-gray-700 shadow-md shadow-gray-400/60 hover:shadow-lg hover:shadow-gray-500/70 hover:-translate-y-1 transition-all duration-300 active:translate-y-0 active:shadow-sm w-full sm:w-auto"
          >
            History

            {/* Notification Badge */}
            <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shadow-md shadow-red-700/70">
              <span className="text-white text-xs font-bold">{notificationCount > 99 ? '99+' : notificationCount}</span>
            </div>
          </button>
        </div>

        <div className="p-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            {/* Header */}
            <div className="p-4 bg-blue-500 rounded-t-xl">
              <h3 className="text-lg font-semibold text-white text-center">
                Recent Activities
              </h3>
            </div>

            {/* Activity List */}
            <div className="p-6 space-y-5">
              <div className="p-4 text-gray-700">
                <ul className="space-y-3">
                  {getRecentActivities(10).map((a) => {
                    const { Icon, bg, text } = iconFor(a.variant);
                    return (
                      <li key={a.id} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`${bg} p-2 rounded-lg flex-shrink-0`}>
                            <Icon className={`h-5 w-5 ${text}`} />
                          </div>
                          <span className="text-sm text-gray-800 truncate">{a.message}</span>
                        </div>
                        <span className="text-xs text-gray-500 flex-shrink-0 ml-3">{timeAgo(a.time)}</span>
                      </li>
                    );
                  })}
                  {getRecentActivities(10).length === 0 && (
                    <li className="text-sm text-gray-500">No recent activity</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Toast styles could be improved or replaced by a component library
const Toast = ({ t }) => {
  const bg = t.variant === 'success' ? 'bg-green-50' : t.variant === 'warning' ? 'bg-yellow-50' : t.variant === 'error' ? 'bg-red-50' : 'bg-white';
  const text = t.variant === 'success' ? 'text-green-700' : t.variant === 'warning' ? 'text-yellow-700' : t.variant === 'error' ? 'text-red-700' : 'text-gray-800';
  return (
    <div className={`max-w-sm w-full ${bg} border border-gray-200 rounded-lg shadow-md p-3 mb-3`}> 
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 rounded-full p-1 ${bg}`}>
          <div className={`h-3 w-3 ${text} rounded-full`} />
        </div>
        <div className="flex-1 text-sm text-gray-800">{t.message}</div>
      </div>
    </div>
  );
};

export default EmployeeTransaction;

export default EmployeeTransaction;