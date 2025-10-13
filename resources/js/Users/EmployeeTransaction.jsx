import React, { useState, useEffect } from 'react';
import { Laptop, X, RefreshCcw, ClipboardList} from 'lucide-react';

const EmployeeTransaction = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [transactions, setTransactions] = useState([]);
  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [transactionStats, setTransactionStats] = useState({
    borrowed: 0,
    available: 0,
    overdue: 0
  });
  
  // Fetch all transaction data on component mount
  useEffect(() => {
    const fetchTransactionData = async () => {
      try {
        setLoading(true);
        const [requestsRes, statsRes, historyRes, deniedRes] = await Promise.all([
          fetch('/api/requests?status=pending'),
          fetch('/api/transactions/stats'),
          fetch('/api/requests'),
          fetch('/api/requests?status=rejected')
        ]);

        const requestsData = await requestsRes.json();
        const statsData = await statsRes.json();
        const historyData = await historyRes.json();
        const deniedData = await deniedRes.json();

        // Handle pending requests
        if (requestsData.success) {
          const pendingData = requestsData.data || [];
          setPendingTransactions(pendingData.map(req => ({
            ...req,
            equipment_details: `${req.brand || ''} ${req.equipment_name || ''} ${req.model || ''}`.trim(),
            requester_name: req.full_name || `${req.first_name} ${req.last_name}`.trim()
          })));
        }

        // Handle transaction stats
        if (statsData.success) {
          setTransactionStats({
            borrowed: statsData.data.borrowed || 0,
            available: statsData.data.available || 0,
            overdue: statsData.data.overdue || 0
          });
        }

        // Handle history data
        if (historyData.success) {
          const formattedHistory = (historyData.data || []).map(item => ({
            date: new Date(item.created_at).toLocaleDateString(),
            item: `${item.brand || ''} ${item.equipment_name || ''} ${item.model || ''}`.trim(),
            status: item.status,
            returnDate: item.return_date ? new Date(item.return_date).toLocaleDateString() : 'N/A',
            equipment_id: item.equipment_id,
            requester_name: item.full_name || `${item.first_name} ${item.last_name}`.trim(),
            specifications: item.specifications || 'No specifications available',
            category: item.category_name
          }));
          setHistoryData(formattedHistory);
          setTransactions(formattedHistory);
        }

        // Handle denied requests
        if (deniedData.success) {
          const formattedDenied = (deniedData.data || []).map(item => ({
            id: item.id,
            date: new Date(item.created_at).toLocaleDateString(),
            item: `${item.brand || ''} ${item.equipment_name || ''} ${item.model || ''}`.trim(),
            brand: item.brand,
            model: item.model,
            status: 'rejected',
            reason: item.reject_reason || '',
            equipment_id: item.equipment_id,
            requester_name: item.full_name || `${item.first_name} ${item.last_name}`.trim(),
            specifications: item.specifications
          }));
          setDeniedRequests(formattedDenied);
        }

      } catch (err) {
        console.error('Failed to fetch transaction data:', err);
        setError('Failed to load transaction data');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactionData();
  }, []);
  const [showPendings, setShowPendings] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedRow, setSelectedRow] = useState(1);
  const [currentView, setCurrentView] = useState('transactions');
  const [showHistory, setShowHistory] = useState(false);
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Laptops');
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [exchangeReason, setExchangeReason] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);


  const [historyData, setHistoryData] = useState([]);

 // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = historyData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(historyData.length / itemsPerPage);


  // Static data for denied requests and approved transactions
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

  const [approvedTransactions, setApprovedTransactions] = useState([]);

  const [availableEquipment, setAvailableEquipment] = useState([]);
  
  const fetchAvailableEquipment = async () => {
    try {
      const response = await fetch('/api/equipment?status=available');
      const data = await response.json();
      
      if (data.success && Array.isArray(data.data)) {
        const formatted = data.data.map(item => ({
          name: item.brand || item.name,
          availableUnits: 1, // This will be updated when we implement inventory tracking
          image: '💻',
          specifications: item.specifications,
          model: item.model,
          category: item.category_name,
          id: item.id
        }));
        setAvailableEquipment(formatted);
      }
    } catch (error) {
      console.error('Failed to fetch available equipment:', error);
    }
  };

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
        // Transform the data to include all necessary information
        const formattedPending = data.data.map(request => ({
          id: request.id,
          date: new Date(request.created_at).toLocaleDateString(),
          item: `${request.brand || ''} ${request.equipment_name || ''} ${request.model || ''}`.trim(),
          brand: request.brand,
          model: request.model,
          status: request.status,
          reason: request.reason || '',
          equipment_id: request.equipment_id,
          specifications: request.specifications,
          requester_name: request.full_name || `${request.first_name} ${request.last_name}`.trim(),
          category: request.category_name,
          return_date: request.return_date ? new Date(request.return_date).toLocaleDateString() : null
        }));
        setPendingTransactions(formattedPending);
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
    setExchangeReason('');
    setUploadedFile(null);
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

 if (showHistory) {
  return (
    <div className="space-y-6">
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

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-6 pb-4 border-b border-gray-200 font-semibold text-gray-700">
          <div className="col-span-3">Date</div>
          <div className="col-span-3">Item</div>
          <div className="col-span-3">Status</div>
          <div className="col-span-3">Return Date</div>
        </div>

        {/* Table Data */}
        <div className="divide-y divide-gray-100">
          {currentItems.map((item, index) => (
            <div key={index} className="grid grid-cols-12 gap-6 py-4 items-center">
              <div className="col-span-3">
                <span className="text-sm text-gray-900">{item.date}</span>
              </div>
              <div className="col-span-3">
                <span className="text-sm text-gray-900">{item.item}</span>
              </div>
              <div className="col-span-3">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                  {item.status}
                </span>
              </div>
              <div className="col-span-3">
                <span className="text-sm text-gray-900">{item.returnDate}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className="flex justify-end mt-6 space-x-2">
          <button 
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-2 py-1 bg-blue-600 text-white rounded-md text-sm font-medium shadow-sm transform transition-all duration-300 hover:scale-105 hover:shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50"
          >
            Previous
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`px-3 py-1 border rounded ${currentPage === i + 1 ? "bg-blue-500 text-white" : ""}`}
            >
              {i + 1}
            </button>
          ))}
          <button 
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-2 py-1 bg-blue-600 text-white rounded-md text-sm font-medium shadow-sm transform transition-all duration-300 hover:scale-105 hover:shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};


  if (currentView === 'approved') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-blue-600">Approved</h1>
          <button 
            onClick={() => setCurrentView('transactions')}
             className="flex items-center gap-2 bg-white text-blue-600 font-medium px-4 py-2 rounded-lg shadow hover:shadow-md hover:bg-blue-50 transition-all"
        >
          <span className="text-xl"></span>
            ← Back
          </button>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6">
              <div className="bg-gray-200 px-6 py-4 rounded-lg mb-1">
                <div className="grid grid-cols-4 gap-4 font-semibold text-gray-700">
                  <span>Date</span>
                  <span>Item</span>
                  <span>Requester</span>
                  <span>Status</span>
                </div>
              </div>

              <div className="space-y-0">
                {transactions.map((transaction, index) => (
                  <div 
                    key={transaction.id || index}
                    onClick={() => setSelectedRow(index)}
                    className={`px-6 py-4 cursor-pointer transition-colors ${
                      selectedRow === index 
                        ? 'bg-blue-200' 
                        : 'bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="grid grid-cols-4 gap-4 text-gray-700">
                      <span>{new Date(transaction.created_at).toLocaleDateString()}</span>
                      <span>{transaction.equipment_name || transaction.brand}</span>
                      <span>{transaction.full_name || `${transaction.first_name} ${transaction.last_name}`}</span>
                      <span className={`${
                        transaction.status === 'pending' ? 'text-yellow-600' :
                        transaction.status === 'approved' ? 'text-green-600' :
                        transaction.status === 'rejected' ? 'text-red-600' :
                        'text-gray-600'
                      }`}>
                        {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-6">Exchange</h3>
              
              <div className="space-y-4 mb-6">
                {exchangeItems.map((item, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-800">{item.name}</div>
                      <div className="text-xs text-gray-500">{item.brand}</div>
                      <div className="text-xs text-gray-600 mt-1">{item.details}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
               <button
                  onClick={() => setCurrentView('transactions')}
                  className="flex-1 px-4 py-2 bg-red-50 text-red-600 rounded-lg font-medium shadow-md transform transition-all duration-300 hover:scale-105 hover:shadow-xl hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-300"
                >
                  Cancel
                </button>
               <button
                  onClick={() => setShowExchangeModal(true)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium shadow-md transform transition-all duration-300 hover:scale-105 hover:shadow-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  Exchange
                </button>
              </div>
            </div>

           <div className="rounded-xl bg-gradient-to-br from-blue-600 to-blue-500 text-white p-6 h-48 w-full shadow-xl shadow-blue-900/50 transform transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-800/70">
          <div className="flex justify-between items-start mb-4">
        <span className="text-sm font-medium drop-shadow-md">
      Item Currently Borrowed
       </span>

           {/* Icon Box */}
        <div className="w-10 h-10 flex items-center justify-center bg-white bg-opacity-20 rounded-md shadow-inner transform transition-transform duration-300 hover:scale-110">
                📦
        </div>
      </div>

  {/* Stat Value */}
        <div className="text-5xl font-bold drop-shadow-md">
      {transactionStats.borrowed}
    </div>
   </div>
      </div>
  </div>


        {showExchangeModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
    <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b">
        <h2 className="text-2xl font-bold text-gray-800">Browse Laptops</h2>
        <button 
          onClick={() => setShowExchangeModal(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          <X size={24} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Search + View Mode */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1 max-w-2xl">
            <div className="relative">
              <input
                type="text"
                placeholder="Search"
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                🔍
              </div>
            </div>
          </div>
          <div className="flex gap-2 ml-4">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
              Grid View
            </button>
            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200">
              List View
            </button>
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-2 mb-6">
          <button 
            onClick={() => setSelectedCategory('All')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedCategory === 'All' 
                ? 'bg-gray-200 text-gray-900' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button 
            onClick={() => setSelectedCategory('Laptops')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedCategory === 'Laptops' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Laptops
          </button>
          <button 
            onClick={() => setSelectedCategory('Projectors')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedCategory === 'Projectors' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Projectors
          </button>
          <button 
            onClick={() => setSelectedCategory('Accessories')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedCategory === 'Accessories' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Accessories
          </button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-4 gap-6 mb-6">
          {laptopBrands.map((brand, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="aspect-video bg-gray-100 rounded-lg mb-4 flex items-center justify-center text-5xl">
                {brand.image}
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{brand.name}</h3>
              <p className="text-sm text-gray-600 mb-3">
                Available Unit: <span className="font-semibold">{brand.availableUnits}</span>
              </p>
              <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                View All
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex justify-end">
          <button 
            onClick={() => {
              setShowExchangeModal(false);
              setTimeout(() => setShowReasonModal(true), 300);
            }}
              className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm font-medium shadow-sm transform transition-all duration-300 hover:scale-105 hover:shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  </div>
)}


        {showReasonModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
            <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-2xl font-bold text-gray-800">Reason and Evidence</h2>
                <button 
                  onClick={() => {
                    setShowReasonModal(false);
                    setExchangeReason('');
                    setUploadedFile(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                  <div>
                    <label className="block text-base font-semibold text-gray-900 mb-3">
                      Reason for Exchange :
                    </label>
                    <textarea
                      value={exchangeReason}
                      onChange={(e) => setExchangeReason(e.target.value)}
                      placeholder="Enter your reason for exchange..."
                      className="w-full h-40 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-base font-semibold text-gray-900 mb-3">
                      Upload Photo/Video :
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
                        className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-100 hover:bg-gray-200 transition-colors"
                      >
                        {uploadedFile ? (
                          <div className="flex flex-col items-center">
                            <svg className="w-12 h-12 text-green-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <p className="text-sm font-medium text-gray-700">{uploadedFile.name}</p>
                            <p className="text-xs text-gray-500 mt-1">Click to change file</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
                            <svg className="w-16 h-16 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className="text-sm text-gray-500">Click to upload photo or video</p>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      onClick={handleConfirmExchange}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg font-medium shadow-md transform transition-all duration-300 hover:scale-105 hover:shadow-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (showPendings) {
    return (
      <div className="grid grid-cols-12 gap-6 h-full">
        <div className="col-span-8">
          <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-blue-600">Pendings</h1>
            <button 
              onClick={() => setShowPendings(false)}
              className="flex items-center gap-2 bg-white text-blue-600 font-medium px-4 py-2 rounded-lg shadow hover:shadow-md hover:bg-blue-50 transition-all"
        >
          <span className="text-xl"></span>
              ← Back
            </button>
          </div>

          <div className="bg-white rounded-lg border border-gray-200">
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
              {pendingTransactions.length > 0 ? pendingTransactions.map((transaction, index) => (
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
        </div>

        <div className="col-span-4">
  {/* White box first */}
  <div className="bg-white rounded-lg border-2 border-blue-500 p-6 h-96 mb-4"></div>

  {/* Denied Request card second */}
  <div className="bg-blue-600 rounded-lg p-6 text-white">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-medium opacity-90">Denied Request</h3>
      <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
        <div className="w-6 h-6 bg-white bg-opacity-40 rounded-full"></div>
      </div>
    </div>
    <div className="text-4xl font-bold mb-4">3</div>
    <button 
      onClick={() => setIsModalOpen(true)}
      className="w-full text-sm text-white bg-blue-700 px-4 py-2 rounded-md hover:bg-blue-800 transition-colors"
    >
      View All
    </button>
  </div>
</div>


       {isModalOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
    <div className="relative w-full max-w-6xl max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">
      
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
        <h2 className="text-xl md:text-2xl font-bold text-blue-600">Denied Requests</h2>
        <button 
          onClick={() => setIsModalOpen(false)}
          className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
        >
          <X size={24} />
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        
        {/* Table Section */}
        <div className="flex-1 p-4 md:p-6 overflow-y-auto">
          <div className="overflow-x-auto">
            <table className="w-full">
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
                      selectedRequest?.id === request.id ? 'bg-blue-100' : ''
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
        </div>

        {/* Inspect Panel */}
        <div className="w-full md:w-80 lg:w-96 bg-gray-50 p-4 md:p-6 border-t md:border-t-0 md:border-l border-gray-200 overflow-y-auto flex flex-col gap-4">
          <h3 className="font-semibold text-gray-800 text-base md:text-lg">Inspect</h3>
          
          {/* Item Info */}
          {selectedRequest ? (
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 flex items-start gap-3">
              <div className="flex-shrink-0">
                <Laptop size={32} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 text-sm md:text-base truncate">{selectedRequest.item}</p>
                <p className="text-xs md:text-sm text-gray-600 truncate">{selectedRequest.brand}</p>
                <p className="text-xs md:text-sm text-gray-600 truncate">{selectedRequest.model}</p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 text-center">
              <p className="text-gray-500 text-sm">Select a request to inspect</p>
            </div>
          )}

          {/* Denied Reason */}
          <div className="flex-1">
            <h4 className="font-semibold text-gray-800 mb-2 text-sm md:text-base">Denied Reason</h4>
               <textarea
              value={selectedRequest ? selectedRequest.reason : ''}
              onChange={handleReasonChange}
              placeholder="No request selected"
              className="w-full bg-white rounded-lg border border-gray-300 shadow-sm p-3 min-h-[80px] md:min-h-[100px] text-xs md:text-sm text-gray-700 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Appeal Button */}
          <button
            disabled={!selectedRequest}
            className={`w-full py-2.5 md:py-3 rounded-lg transition-all font-medium text-sm md:text-base shadow-sm transform active:scale-95 ${
              selectedRequest
                ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
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
      <div className="bg-white rounded-2xl shadow-xl shadow-gray-400/50 transform transition-transform duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-gray-500/60">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-blue-600 to-blue-400 rounded-t-2xl shadow-inner">
          <h3 className="text-lg font-semibold text-white text-center drop-shadow-md">
            Recent Activities
          </h3>
        </div>

        {/* Activity List */}
        <div className="p-6 space-y-5">
          {/* Borrowed */}
          <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl shadow-md hover:shadow-lg hover:bg-blue-50 transition-all duration-300">
            <div className="p-2 bg-blue-100 rounded-full shadow-inner">
              <Laptop className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Borrowed Laptop, Projector, etc.
              </p>
              <p className="text-xs text-gray-500">2 hours ago</p>
            </div>
          </div>

          {/* Returned */}
          <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl shadow-md hover:shadow-lg hover:bg-green-50 transition-all duration-300">
            <div className="p-2 bg-green-100 rounded-full shadow-inner">
              <RefreshCcw className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Returned Laptop, Projector, etc.
              </p>
              <p className="text-xs text-gray-500">Yesterday</p>
            </div>
          </div>

          {/* Requested */}
          <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl shadow-md hover:shadow-lg hover:bg-yellow-50 transition-all duration-300">
            <div className="p-2 bg-yellow-100 rounded-full shadow-inner">
              <ClipboardList className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Requested Laptop, Projector, etc.
              </p>
              <p className="text-xs text-gray-500">3 days ago</p>
            </div>
          </div>
        </div>
      </div>
    </div>
      </div>
    </div>
  );
};

export default EmployeeTransaction;