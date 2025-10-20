import React, { useState, useEffect, useMemo } from 'react';
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


  // History data will be fetched from API
  const [historyData, setHistoryData] = useState([]);

  // Fetch denied requests
  const fetchDeniedRequests = async () => {
    try {
      const res = await fetch('/api/requests?status=denied');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const mapped = data.data.map((r, idx) => ({
          id: r.id ?? idx + 1,
          date: r.date || r.created_at || '',
          item: r.item || r.items || r.title || 'Request',
          brand: r.brand || '',
          model: r.model || '',
          status: 'Denied',
          reason: r.reason || ''
        }));
        if (mapped.length > 0) {
          setDeniedRequests(mapped);
          return mapped;
        }
      }
      return null;
    } catch (e) {
      // keep existing state on error
      console.error('Failed to fetch denied requests', e);
      return null;
    }
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
      setLoading(true);
      const response = await fetch('/api/requests?status=pending');
      const data = await response.json();

      if (data.success && Array.isArray(data.data)) {
        setPendingTransactions(data.data);
      } else {
        setPendingTransactions([]);
      }
    } catch (error) {
      console.error('Failed to fetch pending requests:', error);
      setError('Failed to load pending requests');
      setPendingTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchApprovedTransactions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/transactions/approved');
      const data = await response.json();

      if (data.success && Array.isArray(data.data)) {
        setTransactions(data.data);
      } else {
        setTransactions([]);
      }
    } catch (error) {
      console.error('Failed to fetch approved transactions:', error);
      setError('Failed to load approved transactions');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactionHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/transactions/history');
      const data = await response.json();

      if (data.success && Array.isArray(data.data)) {
        setHistoryData(data.data);
        return data.data;
      } else {
        setHistoryData([]);
        return [];
      }
    } catch (error) {
      console.error('Failed to fetch transaction history:', error);
      setError('Failed to load transaction history');
      setHistoryData([]);
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadTransactionData = async () => {
      await fetchTransactionStats();
      await fetchPendingTransactions();
      await fetchApprovedTransactions();
      await fetchTransactionHistory();

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
          <h1 className="text-3xl font-bold text-blue-600">History</h1>
          <button
            onClick={() => setShowHistory(false)}
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
            onChange={(e) => setSearchTerm(e.target.value)}
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
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
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
                    key={1}
                    onClick={() => setCurrentPage(1)}
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
                    onClick={() => setCurrentPage(i)}
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
                    onClick={() => setCurrentPage(totalPages)}
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
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
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
        borrowedDetails={borrowedDetails}
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
          <h1 className="text-4xl font-bold text-[#2262C6] transition-all duration-300">Transaction</h1>
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
                onClick={() => setShowPendings(true)}
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
              <div className="col-span-2">details</div>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {pendingTransactions.length > 0 ? pendingTransactions.slice(0, 3).map((transaction, index) => (
              <div key={transaction.id || index} className="px-6 py-4 hover:bg-gray-50 transition-colors">
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
                onClick={() => { setSelectedRow(null); setCurrentView('approved'); }}
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
                className="px-6 py-4 hover:bg-gray-50 transition-colors"
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
            onClick={() => setShowHistory(true)}
            className="relative flex items-center justify-center bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm font-semibold text-gray-700 shadow-md shadow-gray-400/60 hover:shadow-lg hover:shadow-gray-500/70 hover:-translate-y-1 transition-all duration-300 active:translate-y-0 active:shadow-sm w-full sm:w-auto"
          >
            History

            {/* Notification Badge */}
            <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shadow-md shadow-red-700/70">
              <span className="text-white text-xs font-bold">1</span>
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
              {/* Borrowed */}
              <div className="p-4 text-gray-700">
                <ul className="space-y-3">
                  <li className="flex items-center space-x-3">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <Laptop className="h-5 w-5 text-blue-600" />
                    </div>
                    <span className="text-sm">Checked out 2 laptops for repair</span>
                  </li>

                  <li className="flex items-center space-x-3">
                    <div className="bg-yellow-100 p-2 rounded-lg">
                      <Mouse className="h-5 w-5 text-yellow-600" />
                    </div>
                    <span className="text-sm">Returned 1 mouse from IT storage</span>
                  </li>

                  <li className="flex items-center space-x-3">
                    <div className="bg-green-100 p-2 rounded-lg">
                      <FilePlus2 className="h-5 w-5 text-green-600" />
                    </div>
                    <span className="text-sm">Added new transaction record</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeTransaction;