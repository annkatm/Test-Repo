import React, { useState, useEffect,useMemo } from 'react';
import { Laptop, X, RefreshCcw, ClipboardList, Mouse, FilePlus2} from 'lucide-react';

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


  // Sample data for return items
  const historyData = [
 { date: "2025-10-01", item: "Laptop", status: "Approved" },
  { date: "2025-10-02", item: "Projector", status: "Approved" },
  { date: "2025-10-03", item: "Mouse", status: "Approved" },
  { date: "2025-10-04", item: "Keyboard", status: "Approved" },
  { date: "2025-10-05", item: "Monitor", status: "Approved" },
  { date: "2025-10-06", item: "HDMI Cable", status: "Approved" },
  { date: "2025-10-07", item: "Speaker", status: "Approved" },
  { date: "2025-10-08", item: "Tablet", status: "Approved" },
  { date: "2025-10-09", item: "Charger", status: "Approved" },
  { date: "2025-10-10", item: "Camera", status: "Approved" },
  { date: "2025-10-11", item: "Router", status: "Approved" },
  { date: "2025-10-12", item: "Microphone", status: "Approved" },
  { date: "2025-10-13", item: "Webcam", status: "Approved" },
  { date: "2025-10-14", item: "Extension Cord", status: "Approved" },
  { date: "2025-10-15", item: "USB Hub", status: "Approved" },
  { date: "2025-10-16", item: "Flash Drive", status: "Approved" },
  { date: "2025-10-17", item: "Ethernet Cable", status: "Approved" },
  { date: "2025-10-18", item: "Smartwatch", status: "Approved" },
  { date: "2025-10-19", item: "Tripod", status: "Approved" },
  { date: "2025-10-20", item: "Headphones", status: "Approved" },
  { date: "2025-10-21", item: "Power Bank", status: "Approved" },
  { date: "2025-10-22", item: "Printer", status: "Approved" },
  { date: "2025-10-23", item: "Scanner", status: "Approved" },
  { date: "2025-10-24", item: "Drawing Tablet", status: "Approved" },
  { date: "2025-10-25", item: "VR Headset", status: "Approved" },
  { date: "2025-10-26", item: "Game Controller", status: "Approved" },
  { date: "2025-10-27", item: "Smart TV", status: "Approved" },
  { date: "2025-10-28", item: "LED Light", status: "Approved" },
  { date: "2025-10-29", item: "Bluetooth Adapter", status: "Approved" },
  { date: "2025-10-30", item: "External Hard Drive", status: "Approved" },
  { date: "2025-10-31", item: "Graphics Card", status: "Approved" },
  { date: "2025-11-01", item: "SSD", status: "Approved" },
  { date: "2025-11-02", item: "RAM Module", status: "Approved" },
  { date: "2025-11-03", item: "Motherboard", status: "Approved" },
  { date: "2025-11-04", item: "Processor", status: "Approved" },
  { date: "2025-11-05", item: "Cooling Fan", status: "Approved" },
  { date: "2025-11-06", item: "Power Supply", status: "Approved" },
  { date: "2025-11-07", item: "Desktop Case", status: "Approved" },
  { date: "2025-11-08", item: "Laptop Stand", status: "Approved" },
  { date: "2025-11-09", item: "Wireless Mouse", status: "Approved" },
  { date: "2025-11-10", item: "Wireless Keyboard", status: "Approved" },
  { date: "2025-11-11", item: "HDMI Splitter", status: "Approved" },
  { date: "2025-11-12", item: "Surge Protector", status: "Approved" },
  { date: "2025-11-13", item: "Laptop Bag", status: "Approved" },
  { date: "2025-11-14", item: "Monitor Arm", status: "Approved" },
  { date: "2025-11-15", item: "Cable Organizer", status: "Approved" },
  { date: "2025-11-16", item: "Projector Screen", status: "Approved" },
  { date: "2025-11-17", item: "Smart Plug", status: "Approved" },
  { date: "2025-11-18", item: "NAS Storage", status: "Approved" },
  { date: "2025-11-19", item: "Docking Station", status: "Approved" },
  { date: "2025-11-20", item: "UPS Battery", status: "Approved" },
  ];

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


  // Static data for denied requests and approved transactions
 const [deniedRequests, setDeniedRequests] = useState([
   {
  id: 1,
  date: "2025-10-07",
  item: "Laptop",
  brand: "Razer",
  model: "Blade 14 RGB",
  status: "Denied",
  reason: ""
}
  ]);

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

  const approvedTransactions = [
    { date: '09/23/2025', item: 'Laptop, Projector, etc', status: 'Approved' },
    { date: '09/22/2025', item: 'Laptop, Projector, etc', status: 'Approved' },
    { date: '09/21/2025', item: 'Laptop, Projector, etc', status: 'Approved' },
  ];

  const laptopBrands = [
    { 
      name: 'Asus',
      availableUnits: 9,
      image: '💻'
    },
    { 
      name: 'Lenovo',
      availableUnits: 7,
      image: '💻'
    },
    { 
      name: 'Acer',
      availableUnits: 4,
      image: '💻'
    },
    { 
      name: 'Razor',
      availableUnits: 9,
      image: '💻'
    },
  ];

  const exchangeItems = [
    { 
      name: 'Laptop', 
      brand: 'Lenovo',
      details: 'Core 5 16gb RAM, 1T storage, Windows 11',
      icon: '💻'
    },
    { 
      name: 'Mouse', 
      brand: 'Mouse',
      details: 'Logitech G Pro Wireless',
      icon: '🖱️'
    },
    { 
      name: 'Projector', 
      brand: 'Mouse',
      details: 'Acer X1128H',
      icon: '📽️'
    },
  ];

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
        return data.data;
      } else {
        return [];
      }
    } catch (error) {
      console.error('Failed to fetch transaction history:', error);
      setError('Failed to load transaction history');
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

        {/* Table Body */}
        <div className="divide-y divide-gray-100">
          {currentItems.length > 0 ? (
            currentItems.map((item, index) => (
              <div
                key={index}
                className="grid grid-cols-12 py-4 px-6 text-sm text-gray-700 hover:bg-blue-50 transition-all"
              >
                <div className="col-span-3">{item.date}</div>
                <div className="col-span-3">{item.item}</div>
                <div className="col-span-3">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                      item.status === "Returned"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
                <div className="col-span-3">{item.returnDate}</div>
              </div>
            ))
          ) : (
            <div className="py-6 text-center text-gray-500 text-sm">
              No matching results found.
            </div>
          )}
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
                  className={`w-10 h-10 flex items-center justify-center border rounded-lg text-sm font-medium transition-all ${
                    currentPage === i
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
  return (
    <div className="space-y-6 relative">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-blue-600">Approved</h1>
        <button
          onClick={() => setCurrentView('transactions')}
          className="flex items-center gap-2 bg-white text-blue-600 font-medium px-4 py-2 rounded-lg shadow hover:shadow-md hover:bg-blue-50 transition-all"
        >
          ← Back
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left side list */}
        <div className="col-span-2 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <div className="bg-gray-200 px-6 py-4 rounded-lg mb-1">
              <div className="grid grid-cols-3 gap-4 font-semibold text-gray-700">
                <span>Date</span>
                <span>Item</span>
                <span>Status</span>
              </div>
            </div>

            <div className="space-y-0">
              {approvedTransactions.map((transaction, index) => (
                <div
                  key={index}
                  onClick={() => setSelectedRow(index)}
                  className={`px-6 py-4 cursor-pointer transition-colors ${
                    selectedRow === index
                      ? 'bg-blue-200'
                      : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="grid grid-cols-3 gap-4 text-gray-700">
                    <span>{transaction.date}</span>
                    <span>{transaction.item}</span>
                    <span>{transaction.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Exchange Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-6">
              Exchange
            </h3>

            <div className="space-y-4 mb-6">
              {exchangeItems.map((item, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-800">{item.name}</div>
                    <div className="text-xs text-gray-500">{item.brand}</div>
                    <div className="text-xs text-gray-600 mt-1">
                      {item.details}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowReturnModal(true)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium shadow-md transform transition-all duration-300 hover:scale-105 hover:shadow-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                Return Now
              </button>
              <button
                onClick={() => setShowBrowseLaptopsModal(true)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium shadow-md transform transition-all duration-300 hover:scale-105 hover:shadow-xl hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
              >
                Exchange
              </button>
            </div>
          </div>

          {/* Borrowed Stat Card */}
          <div className="rounded-xl bg-gradient-to-br from-blue-600 to-blue-500 text-white p-6 h-48 w-full shadow-xl shadow-blue-900/50 transform transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-800/70">
            <div className="flex justify-between items-start mb-4">
              <span className="text-sm font-medium drop-shadow-md">
                Item Currently Borrowed
              </span>
              <div className="w-10 h-10 flex items-center justify-center bg-white bg-opacity-20 rounded-md shadow-inner transform transition-transform duration-300 hover:scale-110">
                📦
              </div>
            </div>
            <div className="text-5xl font-bold drop-shadow-md">
              {transactionStats.borrowed}
            </div>
          </div>
        </div>
      </div>

      {/* ====== BROWSE LAPTOPS MODAL ====== */}
      {showBrowseLaptopsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden
                       transform transition-all duration-500 scale-100 hover:scale-[1.01]
                       shadow-blue-900/30 hover:shadow-blue-800/50"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-600/5 to-blue-300/10">
              <h2 className="text-2xl font-bold text-gray-900">Browse Laptops</h2>
              <button
                onClick={() => {
                  setShowBrowseLaptopsModal(false);
                  setSelectedLaptop(null);
                  setActiveCategory('Laptops');
                }}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Search and Filters */}
            <div className="p-6 border-b bg-gray-50">
              <div className="flex items-center gap-2 mb-4 bg-white rounded-lg px-4 py-3 shadow-sm border border-gray-200">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search"
                  className="flex-1 outline-none text-gray-700"
                />
              </div>

              <div className="flex gap-3">
                {['All', 'Laptops', 'Projectors', 'Accesories'].map((category) => (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      activeCategory === category
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* Body - Laptop Grid */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  { brand: 'Asus', available: 9, image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=300' },
                  { brand: 'Lenovo', available: 7, image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=300' },
                  { brand: 'Acer', available: 4, image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=300' },
                  { brand: 'Razor', available: 9, image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=300' }
                ].map((laptop, index) => (
                  <div
                    key={index}
                    onClick={() => setSelectedLaptop(laptop.brand)}
                    className={`bg-white rounded-xl border-2 p-6 cursor-pointer transition-all duration-300 hover:shadow-lg ${
                      selectedLaptop === laptop.brand
                        ? 'border-blue-600 shadow-lg ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className="w-32 h-32 bg-gray-100 rounded-lg flex items-center justify-center mb-4 overflow-hidden">
                        <span className="text-6xl">💻</span>
                      </div>
                      <h3 className="font-bold text-gray-900 mb-2">{laptop.brand}</h3>
                      <p className="text-sm text-gray-600 mb-1">Available Unit:</p>
                      <p className="text-2xl font-bold text-blue-600">{laptop.available}</p>
                      <button className="mt-4 w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                        View All
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t bg-gray-50 flex justify-end">
              <button
                onClick={() => {
                  setShowBrowseLaptopsModal(false);
                  setShowReasonModal(true);
                }}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold shadow-md hover:bg-blue-700 hover:shadow-xl transition-all transform hover:scale-105"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== RETURN NOW MODAL ====== */}
      {showReturnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div
            className="bg-white rounded-2xl shadow-2xl w-[420px] p-6 relative transform transition-all duration-500
                       scale-100 hover:scale-[1.01] hover:rotate-[0.5deg]
                       shadow-blue-900/30 hover:shadow-blue-800/50
                       perspective-[1200px] motion-safe:animate-pop3D"
            style={{ transformStyle: 'preserve-3d' }}
          >
            <h2 className="text-lg font-bold text-gray-900 mb-6 text-center drop-shadow-md">
              Return Confirmation
            </h2>

            {/* Item List */}
            <div className="space-y-4 mb-6">
              {[
                {
                  img: 'https://cdn-icons-png.flaticon.com/512/1086/1086933.png',
                  name: 'Laptop',
                  desc: 'Lenovo iCore 5 16GB RAM, 1TB storage, Windows 11',
                },
                {
                  img: 'https://cdn-icons-png.flaticon.com/512/1063/1063190.png',
                  name: 'Mouse',
                  desc: 'Logitech G Pro Wireless',
                },
                {
                  img: 'https://cdn-icons-png.flaticon.com/512/1048/1048944.png',
                  name: 'Projector',
                  desc: 'Acer X1128H',
                },
              ].map((item, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 pb-4 border-b border-gray-100 last:border-0"
                >
                  <img
                    src={item.img}
                    alt={item.name}
                    className="w-12 h-12 object-contain drop-shadow-md"
                  />
                  <div>
                    <p className="font-semibold text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowReturnModal(false)}
                className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 shadow-sm transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowReturnModal(false)}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg font-medium shadow-md hover:bg-blue-700 hover:shadow-xl transition-all"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== EXCHANGE (REASON + EVIDENCE) MODAL ====== */}
{showReasonModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
    <div
      className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden
                 transform transition-all duration-500 scale-100 rotate-[0.5deg] hover:rotate-0 hover:scale-[1.02]
                 shadow-blue-900/30 hover:shadow-blue-800/50 perspective-[1000px] motion-safe:animate-pop3D"
      style={{ transformStyle: 'preserve-3d' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-600/5 to-blue-300/10">
        <h2 className="text-xl font-bold text-gray-900 drop-shadow-md">
          Reason and Evidence
        </h2>
        <button
          onClick={() => {
            setShowReasonModal(false);
            setExchangeReason('');
            setUploadedFile(null);
          }}
          className="text-gray-400 hover:text-gray-600 transition"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div>
          <label className="block text-base font-semibold text-gray-900 mb-3">
            Reason for Exchange:
          </label>
          <textarea
            value={exchangeReason}
            onChange={(e) => setExchangeReason(e.target.value)}
            placeholder="Enter your reason for exchange..."
            className="w-full h-40 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-gray-50 shadow-inner"
          />
        </div>

        <div>
          <label className="block text-base font-semibold text-gray-900 mb-3">
            Upload Photo/Video:
          </label>
          <div className="relative">
            <input
              type="file"
              accept="image/*,video/*"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 shadow-inner transition-colors"
            >
              {uploadedFile ? (
                <div className="flex flex-col items-center">
                  <svg
                    className="w-12 h-12 text-green-500 mb-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <p className="text-sm font-medium text-gray-700">
                    {uploadedFile.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Click to change file
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <svg
                    className="w-16 h-16 text-gray-400 mb-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="text-sm text-gray-500">
                    Click to upload photo or video
                  </p>
                </div>
              )}
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={() => {
              setShowReasonModal(false);
              setExchangeReason('');
              setUploadedFile(null);
            }}
            className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 shadow-sm transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmExchange}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg font-medium shadow-md hover:bg-blue-700 hover:shadow-xl transition-all"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  </div>
)}

{/* ====== EXCHANGE REQUEST CONFIRMATION MODAL ====== */}
{showExchangeConfirmModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
      {/* Header */}
      <h2 className="text-lg font-bold text-gray-900 mb-4">
        Exchange Request
      </h2>

      {/* Item Info */}
      <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-200">
        <img
          src="https://cdn-icons-png.flaticon.com/512/1086/1086933.png"
          alt="Laptop"
          className="w-16 h-16 object-contain"
        />
        <div>
          <p className="font-semibold text-gray-900">Laptop</p>
          <p className="text-sm text-gray-500">Razor</p>
          <p className="text-sm text-gray-500">Basic i4 16GB</p>
        </div>
      </div>

      {/* Exchange Summary */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Exchange Summary
        </h3>
        <div className="space-y-2">
          <div>
            <p className="text-xs text-gray-500">Laptop</p>
            <p className="text-sm text-gray-900">Razor Basic i4 16GB</p>
          </div>
          <div className="pt-2 border-t border-gray-200">
            <p className="text-xs text-gray-500">Request Date</p>
            <p className="text-sm text-gray-900">09.24.2025</p>
          </div>
        </div>
      </div>

      {/* Send Request Button */}
      <button
        onClick={() => {
          setShowExchangeConfirmModal(false);
          // Add your send request logic here
        }}
        className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-md"
      >
        Send Request
      </button>
    </div>
  </div>
)}
    </div>  
    );
}


 if (showPendings) {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Back Button - at page level */}
        <div className="flex justify-end -mt-4 mb-4">
          <button
            onClick={() => setShowPendings(false)}
            className="bg-white text-blue-600 font-medium px-6 py-3 rounded-lg shadow hover:shadow-md hover:bg-blue-50 transition-all border border-gray-200"
          >
            ← Back
          </button>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Left Column - Table */}
          <div className="col-span-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 bg-white">
                <h1 className="text-2xl font-semibold text-gray-900">
                  On Process
                </h1>
              </div>

              {/* Table Header */}
              <div className="grid grid-cols-12 bg-gray-50 text-gray-600 font-medium text-sm py-3 px-6 border-b border-gray-200">
                <div className="col-span-3">Date</div>
                <div className="col-span-6">Item</div>
                <div className="col-span-3">Status</div>
              </div>

              {/* Table Rows */}
              <div className="divide-y divide-gray-100 bg-white">
                {[
                  {
                    date: "09/23/2025",
                    item: "Laptop, Projector, etc",
                    status: "Pending",
                  },
                  {
                    date: "09/22/2025",
                    item: "Laptop, Projector, etc",
                    status: "Pending",
                  },
                  {
                    date: "09/21/2025",
                    item: "Laptop, Projector, etc",
                    status: "Pending",
                  },
                ].map((row, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-12 items-center py-4 px-6 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div className="col-span-3 text-gray-700 text-sm font-medium">
                      {row.date}
                    </div>
                    <div className="col-span-6 text-gray-600 text-sm">
                      {row.item}
                    </div>
                    <div className="col-span-3">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                        {row.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="col-span-4 flex flex-col space-y-6">
            {/* Inspect Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">
                Inspect
              </h2>

              {/* Laptop */}
              <div className="flex items-start gap-4 pb-4 mb-4 border-b border-gray-100">
                <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-200">
                  <img
                    src="https://cdn-icons-png.flaticon.com/512/1086/1086933.png"
                    alt="Laptop"
                    className="w-7 h-7 object-contain"
                  />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 mb-1">Laptop</p>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    Lenovo iCore 5 16GB RAM, 1TB storage, Windows 11
                  </p>
                </div>
              </div>

              {/* Mouse */}
              <div className="flex items-start gap-4 pb-4 mb-4 border-b border-gray-100">
                <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-200">
                  <img
                    src="https://cdn-icons-png.flaticon.com/512/1063/1063190.png"
                    alt="Mouse"
                    className="w-7 h-7 object-contain"
                  />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 mb-1">Mouse</p>
                  <p className="text-sm text-gray-500">
                    Logitech G Pro Wireless
                  </p>
                </div>
              </div>

              {/* Projector */}
              <div className="flex items-start gap-4 pb-4 mb-6">
                <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-200">
                  <img
                    src="https://cdn-icons-png.flaticon.com/512/1048/1048944.png"
                    alt="Projector"
                    className="w-7 h-7 object-contain"
                  />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 mb-1">
                    Projector
                  </p>
                  <p className="text-sm text-gray-500">Acer X1128H</p>
                </div>
              </div>

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
                <h3 className="text-sm font-medium opacity-90">
                  Denied Request
                </h3>
                <div className="w-10 h-10 bg-white bg-opacity-25 rounded-full flex items-center justify-center">
                  <div className="w-4 h-4 bg-white bg-opacity-50 rounded-full"></div>
                </div>
              </div>
              <div className="text-4xl font-bold mb-4">3</div>
              <button
                onClick={() => setIsDeniedModalOpen(true)}
                className="w-full text-sm bg-blue-700 text-white px-4 py-2 rounded-md hover:bg-blue-800 transition"
              >
                View All
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="relative bg-white rounded-xl shadow-2xl p-6 w-[328px] md:w-[482px] animate-fadeIn">
            <h2 className="text-sm font-semibold text-gray-900 mb-6">Cancel Confirmation</h2>

            {/* Laptop */}
            <div className="flex items-start gap-4 pb-4 mb-4 border-b border-gray-200">
              <img src="https://cdn-icons-png.flaticon.com/512/1086/1086933.png" alt="Laptop" className="w-14 h-14 object-contain" />
              <div>
                <p className="font-medium text-gray-900 mb-1">Laptop</p>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Lenovo iCore 5 16GB RAM, 1TB storage, Windows 11
                </p>
              </div>
            </div>

            {/* Mouse */}
            <div className="flex items-start gap-4 pb-4 mb-4 border-b border-gray-200">
              <img src="https://cdn-icons-png.flaticon.com/512/1063/1063190.png" alt="Mouse" className="w-14 h-14 object-contain" />
              <div>
                <p className="font-medium text-gray-900 mb-1">Mouse</p>
                <p className="text-sm text-gray-500">Logitech G Pro Wireless</p>
              </div>
            </div>

            {/* Projector */}
            <div className="flex items-start gap-4 mb-8">
              <img src="https://cdn-icons-png.flaticon.com/512/1048/1048944.png" alt="Projector" className="w-14 h-14 object-contain" />
              <div>
                <p className="font-medium text-gray-900 mb-1">Projector</p>
                <p className="text-sm text-gray-500">Acer X1128H</p>
              </div>
            </div>

            {/* Confirm Button */}
            <div className="flex justify-center">
              <button
                onClick={() => {
                  setIsCancelModalOpen(false);
                  // Add cancel logic here
                }}
                className="px-8 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition"
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
              <div className="flex-1 p-6 overflow-y-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">Date</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">Item</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deniedRequests.map((request) => (
                      <tr
                        key={request.id}
                        onClick={() => handleRowClick(request)}
                        className={`cursor-pointer hover:bg-blue-50 transition-colors border-b border-gray-100 ${
                          selectedRequest?.id === request.id ? "bg-blue-100" : ""
                        }`}
                      >
                        <td className="p-3 text-sm text-gray-700">{request.date}</td>
                        <td className="p-3 text-sm text-gray-700">{request.item}</td>
                        <td className="p-3 text-sm">
                          <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
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
                    <p className="font-semibold text-gray-800">{selectedRequest.item}</p>
                    <p className="text-sm text-gray-500">{selectedRequest.brand}</p>
                    <p className="text-sm text-gray-500">{selectedRequest.model}</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 text-center">
                    <p className="text-gray-500 text-sm">Select a request to inspect</p>
                  </div>
                )}

                <div>
                  <h4 className="font-semibold text-gray-800 mb-2 text-sm">View Denied Reason</h4>
                  <textarea
                    value={selectedRequest ? selectedRequest.reason : ""}
                    readOnly
                    placeholder="No request selected"
                    className="w-full bg-gray-50 rounded-lg border border-gray-300 p-3 min-h-[100px] text-sm text-gray-700 resize-none focus:outline-none cursor-default"
                  />
                </div>

                <button
                  disabled={!selectedRequest}
                  className={`w-full py-2.5 rounded-lg font-medium text-sm shadow-sm transition-all ${
                    selectedRequest
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  Appeal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}




   




  // Main transaction view
 return (
  <div className="grid grid-cols-12 gap-6 h-full">
    <div className="col-span-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-blue-600">Transaction</h1>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Item Currently Borrowed */}
        <div className="rounded-2xl bg-blue-600 text-white p-6 shadow-[0_8px_20px_rgba(0,0,0,0.25)] transform transition-transform hover:scale-[1.02]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium opacity-90 mb-1">Item Currently Borrowed</h3>
              <div className="text-4xl font-bold">{transactionStats.borrowed}</div>
            </div>
            <div className="w-12 h-12 bg-white/25 rounded-full flex items-center justify-center shadow-inner">
              <div className="w-6 h-6 bg-white/40 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Available Items */}
        <div className="rounded-2xl bg-white border border-gray-100 p-6 shadow-[0_6px_15px_rgba(0,0,0,0.15)] transform transition-transform hover:scale-[1.02]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Available Items</h3>
              <div className="text-4xl font-bold text-gray-900">{transactionStats.available}</div>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center shadow-inner"></div>
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


        <div className="bg-gray-100 rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-blue-600">On Process</h2>
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
              <div className="col-span-2">Status</div>
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
                <div className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-2">
                      <span className="text-sm text-gray-900">Laptop, Projector, etc</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-sm text-gray-900">09/24/2025</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-sm text-gray-900">09/24/2025</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-sm text-gray-900">09/23/2025</span>
                    </div>
                    <div className="col-span-2">
                   <span className="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 border border-yellow-300 shadow-sm">
                   Pending
                 </span>
                    </div>
                  </div>
                </div>
    
                <div className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-2">
                      <span className="text-sm text-gray-900">Laptop, Projector, etc</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-sm text-gray-900">09/24/2025</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-sm text-gray-900">09/24/2025</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-sm text-gray-900">09/22/2025</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-sm text-gray-900">Pending</span>
                    </div>
                  </div>
                </div>
    
                <div className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-2">
                      <span className="text-sm text-gray-900">Laptop, Projector, etc</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-sm text-gray-900">09/24/2025</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-sm text-gray-900">09/24/2025</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-sm text-gray-900">09/21/2025</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-sm text-gray-900">Pending</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="bg-gray-100 rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-blue-600">Approved</h2>
              <button               
                onClick={() => setCurrentView('approved')}               
                className="text-right text-blue-600 text-sm font-medium hover:text-blue-700">
                View all             
              </button>
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-700">
              <div className="col-span-3">Date</div>
              <div className="col-span-6">Item</div>
              <div className="col-span-3">Status</div>
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