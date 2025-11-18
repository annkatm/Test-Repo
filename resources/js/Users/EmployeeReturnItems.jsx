import React, { useState, useMemo, useEffect } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

const ReturnItems = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [sortOption, setSortOption] = useState("date-desc");
  const [searchTerm, setSearchTerm] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedItem, setExpandedItem] = useState(null);

  // Combine returned and approved items
  const historyData = useMemo(() => {
    // Mark approved items with a special status
    const markedApproved = (data || []).map(item => ({
      ...item,
      isApproved: item.status === 'approved',
      status: item.status || 'Approved',
      // Ensure all required fields have proper values
      date: item.date || item.return_date || new Date().toLocaleDateString("en-US", { 
        month: "2-digit", 
        day: "2-digit", 
        year: "numeric" 
      }),
      serialNo: item.serial_number || item.serialNo || item.serial || `SN${Math.random().toString().substr(2, 6)}`,
      category: item.category || item.equipment_category || 'General',
      quantity: item.quantity || 1,
      item: item.item || item.equipment_name || 'Item'
    }));
    
    return markedApproved;
  }, [data]);

  // Helper to normalize records
  const normalize = (r, idx = 0) => {
    const dateRaw = r?.return_date || r?.updated_at || r?.created_at || r?.date || null;
    let dateStr = "";
    try {
      dateStr = dateRaw ? new Date(dateRaw).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }) : "";
    } catch (_) {
      dateStr = String(dateRaw || "");
    }
    
    // Determine status - if returned but not completed, show as pending verification
    let status = r?.status || (r?.return_date ? "Returned" : "Approved");
    if (status === 'returned') {
      status = 'Returned - Pending Verification';
    } else if (status === 'completed') {
      status = 'Returned - Verified';
    }
    
    return {
      id: r?.id ?? r?.transaction_id ?? r?.request_id ?? r?.trx_id ?? r?.uuid ?? (idx + 1),
      transaction_id: r?.transaction_id || r?.id,
      date: dateStr,
      item: r?.equipment_name || r?.item || r?.title || r?.name || "Item",
      status: status,
      category: r?.category || r?.equipment_category || r?.equipment?.category_name || "General",
      quantity: r?.quantity || 1,
      serial_number: r?.serial_number || r?.serial_no || r?.serial || r?.equipment?.serial_number || `SN${String(idx + 1).padStart(6, '0')}`,
      serialNo: r?.serial_number || r?.serial_no || r?.serial || r?.equipment?.serial_number || `SN${String(idx + 1).padStart(6, '0')}`,
      equipment: r?.equipment || null,
      is_approved: r?.status === 'approved' || r?.is_approved || false,
      return_condition: r?.return_condition || null,
      return_notes: r?.return_notes || null,
      originalData: r
    };
  };

  // Fetch all pages from a Laravel-style paginated endpoint
  const fetchAllPages = async (url) => {
    const out = [];
    let nextUrl = url;
    for (let i = 0; i < 20 && nextUrl; i++) { // hard limit to avoid infinite loops
      const res = await fetch(nextUrl, { credentials: 'same-origin' });
      const json = await res.json().catch(() => ({}));
      const list = Array.isArray(json)
        ? json
        : (Array.isArray(json?.data?.data) ? json.data.data : (Array.isArray(json?.data) ? json.data : []));
      out.push(...(list || []));
      nextUrl = json?.links?.next || json?.next_page_url || null;
    }
    return out;
  };

  const loadAllReturns = async () => {
    setLoading(true);
    setError("");
    try {
      // Fetch approved transactions (items that can be returned)
      const approvedItems = await fetchAllPages('/api/transactions/approved');
      
      // Fetch returned items (both pending verification and completed)
      let returnedItems = await fetchAllPages('/api/transactions/history?status=returned');
      
      // Also fetch completed transactions to show verified returns
      const completedItems = await fetchAllPages('/api/transactions/history?status=completed');
      
      // If no returned items found, try to get them from other endpoints
      if (!Array.isArray(returnedItems) || returnedItems.length === 0) {
        const allHistory = await fetchAllPages('/api/transactions/history');
        returnedItems = (allHistory || []).filter(r => String(r?.status || '').toLowerCase() === 'returned' || !!r?.return_date);
      }
      
      // If still no returned items, try the general transactions endpoint
      if (!Array.isArray(returnedItems) || returnedItems.length === 0) {
        const allTransactions = await fetchAllPages('/api/transactions');
        returnedItems = (allTransactions || []).filter(r => String(r?.status || '').toLowerCase() === 'returned' || !!r?.return_date);
      }
      
      // Combine and normalize all items
      const allItems = [
        ...(approvedItems || []).map(item => ({ ...item, status: 'approved' })),
        ...(returnedItems || []).map(item => ({ ...item, status: 'returned' })),
        ...(completedItems || []).filter(item => item.return_date).map(item => ({ ...item, status: 'completed' }))
      ];
      
      const mapped = (allItems || []).map((r, idx) => normalize(r, idx));
      setData(mapped);
    } catch (e) {
      console.error('Error loading returns:', e);
      setError("Failed to load items");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Flush any queued returned items persisted by other views
    try {
      const raw = localStorage.getItem('employee_return_items_queue');
      const queued = raw ? JSON.parse(raw) : [];
      if (Array.isArray(queued) && queued.length > 0) {
        const normalized = queued.map((d, idx) => ({
          id: d.id || Date.now() + idx,
          date: d.date || new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }),
          item: d.item || d.equipment_name || "Item",
          status: d.status || "Returned",
          category: d.category || "General",
          quantity: d.quantity || 1,
          serialNo: d.serial_number || d.serial_no || d.serial || `SN${String(idx + 1).padStart(6, '0')}`,
        }));
        setData((prev) => {
          const existing = new Set((prev || []).map(x => String(x.id)));
          const merged = [
            ...normalized.filter(x => !existing.has(String(x.id))),
            ...(prev || [])
          ];
          return merged;
        });
        // Clear the queue after consuming
        localStorage.removeItem('employee_return_items_queue');
      }
    } catch (_) { }

    let cancelled = false;
    loadAllReturns();
    return () => { cancelled = true; };
  }, []);

  // React to in-app navigation-triggered returns: add returned item instantly
  useEffect(() => {
    const onReturnedAdd = (e) => {
      const d = e?.detail || {};
      console.log('[EmployeeReturnItems] Received ireply:returned:add event:', d);
      
      // Extract equipment details if available
      const equipment = d.equipment || {};
      const serialNumber = d.serial_number || d.serial_no || d.serial || equipment.serial_number || '';
      const category = d.category || equipment.category_name || equipment.category?.name || 'General';
      const itemName = d.item || d.equipment_name || equipment.name || 'Item';
      
      const entry = {
        id: d.id || `returned_${Date.now()}`,
        date: d.date ? new Date(d.date).toLocaleDateString("en-US", { 
          month: "2-digit", 
          day: "2-digit", 
          year: "numeric",
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }) : new Date().toLocaleDateString("en-US", { 
          month: "2-digit", 
          day: "2-digit", 
          year: "numeric" 
        }),
        item: itemName,
        status: d.status || "Returned",
        category: category,
        quantity: d.quantity || 1,
        serialNo: serialNumber,
        // Include all original data for reference
        originalData: d
      };
      console.log('[EmployeeReturnItems] Adding entry:', entry);
      setData((prev) => {
        const exists = (prev || []).some(item => String(item.id) === String(entry.id));
        if (exists) {
          console.log('[EmployeeReturnItems] Item already exists, skipping');
          return prev;
        }
        const updated = [entry, ...(prev || [])];
        console.log('[EmployeeReturnItems] Updated data:', updated);
        return updated;
      });
    };
    window.addEventListener('ireply:returned:add', onReturnedAdd);
    // Also refresh when other parts of the app indicate changes
    const onApprovedChanged = () => loadAllReturns();
    const onEquipmentRestore = () => loadAllReturns();
    window.addEventListener('ireply:approved:changed', onApprovedChanged);
    window.addEventListener('ireply:equipment:restore', onEquipmentRestore);
    console.log('[EmployeeReturnItems] Event listener registered for ireply:returned:add');
    return () => {
      window.removeEventListener('ireply:returned:add', onReturnedAdd);
      window.removeEventListener('ireply:approved:changed', onApprovedChanged);
      window.removeEventListener('ireply:equipment:restore', onEquipmentRestore);
      console.log('[EmployeeReturnItems] Event listener removed');
    };
  }, []);

  // 🔍 Filter by search term
  const filteredData = useMemo(() => {
    return (historyData || []).filter((item) =>
      String(item?.item || "").toLowerCase().includes(searchTerm.toLowerCase())
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

  const [selectedItem, setSelectedItem] = useState(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [returnRemarks, setReturnRemarks] = useState("");
  const [itemCondition, setItemCondition] = useState("Good Condition");
  
  // Exchange states
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [showBrowseModal, setShowBrowseModal] = useState(false);
  const [showUnitsModal, setShowUnitsModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [exchangeReason, setExchangeReason] = useState("");
  const [exchangeEvidence, setExchangeEvidence] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [searchEquipment, setSearchEquipment] = useState("");

  const handleReturnItem = (item) => {
    console.log('Return item:', item);
    setSelectedItem(item);
    setReturnRemarks("");
    setItemCondition("Good Condition");
    setShowReturnModal(true);
  };

  const handleConfirmReturn = async () => {
    if (!selectedItem) return;
    setActionLoading(true);
    
    try {
      // Map condition to API format
      const conditionMap = {
        'Good Condition': 'good_condition',
        'Damaged': 'damaged',
        'Has Defect': 'has_defect'
      };
      const returnCondition = conditionMap[itemCondition] || 'good_condition';
      
      // Get transaction ID from the item
      const transactionId = selectedItem.id || selectedItem.transaction_id || selectedItem.originalData?.id;
      
      if (!transactionId) {
        throw new Error('Transaction ID not found');
      }
      
      // Get CSRF token
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
      
      // Call the return API
      const response = await fetch(`/api/transactions/${transactionId}/return`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': csrfToken || ''
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          return_condition: returnCondition,
          return_notes: returnRemarks || null
        })
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to return item');
      }
      
      // Dispatch event to update the UI
      window.dispatchEvent(new CustomEvent('ireply:returned:add', {
        detail: {
          id: transactionId,
          date: new Date().toISOString(),
          item: selectedItem.item,
          equipment_name: selectedItem.item,
          serial_number: selectedItem.serialNo,
          category: selectedItem.category,
          quantity: selectedItem.quantity,
          status: 'Returned - Pending Verification',
          remarks: returnRemarks,
          condition: itemCondition,
          transaction_id: transactionId
        }
      }));
      
      // Refresh the list to show updated status
      await loadAllReturns();
      
      // Close modal and reset state
      setShowReturnModal(false);
      setSelectedItem(null);
      setReturnRemarks("");
      setItemCondition("Good Condition");
      
      // Show success message
      alert('Item returned successfully! It is now pending admin verification.');
    } catch (error) {
      console.error('Error returning item:', error);
      alert(error.message || 'Failed to return item. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExchange = (item) => {
    console.log('Exchange item:', item);
    setSelectedItem(item);
    setExchangeReason("");
    setExchangeEvidence(null);
    setShowExchangeModal(true);
  };

  const handleContinueToBrowse = () => {
    if (!exchangeReason.trim()) {
      alert('Please provide a reason for exchange');
      return;
    }
    setShowExchangeModal(false);
    setShowBrowseModal(true);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }
      setExchangeEvidence(file);
    }
  };

  const handleBrandSelect = (brand) => {
    setSelectedBrand(brand);
    setShowBrowseModal(false);
    setShowUnitsModal(true);
  };

  const handleUnitSelect = (unit) => {
    setSelectedUnit(unit);
    setShowUnitsModal(false);
    setShowReviewModal(true);
  };

  const handleConfirmExchange = async () => {
    setActionLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      alert('Exchange request submitted successfully!');
      
      // Reset all states
      setShowReviewModal(false);
      setSelectedItem(null);
      setSelectedBrand(null);
      setSelectedUnit(null);
      setExchangeReason("");
      setExchangeEvidence(null);
    } catch (error) {
      console.error('Error submitting exchange:', error);
      alert('Failed to submit exchange request. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // Mock data for equipment browsing
  const equipmentCategories = [
    { id: "all", name: "All" },
    { id: "laptops", name: "Laptops" },
    { id: "projectors", name: "Projectors" },
    { id: "accessories", name: "Accessories" }
  ];

  const equipmentBrands = {
    all: [
      { id: 1, name: "Asus", icon: "💻", available: 9, category: "laptops" },
      { id: 2, name: "Lenovo", icon: "💻", available: 7, category: "laptops" },
      { id: 3, name: "Acer", icon: "💻", available: 4, category: "laptops" },
      { id: 4, name: "Razor", icon: "💻", available: 9, category: "laptops" },
      { id: 5, name: "Epson", icon: "📽️", available: 5, category: "projectors" },
      { id: 6, name: "BenQ", icon: "📽️", available: 3, category: "projectors" },
      { id: 7, name: "Sony", icon: "📽️", available: 4, category: "projectors" },
      { id: 8, name: "ViewSonic", icon: "📽️", available: 2, category: "projectors" },
      { id: 9, name: "Headsets", icon: "🎧", available: 12, category: "accessories" },
      { id: 10, name: "Mice", icon: "🖱️", available: 20, category: "accessories" },
      { id: 11, name: "Keyboards", icon: "⌨️", available: 15, category: "accessories" },
      { id: 12, name: "HDMI Cables", icon: "🔌", available: 30, category: "accessories" }
    ],
    laptops: [
      { id: 1, name: "Asus", icon: "💻", available: 9, category: "laptops" },
      { id: 2, name: "Lenovo", icon: "💻", available: 7, category: "laptops" },
      { id: 3, name: "Acer", icon: "💻", available: 4, category: "laptops" },
      { id: 4, name: "Razor", icon: "💻", available: 9, category: "laptops" }
    ],
    projectors: [
      { id: 5, name: "Epson", icon: "📽️", available: 5, category: "projectors" },
      { id: 6, name: "BenQ", icon: "📽️", available: 3, category: "projectors" },
      { id: 7, name: "Sony", icon: "📽️", available: 4, category: "projectors" },
      { id: 8, name: "ViewSonic", icon: "📽️", available: 2, category: "projectors" }
    ],
    accessories: [
      { id: 9, name: "Headsets", icon: "🎧", available: 12, category: "accessories" },
      { id: 10, name: "Mice", icon: "🖱️", available: 20, category: "accessories" },
      { id: 11, name: "Keyboards", icon: "⌨️", available: 15, category: "accessories" },
      { id: 12, name: "HDMI Cables", icon: "🔌", available: 30, category: "accessories" }
    ]
  };

  const mockUnits = [
    // Laptops
    { id: 1, name: "Asus VivoBook 15", specs: "Core i5, 16GB RAM, 512GB SSD", brand: "Asus", category: "laptops", available: true },
    { id: 2, name: "HP Envy 13", specs: "Core i7, 16GB RAM, 1TB SSD", brand: "HP", category: "laptops", available: true },
    { id: 3, name: "Dell XPS 13", specs: "Core i7, 16GB RAM, 1TB SSD", brand: "Dell", category: "laptops", available: true },
    
    // Projectors
    { id: 4, name: "Epson EB-1781W", specs: "WXGA, 3000 lumens", brand: "Epson", category: "projectors", available: true },
    { id: 5, name: "BenQ MH535FHD", specs: "Full HD, 3600 lumens", brand: "BenQ", category: "projectors", available: true },
    
    // Headsets
    { id: 6, name: "Jabra Evolve 40", specs: "Over-ear, Noise-canceling", brand: "Jabra", category: "accessories", available: true },
    { id: 7, name: "Logitech H800", specs: "Wireless, USB", brand: "Logitech", category: "accessories", available: true },
    
    // Mice
    { id: 8, name: "Logitech MX Master 3", specs: "Wireless, Ergonomic", brand: "Logitech", category: "accessories", available: true },
    { id: 9, name: "Razer DeathAdder", specs: "Gaming Mouse, 16000 DPI", brand: "Razer", category: "accessories", available: true },
    
    // Keyboards
    { id: 10, name: "Logitech K380", specs: "Wireless, Multi-device", brand: "Logitech", category: "accessories", available: true },
    { id: 11, name: "Corsair K95 RGB", specs: "Mechanical, RGB", brand: "Corsair", category: "accessories", available: true },
    
    // Cables
    { id: 12, name: "HDMI 2.1 Cable", specs: "8K, 48Gbps", brand: "Amazon Basics", category: "accessories", available: true },
    { id: 13, name: "USB-C to HDMI", specs: "4K, 60Hz", brand: "Anker", category: "accessories", available: true }
  ];

  const getFilteredBrands = () => {
    const categoryKey = selectedCategory === "All" ? "all" : selectedCategory.toLowerCase();
    const brands = equipmentBrands[categoryKey] || [];
    
    if (!searchEquipment.trim()) {
      return brands;
    }
    
    return brands.filter(brand => 
      brand.name.toLowerCase().includes(searchEquipment.toLowerCase())
    );
  };

  return (
    <div className="space-y-6">
      {/* Exchange Request Modal */}
      {showExchangeModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Exchange Request</h2>
              <button
                onClick={() => setShowExchangeModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              {/* Reason for Exchange */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Exchange <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={exchangeReason}
                  onChange={(e) => setExchangeReason(e.target.value)}
                  placeholder="Please explain why you need to exchange this item..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                />
              </div>

              {/* Upload Evidence */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Evidence (Image/Video) <span className="text-red-500">*</span>
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <input
                    type="file"
                    id="evidence-upload"
                    accept="image/*,video/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <label htmlFor="evidence-upload" className="cursor-pointer">
                    <div className="mx-auto w-16 h-16 mb-3 text-gray-400">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-blue-600 font-medium mb-1">Upload a file</p>
                    <p className="text-sm text-gray-500">or drag and drop</p>
                    <p className="text-xs text-gray-400 mt-2">PNG, JPG, GIF, MP4 up to 10MB</p>
                  </label>
                  {exchangeEvidence && (
                    <div className="mt-3 text-sm text-green-600">
                      ✓ {exchangeEvidence.name}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 pb-6">
              <button
                onClick={() => setShowExchangeModal(false)}
                className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleContinueToBrowse}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
              >
                Continue to Browse Laptops
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Browse Equipment Modal */}
      {showBrowseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Browse Laptops</h2>
              <button
                onClick={() => setShowBrowseModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-auto">
              {/* Search Bar */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Search"
                    value={searchEquipment}
                    onChange={(e) => setSearchEquipment(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Category Tabs */}
              <div className="flex gap-2 mb-6">
                {equipmentCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.name)}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                      selectedCategory === cat.name
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Equipment Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {getFilteredBrands().length > 0 ? (
                  getFilteredBrands().map((brand) => (
                    <div
                      key={brand.id}
                      className="border border-gray-200 rounded-lg p-6 text-center hover:shadow-md transition-shadow"
                    >
                      <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-lg flex items-center justify-center text-4xl">
                        {brand.icon}
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">{brand.name}</h3>
                      <p className="text-sm text-gray-500 mb-1">Available Unit:</p>
                      <p className="text-2xl font-bold text-blue-600 mb-4">{brand.available}</p>
                      <button
                        onClick={() => handleBrandSelect(brand)}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
                      >
                        View All
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="col-span-4 text-center py-12">
                    <p className="text-gray-500">No equipment found</p>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t p-6 flex items-center justify-between">
              <p className="text-sm text-gray-500">Select a unit to proceed</p>
              <button
                className="px-5 py-2 bg-gray-300 text-gray-500 rounded-lg font-medium text-sm cursor-not-allowed"
                disabled
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Units Selection Modal */}
      {showUnitsModal && selectedBrand && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[95vh] flex flex-col">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b">
              <h2 className="text-lg sm:text-xl font-semibold text-blue-600">{selectedBrand.name} Units</h2>
              <button
                onClick={() => {
                  setShowUnitsModal(false);
                  setShowBrowseModal(true);
                }}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-2 sm:p-4 flex-1 overflow-auto">
              {/* Category Tabs */}
              <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                {['All', 'Laptops', 'Projectors', 'Accessories'].map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-3 py-1.5 text-sm rounded-lg font-medium whitespace-nowrap ${
                      selectedCategory === category
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                {mockUnits
                  .filter(unit => unit.brand === selectedBrand.name)
                  .filter(unit => {
                    if (selectedCategory === 'All') return true;
                    if (selectedCategory === 'Accessories') return unit.category === 'accessories';
                    return unit.category === selectedCategory.toLowerCase();
                  })
                  .map((unit) => (
                  <div
                    key={unit.id}
                    onClick={() => handleUnitSelect(unit)}
                    className="border border-gray-200 rounded-lg p-2 sm:p-3 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-50 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm sm:text-base font-medium text-gray-900 truncate">{unit.name}</h3>
                        <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">{unit.specs}</p>
                        <span className="inline-block mt-1 px-1.5 py-0.5 bg-green-50 text-green-700 text-[10px] sm:text-xs rounded-full font-medium">
                          Available
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t p-3 sm:p-4 flex items-center justify-end">
              <button
                onClick={() => setShowUnitsModal(false)}
                className="px-3 sm:px-5 py-1.5 sm:py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-xs sm:text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Exchange Modal */}
      {showReviewModal && selectedUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl">
            <div className="bg-blue-600 text-white p-6 rounded-t-xl">
              <h2 className="text-xl font-semibold text-center">Please review your exchange details</h2>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Current Item */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">CURRENT ITEM</h3>
                <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
                  <div className="w-12 h-12 bg-blue-200 rounded flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{selectedItem?.item || 'Selected Item'}</h4>
                    {selectedItem?.category && selectedItem.category !== 'General' && (
                      <p className="text-sm text-gray-600 capitalize">{selectedItem.category}</p>
                    )}
                    {selectedItem?.serialNo && (
                      <p className="text-xs text-gray-500">Serial: {selectedItem.serialNo}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
              </div>

              {/* New Item */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">NEW ITEM</h3>
                <div className="flex items-center gap-4 p-4 bg-green-50 rounded-lg">
                  <div className="w-12 h-12 bg-green-200 rounded flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{selectedUnit.name}</h4>
                    <p className="text-sm text-gray-600">{selectedBrand.name}</p>
                    <p className="text-sm text-gray-600">{selectedUnit.specs}</p>
                  </div>
                </div>
              </div>

              {/* Reason */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">REASON FOR EXCHANGE</h3>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">{exchangeReason}</p>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Exchange Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Exchange Date</span>
                    <span className="text-gray-900 font-medium">
                      {new Date().toLocaleString('en-US', { 
                        month: 'long', 
                        day: 'numeric', 
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Requested By</span>
                    <span className="text-gray-900 font-medium">Current User</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-4">
                  By confirming, you agree to return your current device in good condition.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 pb-6">
              <button
                onClick={() => setShowReviewModal(false)}
                className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors text-sm"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmExchange}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm flex items-center gap-2"
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : 'Confirm Exchange'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Confirmation Modal */}
      {showReturnModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">
                Return Confirmation
              </h2>
              
              <div className="space-y-5">
                {/* Remarks Textarea */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Borrowed Remarks (for next borrower)
                  </label>
                  <textarea
                    value={returnRemarks}
                    onChange={(e) => setReturnRemarks(e.target.value)}
                    placeholder="Leave any notes or remarks for the next borrower..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                  />
                </div>

                {/* Item Condition Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Item Condition
                  </label>
                  <select 
                    value={itemCondition}
                    onChange={(e) => setItemCondition(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option>Good Condition</option>
                    <option>Damaged</option>
                    <option>Has Defect</option>
                  </select>
                </div>

                {/* Equipment Details */}
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 rounded bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 text-sm truncate">
                      {selectedItem.item}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      Equipment - {selectedItem.category}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 px-6 pb-6">
              <button
                onClick={() => setShowReturnModal(false)}
                className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors text-sm"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReturn}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm flex items-center gap-2"
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Confirming...
                  </>
                ) : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-blue-600">Return Items</h1>
        <button
          onClick={loadAllReturns}
          className="px-3 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 border border-blue-600"
        >
          Refresh
        </button>
      </div>

      {/* 🔍 Search Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="relative w-full sm:w-1/2 md:w-1/3">
          <Search className="absolute left-3 top-3 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by name"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
          />
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Sort by:</label>
          <select
            value={sortOption}
            onChange={(e) => {
              setSortOption(e.target.value);
              setCurrentPage(1);
            }}
            className="border border-gray-300 rounded-md text-sm px-2 py-1 focus:ring-2 focus:ring-blue-400 focus:outline-none"
          >
            <option value="date-desc">Date (Newest)</option>
            <option value="date-asc">Date (Oldest)</option>
            <option value="item-asc">Item (A–Z)</option>
            <option value="item-desc">Item (Z–A)</option>
          </select>
        </div>
      </div>

      {/* Items List */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
        {/* Header Row */}
        <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b border-gray-200 font-semibold text-gray-600 text-sm">
          <div className="col-span-3">Date</div>
          <div className="col-span-3">Serial No.</div>
          <div className="col-span-3">Category</div>
          <div className="col-span-3 text-right">Actions</div>
        </div>

        {loading ? (
          <p className="text-center py-8 text-gray-500">Loading...</p>
        ) : error ? (
          <p className="text-center py-8 text-red-500">{error}</p>
        ) : currentItems.length > 0 ? (
          currentItems.map((item, index) => (
            <div key={index} className="border-b border-gray-200 last:border-b-0">
              {/* Main Row */}
              <div
                className="grid grid-cols-12 gap-4 p-4 hover:bg-gray-50 cursor-pointer items-center"
                onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
              >
                {/* Date */}
                <div className="col-span-3 text-gray-700">
                  {item.date}
                </div>

                {/* Serial No */}
                <div className="col-span-3 text-gray-700 font-medium">
                  {item.serialNo}
                </div>

                {/* Category */}
                <div className="col-span-3 text-gray-700">
                  {item.category}
                </div>

                {/* Options */}
                <div className="col-span-3 flex justify-end space-x-2">
                  {/* Only show Return button if item is approved (not yet returned) */}
                  {item.status === 'Approved' || item.status === 'approved' ? (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReturnItem(item);
                        }}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Return
                      </button>
                    </>
                  ) : (
                    <span className="text-sm text-gray-500 italic">
                      {item.status.includes('Pending') ? 'Awaiting Admin Verification' : 'Return Completed'}
                    </span>
                  )}
                </div>
              </div>

              {/* Expanded Details */}
              {expandedItem === item.id && (
                <div className="bg-gray-50 px-4 pb-4 border-t border-gray-200">
                  {/* Details Header */}
                  <div className="grid grid-cols-5 gap-4 py-3 text-sm font-semibold text-gray-600 border-b border-gray-300">
                    <div>Item Name</div>
                    <div>Serial No.</div>
                    <div>Category</div>
                    <div>Status</div>
                    <div>Date Returned</div>
                  </div>

                  {/* Details Row */}
                  <div className="grid grid-cols-5 gap-4 pt-3 items-center">
                    <div className="text-sm text-gray-700">{item.item}</div>
                    <div className="text-sm text-gray-700 font-medium">{item.serialNo}</div>
                    <div className="text-sm text-gray-700">{item.category}</div>
                    <div>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                        item.status.includes('Pending') 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : item.status.includes('Verified') 
                          ? 'bg-green-100 text-green-800'
                          : item.status === 'Approved' || item.status === 'approved'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-700">{item.date}</div>
                  </div>
                  
                  {/* Show return condition and notes if item was returned */}
                  {(item.return_condition || item.return_notes) && (
                    <div className="mt-4 pt-4 border-t border-gray-300">
                      <div className="grid grid-cols-2 gap-4">
                        {item.return_condition && (
                          <div>
                            <div className="text-xs font-semibold text-gray-500 mb-1">Return Condition</div>
                            <div className="text-sm text-gray-700 capitalize">
                              {item.return_condition.replace('_', ' ')}
                            </div>
                          </div>
                        )}
                        {item.return_notes && (
                          <div>
                            <div className="text-xs font-semibold text-gray-500 mb-1">Return Notes</div>
                            <div className="text-sm text-gray-700">{item.return_notes}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        ) : (
          <p className="text-center py-8 text-gray-500">No items found.</p>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-6 flex-wrap gap-3">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-700">Total: {sortedData.length} item{sortedData.length !== 1 ? 's' : ''}</span>
          {/* Previous Button */}
          <button
            onClick={() => handleChangePage(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} />
          </button>

          {/* Page Numbers with Ellipsis */}
          {(() => {
            const pages = [];
            const maxVisible = 3;

            if (totalPages <= maxVisible + 2) {
              for (let i = 1; i <= totalPages; i++) pages.push(i);
            } else {
              if (currentPage <= maxVisible) {
                for (let i = 1; i <= maxVisible; i++) pages.push(i);
                pages.push("...");
                pages.push(totalPages);
              } else if (currentPage >= totalPages - maxVisible + 1) {
                pages.push(1);
                pages.push("...");
                for (let i = totalPages - maxVisible + 1; i <= totalPages; i++)
                  pages.push(i);
              } else {
                pages.push(1);
                pages.push("...");
                pages.push(currentPage - 1);
                pages.push(currentPage);
                pages.push(currentPage + 1);
                pages.push("...");
                pages.push(totalPages);
              }
            }

            return pages.map((p, index) =>
              p === "..." ? (
                <span key={index} className="px-2 text-gray-500">
                  ...
                </span>
              ) : (
                <button
                  key={index}
                  onClick={() => handleChangePage(p)}
                  className={`px-3 py-1 border rounded-md text-sm font-medium transition-colors ${
                    currentPage === p
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-blue-100"
                  }`}
                >
                  {p}
                </button>
              )
            );
          })()}

          {/* Next Button */}
          <button
            onClick={() => handleChangePage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Items per page */}
        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-700">Items per page:</label>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              const v = e.target.value === 'all' ? (sortedData.length || 1) : Number(e.target.value);
              setItemsPerPage(v);
              setCurrentPage(1);
            }}
            className="border border-gray-300 rounded-md text-sm px-2 py-1 focus:ring-2 focus:ring-blue-400 focus:outline-none"
          >
            <option value="all">All</option>
            {[5, 10, 15, 20, 30, 40, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

export default ReturnItems;