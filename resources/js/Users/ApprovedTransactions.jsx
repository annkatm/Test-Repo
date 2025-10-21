import React, { useMemo, useState } from 'react';

// Props now accept dynamic data instead of hardcoded examples
// - approvedTransactions: [{ date, item, status, exchangeItems?: [...] }]
// - transactionStats: { borrowed: number }
// - borrowedDetails: { items: [{name, specs}], borrowDate, returnDate }
const ApprovedTransactions = ({ onBack, transactionStats, approvedTransactions = [], borrowedDetails = null }) => {
  const logActivity = (message, variant = 'info') => {
    try {
      const prev = JSON.parse(localStorage.getItem('employee_activities') || '[]');
      const entry = { id: Date.now(), message, variant, time: new Date().toISOString() };
      const next = [entry, ...(Array.isArray(prev) ? prev : [])].slice(0, 50);
      localStorage.setItem('employee_activities', JSON.stringify(next));
    } catch (_) {}
  };
  const [selectedRow, setSelectedRow] = useState(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showBrowseLaptopsModal, setShowBrowseLaptopsModal] = useState(false);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [showExchangeConfirmModal, setShowExchangeConfirmModal] = useState(false);
  const [selectedLaptop, setSelectedLaptop] = useState(null);
  const [activeCategory, setActiveCategory] = useState('Laptops');
  const [exchangeReason, setExchangeReason] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [isViewAllOpen, setIsViewAllOpen] = useState(false);
  const [isBorrowedOpen, setIsBorrowedOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); // number-only sorting/display count

  const totalPages = Math.max(1, Math.ceil((approvedTransactions?.length || 0) / pageSize));
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return (approvedTransactions || []).slice(start, end);
  }, [approvedTransactions, page, pageSize]);

  const selectedTransactionData = selectedRow !== null ? approvedTransactions[selectedRow] : null;

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const handleConfirmExchange = () => {
    setShowReasonModal(false);
    setShowExchangeConfirmModal(true);
    setExchangeReason('');
    setUploadedFile(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      {actionLoading && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/30">
          <div className="h-12 w-12 border-4 border-white/60 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      )}
      
      <div className="max-w-7xl mx-auto">
        {/* Header Row - Title and Back Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 -mt-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#2262C6]">Approved</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setIsViewAllOpen(true); logActivity('Approved: Opened View All', 'info'); }}
              className="text-blue-600 hover:text-blue-800 text-sm sm:text-base font-semibold"
            >
              View all
            </button>
            <button
              onClick={() => { logActivity('Approved: Back to transactions', 'info'); onBack(); }}
              className="bg-white text-blue-600 font-medium px-6 py-3 rounded-lg shadow hover:shadow-md hover:bg-blue-50 transition-all border border-gray-200 w-full sm:w-auto"
            >
              ← Back
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - Table */}
          <div className={`${selectedRow !== null ? 'lg:col-span-8' : 'lg:col-span-12'}`}>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Table Header - Hidden on mobile, visible on tablet+ */}
              <div className="hidden sm:grid grid-cols-12 bg-gray-50 text-gray-700 font-semibold text-base py-4 px-4 sm:px-6 border-b border-gray-200">
                <div className="col-span-3">Date</div>
                <div className="col-span-6">Item</div>
                <div className="col-span-3">Status</div>
              </div>

              {/* Scrollable Table Rows Container */}
              <div className="overflow-y-auto h-[400px] sm:h-[500px] lg:h-[600px] bg-white">
                <div className="divide-y divide-gray-100">
                  {(approvedTransactions || []).map((transaction, index) => (
                    <div
                      key={index}
                      onClick={() => { setSelectedRow(index); logActivity(`Approved: Selected row ${index + 1} (${transaction.item})`, 'info'); }}
                      className={`grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-0 items-start sm:items-center py-4 sm:py-6 px-4 sm:px-6 transition-colors cursor-pointer ${
                        selectedRow === index ? 'border-l-4 border-blue-600' : ''
                      }`}
                    >
                      {/* Mobile layout */}
                      <div className="sm:hidden space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Date</p>
                            <p className="text-gray-800 text-base font-semibold">{transaction.date}</p>
                          </div>
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                            {transaction.status}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Item</p>
                          <p className="text-gray-800 text-base font-semibold">{transaction.item}</p>
                        </div>
                      </div>

                      {/* Desktop layout */}
                      <div className="hidden sm:contents">
                        <div className="col-span-3 text-gray-800 text-base font-semibold">
                          {transaction.date}
                        </div>
                        <div className="col-span-6 text-gray-800 text-base font-semibold">
                          {transaction.item}
                        </div>
                        <div className="col-span-3">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                            {transaction.status}
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
              ${selectedRow !== null ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'}
            `}
          >
            {/* Mobile backdrop */}
            <div
              className="lg:hidden absolute inset-0"
              onClick={() => setSelectedRow(null)}
            />

            {/* Panel content */}
            <div className="absolute right-0 top-0 bottom-0 w-full sm:w-96 lg:w-auto lg:relative bg-gray-50 lg:bg-transparent overflow-y-auto p-4 sm:p-6 lg:p-0">
              <div className="flex flex-col space-y-8">
                {/* Exchange Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                  {/* Header with X button */}
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-800">Exchange</h3>
                    <button
                      onClick={() => setSelectedRow(null)}
                      className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Dynamic exchange items based on selected row */}
                  <div className="space-y-4 mb-6">
                    {selectedTransactionData?.exchangeItems.map((item, index) => (
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
                      onClick={() => { setShowReturnModal(true); logActivity('Approved: Clicked Return Now', 'return'); }}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium shadow-md transform transition-all duration-300 hover:scale-105 hover:shadow-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                    >
                      Return Now
                    </button>
                    <button
                      onClick={() => { setShowBrowseLaptopsModal(true); logActivity('Approved: Clicked Exchange', 'exchange'); }}
                      className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium shadow-md transform transition-all duration-300 hover:scale-105 hover:shadow-xl hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
                    >
                      Exchange
                    </button>
                  </div>
                </div>

                {/* Borrowed Stat Card */}
                <button onClick={() => setIsBorrowedOpen(true)} className="rounded-xl bg-white text-gray-900 p-6 h-48 w-full border border-gray-200 text-left hover:shadow-md transition">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-sm font-medium">Item Currently Borrowed</span>
                    <div className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-md">
                      📦
                    </div>
                  </div>
                  <div className="text-5xl font-bold">{transactionStats?.borrowed || 0}</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RETURN NOW MODAL */}
      {showReturnModal && selectedTransactionData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-[420px] p-6 relative transform transition-all duration-500 scale-100 hover:scale-[1.01] hover:rotate-[0.5deg] shadow-blue-900/30 hover:shadow-blue-800/50 perspective-[1200px] motion-safe:animate-pop3D">
            <h2 className="text-lg font-bold text-gray-900 mb-6 text-center drop-shadow-md">
              Return Confirmation
            </h2>

            {/* Dynamic Item List */}
            <div className="space-y-4 mb-6">
              {selectedTransactionData.exchangeItems.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 pb-4 border-b border-gray-100 last:border-0"
                >
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
                    {item.icon}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-500">{item.brand} - {item.details}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowReturnModal(false); logActivity('Approved: Return modal closed', 'info'); }}
                className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 shadow-sm transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (actionLoading) return;
                  setActionLoading(true);
                  setTimeout(() => {
                    setShowReturnModal(false);
                    setSelectedRow(null);
                    logActivity('Approved: Confirmed Return', 'success');
                    onBack();
                    setActionLoading(false);
                  }, 1000);
                }}
                disabled={actionLoading}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg font-medium shadow-md hover:bg-blue-700 hover:shadow-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BROWSE LAPTOPS MODAL */}
      {showBrowseLaptopsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden transform transition-all duration-500 scale-100 hover:scale-[1.01] shadow-blue-900/30 hover:shadow-blue-800/50">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-600/5 to-blue-300/10">
              <h2 className="text-2xl font-bold text-gray-900">Browse Laptops</h2>
              <button
                onClick={() => {
                  setShowBrowseLaptopsModal(false);
                  setSelectedLaptop(null);
                  setActiveCategory('Laptops');
                  logActivity('Approved: Closed Browse Laptops', 'info');
                }}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
                  { brand: 'Asus', available: 9 },
                  { brand: 'Lenovo', available: 7 },
                  { brand: 'Acer', available: 4 },
                  { brand: 'Razor', available: 9 }
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
                  logActivity('Approved: Proceed to Reason for Exchange', 'exchange');
                }}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold shadow-md hover:bg-blue-700 hover:shadow-xl transition-all transform hover:scale-105"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXCHANGE (REASON + EVIDENCE) MODAL */}
      {showReasonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden transform transition-all duration-500 scale-100 rotate-[0.5deg] hover:rotate-0 hover:scale-[1.02] shadow-blue-900/30 hover:shadow-blue-800/50 perspective-[1000px] motion-safe:animate-pop3D">
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
                  logActivity('Approved: Closed Reason modal', 'info');
                }}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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

              {/* Footer */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowReasonModal(false);
                    setExchangeReason('');
                    setUploadedFile(null);
                    logActivity('Approved: Cancel Reason modal', 'info');
                  }}
                  className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 shadow-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { logActivity('Approved: Confirm Reason for Exchange', 'exchange'); handleConfirmExchange(); }}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg font-medium shadow-md hover:bg-blue-700 hover:shadow-xl transition-all"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EXCHANGE REQUEST CONFIRMATION MODAL */}
      {showExchangeConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            {/* Header */}
            <h2 className="text-lg font-bold text-gray-900 mb-4">Exchange Request</h2>

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
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Exchange Summary</h3>
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
                if (actionLoading) return;
                setActionLoading(true);
                setTimeout(() => {
                  setShowExchangeConfirmModal(false);
                  setSelectedRow(null);
                  logActivity('Approved: Sent Exchange Request', 'success');
                  onBack();
                  setActionLoading(false);
                }, 1000);
              }}
              disabled={actionLoading}
              className="w-full bg-blue-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-md"
            >
              Send Request
            </button>
          </div>
        </div>
      )}

      {/* View All (Approved) Modal */}
      {isViewAllOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="relative w-full max-w-6xl max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
              <h2 className="text-xl font-bold text-blue-600">Approved</h2>
              <button
                onClick={() => { setIsViewAllOpen(false); logActivity('Approved: Closed View All', 'info'); }}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
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
                  {paginated.map((row, idx) => (
                    <tr key={idx} className="border-b border-gray-100">
                      <td className="p-3 text-base text-gray-800 font-semibold">{row.date}</td>
                      <td className="p-3 text-base text-gray-800 font-semibold">{row.item}</td>
                      <td className="p-3">
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">{row.status}</span>
                      </td>
                    </tr>
                  ))}
                  {paginated.length === 0 && (
                    <tr>
                      <td colSpan="3" className="p-6 text-center text-gray-500">No records</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
              <div className="flex items-center gap-2">
                <button onClick={() => { const next = Math.max(1, page - 1); if (next !== page) logActivity(`Approved: View All page ${next}`, 'info'); setPage(next); }} className="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-100" disabled={page === 1}>Prev</button>
                <span className="text-sm text-gray-700">Page {page} of {totalPages}</span>
                <button onClick={() => { const next = Math.min(totalPages, page + 1); if (next !== page) logActivity(`Approved: View All page ${next}`, 'info'); setPage(next); }} className="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-100" disabled={page === totalPages}>Next</button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Display</span>
                <select value={pageSize} onChange={(e) => { const n = Number(e.target.value); setPageSize(n); setPage(1); logActivity(`Approved: View All page size ${n}`, 'info'); }} className="border border-gray-300 rounded-md px-2 py-1 text-sm">
                  {[5,10,20,50].map(n => (<option key={n} value={n}>{n}</option>))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Borrowed Details Modal */}
      {isBorrowedOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Borrowed Item Details</h2>
              <button onClick={() => setIsBorrowedOpen(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-500">Borrowed Date</div>
                  <div className="text-gray-900 font-semibold">{borrowedDetails?.borrowDate || '-'}</div>
                </div>
                <div>
                  <div className="text-gray-500">Return Date</div>
                  <div className="text-gray-900 font-semibold">{borrowedDetails?.returnDate || '-'}</div>
                </div>
              </div>
              <div className="border-t pt-4">
                <div className="text-sm text-gray-500 mb-2">Items</div>
                <ul className="space-y-2">
                  {(borrowedDetails?.items || []).map((it, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-md bg-gray-100 flex items-center justify-center">💼</div>
                      <div>
                        <div className="text-gray-900 font-semibold">{it.name}</div>
                        {it.specs && <div className="text-sm text-gray-600">{it.specs}</div>}
                      </div>
                    </li>
                  ))}
                  {(borrowedDetails?.items || []).length === 0 && (
                    <li className="text-gray-500 text-sm">No items</li>
                  )}
                </ul>
              </div>
              <div className="flex justify-end pt-2">
                <button onClick={() => setIsBorrowedOpen(false)} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovedTransactions;
