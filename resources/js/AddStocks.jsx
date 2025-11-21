import React, { useState, useEffect, useRef } from 'react';
import HomeSidebar from './HomeSidebar';
import { Copy, Plus, Minus, X, ChevronRight, ArrowLeft, Grid3X3, Search, ChevronDown } from 'lucide-react';
import GlobalHeader from './components/GlobalHeader';

// Add custom scrollbar styles and animations
const scrollbarStyles = `
  .select-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: #3B82F6 #F3F4F6;
  }
  .select-scrollbar::-webkit-scrollbar {
    width: 8px;
  }
  .select-scrollbar::-webkit-scrollbar-track {
    background: #F3F4F6;
    border-radius: 4px;
  }
  .select-scrollbar::-webkit-scrollbar-thumb {
    background: #3B82F6;
    border-radius: 4px;
  }
  .select-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #2563EB;
  }

  .hide-scrollbar {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .hide-scrollbar::-webkit-scrollbar {
    display: none;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes scaleIn {
    from {
      opacity: 0;
      transform: scale(0.9) translateY(-10px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  @keyframes glowPulse {
    0%, 100% {
      opacity: 0.6;
      transform: translateY(0px);
    }
    50% {
      opacity: 1;
      transform: translateY(4px);
    }
  }

  @keyframes fadeChevron {
    0% {
      opacity: 0.3;
    }
    50% {
      opacity: 0.5;
    }
    100% {
      opacity: 0.3;
    }
  }

  .animate-fadeIn {
    animation: fadeIn 0.3s ease-out;
  }

  .animate-scaleIn {
    animation: scaleIn 0.4s ease-out;
  }

  .scroll-indicator {
    animation: glowPulse 2s ease-in-out infinite;
  }

  .chevron-fade-1 {
    animation: fadeChevron 2s ease-in-out infinite;
    animation-delay: 0s;
  }

  .chevron-fade-2 {
    animation: fadeChevron 2s ease-in-out infinite;
    animation-delay: 0.3s;
  }

  .chevron-glow {
    filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.8)) drop-shadow(0 0 16px rgba(59, 130, 246, 0.6));
    animation: glowPulse 2s ease-in-out infinite;
    animation-delay: 0.6s;
  }
`;

const style = document.createElement('style');
style.textContent = scrollbarStyles;
document.head.appendChild(style);

const rows = [
  { id: 1, item: 'Lenovo', serial: '353454', date: 'Sept 05 2025', status: 'Available', price: '₱0.00' },
  { id: 2, item: 'Mouse', serial: '4543543', date: 'Sept 5 2025', status: 'Available', price: '₱0.00' },
  { id: 3, item: 'Acer', serial: '345435', date: 'Sept 5 2025', status: 'Available', price: '₱0.00' },
  { id: 4, item: 'Keyboard', serial: '6456546', date: 'Sept 5 2025', status: 'Available', price: '₱0.00' },
  { id: 5, item: 'Monitor', serial: '545644', date: 'Sept 5 2025', status: 'Available', price: '₱0.00' },
  { id: 6, item: 'Mouse', serial: '5646436', date: 'Sept 5 2025', status: 'Available', price: '₱0.00' },
];

const AddStocks = () => {
  const [isAddStocksOpen, setIsAddStocksOpen] = useState(false);
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [categoryStats, setCategoryStats] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(1000); // Show all items by default
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [formData, setFormData] = useState({
    category: '',
    brand: '',
    supplier: '',
    description: '',
    price: '',
    item_image: null,
    receipt_image: null
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addedBatchesByProduct, setAddedBatchesByProduct] = useState({}); // key: productKey -> [{ count, at }]
  const [expandedRows, setExpandedRows] = useState({}); // { '<productKey>-<timestamp>': true }
  const toggleExpanded = (rowId) => setExpandedRows(prev => ({ ...prev, [rowId]: !prev[rowId] }));
  const [receiptPreview, setReceiptPreview] = useState(null); // { src, alt } for receipt lightbox
  const [dropdownScrollIndicators, setDropdownScrollIndicators] = useState({}); // Track scroll indicators for each dropdown
  const dropdownRefs = useRef({}); // Refs for each dropdown container

  // Check if dropdown is scrollable
  const checkDropdownScrollable = (rowId) => {
    const container = dropdownRefs.current[rowId];
    if (container) {
      const { scrollHeight, clientHeight, scrollTop } = container;
      const isScrollable = scrollHeight > clientHeight;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 5;
      const shouldShow = isScrollable && !isAtBottom;
      setDropdownScrollIndicators(prev => ({ ...prev, [rowId]: shouldShow }));
    }
  };

  // Handle dropdown scroll
  const handleDropdownScroll = (rowId) => {
    const container = dropdownRefs.current[rowId];
    if (container) {
      const { scrollHeight, clientHeight, scrollTop } = container;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 5;
      setDropdownScrollIndicators(prev => ({ ...prev, [rowId]: !isAtBottom }));
    }
  };

  // Check scrollable when row is expanded
  useEffect(() => {
    Object.keys(expandedRows).forEach(rowId => {
      if (expandedRows[rowId]) {
        setTimeout(() => checkDropdownScrollable(rowId), 100);
      }
    });
  }, [expandedRows]);

  // Fetch categories first, then equipment
  useEffect(() => {
    const loadData = async () => {
      const categoriesData = await fetchCategories();
      // Fetch equipment after categories are loaded, passing categories
      if (categoriesData && categoriesData.length > 0) {
        fetchEquipment(categoriesData);
      } else {
        fetchEquipment();
      }
    };
    loadData();

    // Listen for equipment updates from other pages (e.g., EmployeePage, Equipment)
    const handleEquipmentUpdate = () => {
      fetchEquipment(); // Refresh equipment list when changes occur (will use categories from state)
    };

    // Listen for equipment restore from ViewRequest (when equipment is returned)
    const handleEquipmentRestore = () => {
      fetchEquipment(); // Refresh equipment list when equipment is returned (will use categories from state)
    };

    // Listen for stock added event to show toast notification
    const handleStockAdded = (event) => {
      const { count, product, brand } = event.detail;
      setSuccessMessage(`Successfully added ${count} stock${count > 1 ? 's' : ''} for ${brand || product}`);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    };

    // Listen for item added event to show toast notification
    const handleItemAdded = (event) => {
      const { brand, category } = event.detail;
      setSuccessMessage(`Successfully added ${brand} to ${category}`);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    };

    window.addEventListener('equipment:updated', handleEquipmentUpdate);
    window.addEventListener('ireply:equipment:restore', handleEquipmentRestore);
    window.addEventListener('stock:added', handleStockAdded);
    window.addEventListener('item:added', handleItemAdded);

    // Cleanup event listeners on component unmount
    return () => {
      window.removeEventListener('equipment:updated', handleEquipmentUpdate);
      window.removeEventListener('ireply:equipment:restore', handleEquipmentRestore);
      window.removeEventListener('stock:added', handleStockAdded);
      window.removeEventListener('item:added', handleItemAdded);
    };
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories', {
        headers: {
          'Accept': 'application/json',
        },
        credentials: 'same-origin',
      });

      const contentType = response.headers.get('content-type');
      let data;
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        throw new Error('Server returned non-JSON response');
      }

      if (data.success) {
        const categoriesData = data.data;
        setCategories(categoriesData);
        return categoriesData;
      } else {
        setError('Failed to fetch categories');
        return [];
      }
    } catch (err) {
      setError('Error fetching categories');
      return [];
    }
  };

  const fetchEquipment = async (categoriesList = null) => {
    try {
      setLoading(true);
      // Use provided categories or fall back to state
      const categoriesToUse = categoriesList || categories;
      
      // Request all equipment without status filter and with high per_page to show all items
      const response = await fetch('/api/equipment?per_page=1000', {
        headers: {
          'Accept': 'application/json',
        },
        credentials: 'same-origin',
      });

      const contentType = response.headers.get('content-type');
      let data;
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        throw new Error('Server returned non-JSON response');
      }

      if (data.success) {
        const equipmentWithCategories = data.data.data.map(item => {
          // If item has category object, use it
          if (item.category && item.category.id) {
            return { ...item, category: item.category };
          }
          // If item has category_id but no category object, look it up from categories
          if (item.category_id && categoriesToUse.length > 0) {
            const foundCategory = categoriesToUse.find(cat => cat.id === item.category_id);
            if (foundCategory) {
              return { ...item, category: foundCategory };
            }
          }
          // Only default to Uncategorized if no category_id exists
          return { ...item, category: { id: null, name: 'Uncategorized' } };
        });
        setEquipment(equipmentWithCategories);
      } else {
        setError('Failed to fetch equipment');
      }
    } catch (err) {
      setError('Error connecting to the server');
      console.error('Error fetching equipment:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort equipment (group by product)
  const getFilteredAndSortedEquipment = () => {
    // Group equipment by product (name + brand)
    const grouped = equipment.reduce((acc, item) => {
      const key = `${item.name || 'Unknown'}_${item.brand || 'Unknown'}`;
      if (!acc[key]) {
        acc[key] = {
          key,
          name: item.name || 'Unknown',
          brand: item.brand || 'Unknown',
          category: item.category || { id: null, name: 'Uncategorized' },
          purchase_price: parseFloat(item.purchase_price) || 0,
          image: item.item_image || null,
          total_count: 0,
          available_count: 0,
          borrowed_count: 0,
          issued_count: 0,
          // capture an example created_at for display
          created_at: item.created_at || null,
        };
      }
      // Count only real stock units (must have serial_number)
      if (item.serial_number) {
        acc[key].total_count += 1;
        if (item.status === 'available') acc[key].available_count += 1;
        if (item.status === 'borrowed') acc[key].borrowed_count += 1;
        if (item.status === 'issued') acc[key].issued_count += 1;
      }
      return acc;
    }, {});

    let filteredEquipment = Object.values(grouped);

    // Apply search filter at product level
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filteredEquipment = filteredEquipment.filter(
        item => {
          // Search in product name (item name)
          const nameMatch = item.name?.toLowerCase().includes(searchLower);

          // Search in brand
          const brandMatch = item.brand?.toLowerCase().includes(searchLower);

          // Search in category
          const categoryMatch = item.category?.name?.toLowerCase().includes(searchLower);

          // Search in price (convert to string for searching)
          const priceMatch = item.purchase_price?.toString().includes(searchTerm);

          return nameMatch || brandMatch || categoryMatch || priceMatch;
        }
      );
    }

    // Apply sorting
    if (sortConfig.key) {
      filteredEquipment.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Handle special cases
        if (sortConfig.key === 'category') {
          aValue = a.category?.name || 'Uncategorized';
          bValue = b.category?.name || 'Uncategorized';
        } else if (sortConfig.key === 'price') {
          aValue = parseFloat(a.purchase_price) || 0;
          bValue = parseFloat(b.purchase_price) || 0;
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return filteredEquipment;
  };

  // Helper function to get all products without search filter
  const getAllProducts = () => {
    // Group equipment by product (name + brand)
    const grouped = equipment.reduce((acc, item) => {
      const key = `${item.name || 'Unknown'}_${item.brand || 'Unknown'}`;
      if (!acc[key]) {
        acc[key] = {
          key,
          name: item.name || 'Unknown',
          brand: item.brand || 'Unknown',
          category: item.category || { id: null, name: 'Uncategorized' },
          purchase_price: parseFloat(item.purchase_price) || 0,
          image: item.item_image || null,
          total_count: 0,
          available_count: 0,
          borrowed_count: 0,
          issued_count: 0,
          created_at: item.created_at || null,
        };
      }
      // Count only items with a serial number
      if (item.serial_number) {
        acc[key].total_count += 1;
        if (item.status === 'available') acc[key].available_count += 1;
        if (item.status === 'borrowed') acc[key].borrowed_count += 1;
        if (item.status === 'issued') acc[key].issued_count += 1;
      }
      return acc;
    }, {});

    return Object.values(grouped);
  };

  // Build display rows: one row per product, with count of recently added items
  const getDisplayRows = () => {
    let products = getFilteredAndSortedEquipment();

    // If searching, also check individual items and include products with matching items
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();

      // Find all unique product keys that have matching items
      const matchingProductKeys = new Set();

      // First, add products that match at product level (already filtered in getFilteredAndSortedEquipment)
      products.forEach(p => {
        matchingProductKeys.add(p.key);
      });

      // Then, find products with matching individual items
      equipment.forEach(item => {
        // Search in serial number
        const serialMatch = item.serial_number?.toLowerCase().includes(searchLower);

        // Search in specs/description
        const specsMatch = item.specifications?.toLowerCase().includes(searchLower) ||
          item.description?.toLowerCase().includes(searchLower);

        // Search in price (convert to string for searching)
        const priceMatch = item.purchase_price?.toString().includes(searchTerm);

        // Search in date (format date and search)
        let dateMatch = false;
        if (item.created_at) {
          const dateStr = new Date(item.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          }).toLowerCase();
          dateMatch = dateStr.includes(searchLower);
        }

        if (serialMatch || specsMatch || priceMatch || dateMatch) {
          const eqKey = `${item.name || 'Unknown'}_${item.brand || 'Unknown'}`;
          matchingProductKeys.add(eqKey);
        }
      });

      // Get all products (without search filter) to find products with matching items
      const allProducts = getAllProducts();

      // Combine products that match at product level OR have matching items
      const finalProducts = new Map();

      // Add products that match at product level
      products.forEach(p => {
        finalProducts.set(p.key, p);
      });

      // Add products that have matching items
      allProducts.forEach(p => {
        if (matchingProductKeys.has(p.key) && !finalProducts.has(p.key)) {
          finalProducts.set(p.key, p);
        }
      });

      products = Array.from(finalProducts.values());
    }

    return products.map((p) => {
      // Get all equipment items for this product
      let allItems = equipment.filter(eq => {
        const eqKey = `${eq.name || 'Unknown'}_${eq.brand || 'Unknown'}`;
        return eqKey === p.key && !!eq.serial_number; // Only show units with serials
      });

      // If search term exists, filter items by search criteria
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        allItems = allItems.filter(item => {
          // Search in serial number
          const serialMatch = item.serial_number?.toLowerCase().includes(searchLower);

          // Search in specs/description
          const specsMatch = item.specifications?.toLowerCase().includes(searchLower) ||
            item.description?.toLowerCase().includes(searchLower);

          // Search in price (convert to string for searching)
          const priceMatch = item.purchase_price?.toString().includes(searchTerm);

          // Search in date (format date and search)
          let dateMatch = false;
          if (item.created_at) {
            const dateStr = new Date(item.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            }).toLowerCase();
            dateMatch = dateStr.includes(searchLower);
          }

          return serialMatch || specsMatch || priceMatch || dateMatch;
        });
      }

      // Get the most recent batch for this product (batches are ordered newest first)
      const batches = addedBatchesByProduct[p.key] || [];
      const mostRecentBatch = batches.length > 0 ? batches[0] : null;

      // Determine which items are from the most recent batch only
      const recentlyAddedItems = mostRecentBatch ? allItems.filter(item => {
        // Check if this item's serial is in the most recent batch
        return mostRecentBatch.serials && mostRecentBatch.serials.includes(item.serial_number);
      }) : [];

      return {
        ...p,
        allItems: allItems, // All items for dropdown (filtered by search if search term exists)
        recentlyAddedItems: recentlyAddedItems, // Items to highlight (only from most recent batch)
        recentlyAddedCount: mostRecentBatch ? mostRecentBatch.count : 0, // Count from most recent batch only
        mostRecentBatch: mostRecentBatch, // Store the most recent batch for reference
      };
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'category' ? (value ? parseInt(value, 10) : '') : value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      // Check file size (5MB max)
      if (files[0].size > 5 * 1024 * 1024) {
        setErrors(prev => ({
          ...prev,
          [name]: 'File size must be less than 5MB'
        }));
        return;
      }
      setFormData(prev => ({
        ...prev,
        [name]: files[0]
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      const formDataToSend = new FormData();
      Object.keys(formData).forEach(key => {
        const value = formData[key];
        if (value !== null) {
          if (key === 'category' && value) {
            formDataToSend.append('category_id', value);
          } else if (key === 'price' && typeof value === 'string') {
            // Normalize formatted price like "1,234.56" -> "1234.56"
            const normalized = value.replace(/[,\s]/g, '');
            if (normalized !== '') formDataToSend.append('price', normalized);
          } else if (key !== 'category') {
            formDataToSend.append(key, value);
          }
        }
      });

      // Add CSRF token for Laravel
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
      if (csrfToken) {
        formDataToSend.append('_token', csrfToken);
      }

      const response = await fetch('/api/equipment', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
        },
        credentials: 'same-origin',
        body: formDataToSend
      });

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      let data;
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        // If not JSON, it's likely an HTML error page
        const text = await response.text();
        throw new Error(`Server returned an error (${response.status}). Please check your connection and try again.`);
      }

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Error adding equipment');
      }

      // Trigger equipment update event for dynamic refresh
      window.dispatchEvent(new Event('equipment:updated'));

      // Refresh equipment list
      await fetchEquipment();

      // Reset form and close modal on success
      setFormData({
        category: '',
        brand: '',
        supplier: '',
        description: '',
        price: '',
        item_image: null,
        receipt_image: null
      });

    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setIsAddStocksOpen(false);
    // Clear any error states when closing modal
    setErrors({});
  };

  return (
    <div className="h-screen bg-white flex overflow-hidden">
      <div className="flex-shrink-0">
        <HomeSidebar />
      </div>
      <div className="flex-1 flex flex-col">
        <GlobalHeader title="Add Stocks" />

        <main className="flex-1 px-10 py-6 overflow-y-auto">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-blue-600">Equipment History</h2>
              <p className="text-sm text-gray-600 mt-1">Complete history of all equipment with status and dates</p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <div className="flex-1 max-w-2xl flex items-center space-x-4">
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search equipment..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 pl-10"
                  />
                  <div className="absolute left-3 top-2.5 text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>

            </div>
            <div className="space-x-3">
              <button
                onClick={() => setIsAddStocksOpen(true)}
                className="px-4 py-2 rounded-md bg-blue-100 text-blue-700 text-sm hover:bg-blue-600 hover:text-white"
              >
                Add Stocks
              </button>
            </div>
          </div>

          {/* Table with proper HTML structure */}
          {/* Equipment List */}
          <div className="mt-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading equipment...</div>
              ) : error ? (
                <div className="p-8 text-center text-red-500">{error}</div>
              ) : equipment.length === 0 ? (
                <div className="bg-gray-800 rounded-lg p-8 text-center">
                  <p className="text-white text-lg font-medium mb-4">Click any item to view details</p>
                  <svg className="w-8 h-8 text-white mx-auto arrow-down-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th
                        className="text-left py-4 px-6 font-semibold text-gray-700"
                      >
                        <div className="flex items-center">Items</div>
                      </th>
                      <th
                        className="text-left py-4 px-6 font-semibold text-gray-700"
                      >
                        <div className="flex items-center">Category</div>
                      </th>
                      <th className="text-right py-4 px-6 font-semibold text-gray-700">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const allRows = getDisplayRows();
                      const startIndex = (currentPage - 1) * itemsPerPage;
                      const endIndex = startIndex + itemsPerPage;
                      const paginatedRows = itemsPerPage === 1000 ? allRows : allRows.slice(startIndex, endIndex);
                      return paginatedRows.map((item, index) => {
                        const rowId = `${item.key}`;
                        const isOpen = !!expandedRows[rowId];
                      return (
                        <React.Fragment key={rowId}>
                          <tr
                            className={`
                          ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} 
                          hover:bg-blue-50 transition-colors duration-150 border-b border-gray-100 last:border-b-0 cursor-pointer
                        `}
                            onClick={() => toggleExpanded(rowId)}
                          >
                            <td className="py-4 px-6">
                              <div className="flex items-center">
                                {item.image ? (
                                  <img
                                    src={`/storage/${item.image}`}
                                    alt={item.name}
                                    className="w-10 h-10 rounded-lg object-cover mr-3"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center mr-3">
                                    <span className="text-gray-400 text-xs">No img</span>
                                  </div>
                                )}
                                <div>
                                  <div className="font-medium text-gray-900">{item.name}</div>
                                  <div className="text-sm text-gray-500">{item.brand}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6 text-gray-700">
                              <div className="flex items-center">
                                {item.category?.name || 'Uncategorized'}
                                <svg className="w-4 h-4 text-gray-600 ml-2 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isOpen ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                                </svg>
                              </div>
                            </td>
                            <td className="py-4 px-6 text-gray-700 font-semibold text-right">
                              {item.total_count || 0}
                            </td>
                          </tr>
                          {isOpen && (
                            <tr className="bg-white border-b border-gray-100">
                              <td colSpan={3} className="px-6 py-4">
                                <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                                  <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
                                    <div className="grid grid-cols-5 gap-4 text-xs font-semibold text-gray-700">
                                      <div>Serial</div>
                                      <div>Specs</div>
                                      <div className="text-right">Price</div>
                                      <div>Date Added</div>
                                      <div>Receipt</div>
                                    </div>
                                  </div>
                                  <div className="relative">
                                    <div 
                                      ref={(el) => (dropdownRefs.current[rowId] = el)}
                                      onScroll={() => handleDropdownScroll(rowId)}
                                      className="divide-y divide-gray-200 max-h-64 overflow-y-auto hide-scrollbar"
                                    >
                                      {(item.allItems || []).map((equipmentItem, i) => {
                                      const isRecentlyAdded = item.recentlyAddedItems.some(rai => rai.id === equipmentItem.id);
                                      const addedDate = equipmentItem.created_at
                                        ? new Date(equipmentItem.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                        : 'N/A';

                                      return (
                                        <div
                                          key={`${rowId}-item-${equipmentItem.id}`}
                                          className={`px-4 py-3 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${isRecentlyAdded ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                                        >
                                          <div className="grid grid-cols-5 gap-4 items-center text-sm">
                                            <div className="font-medium text-gray-900">
                                              {equipmentItem.serial_number || 'N/A'}
                                              {isRecentlyAdded && (
                                                <span className="ml-2 px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-semibold">
                                                  NEW
                                                </span>
                                              )}
                                            </div>
                                            <div className="text-gray-700 truncate">
                                              {equipmentItem.specifications || equipmentItem.description || '—'}
                                            </div>
                                            <div className="text-right text-gray-800">
                                              ₱{Number(equipmentItem.purchase_price || 0).toLocaleString(undefined, {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2
                                              })}
                                            </div>
                                            <div className="text-gray-700">
                                              {addedDate}
                                              {isRecentlyAdded && (
                                                <span className="ml-1 text-blue-600 text-xs font-medium">(New)</span>
                                              )}
                                            </div>
                                            <div>
                                              {(() => {
                                                const receiptUrl = equipmentItem.receipt_image_url ||
                                                  (equipmentItem.receipt_image ? `/storage/${equipmentItem.receipt_image}` : null);
                                                return receiptUrl ? (
                                                  <img
                                                    src={receiptUrl}
                                                    alt="Receipt"
                                                    className="h-10 w-auto object-contain bg-white rounded border cursor-pointer hover:opacity-80 transition-opacity"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setReceiptPreview({ src: receiptUrl, alt: `Receipt - ${equipmentItem.serial_number || 'Item'}` });
                                                    }}
                                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                  />
                                                ) : (
                                                  <span className="text-gray-400 text-xs">No receipt</span>
                                                );
                                              })()}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                      })}
                                      {(!item.allItems || item.allItems.length === 0) && (
                                        <div className="px-4 py-3 bg-white text-sm text-gray-500">No items found for this product.</div>
                                      )}
                                    </div>
                                    {/* Scroll Indicator Arrow */}
                                    {dropdownScrollIndicators[rowId] && (
                                      <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 pointer-events-none z-10">
                                        <div className="flex flex-col items-center -space-y-3">
                                          <ChevronDown className="h-7 w-7 text-gray-400 chevron-fade-1" strokeWidth={2.5} />
                                          <ChevronDown className="h-7 w-7 text-gray-400 chevron-fade-2" strokeWidth={2.5} />
                                          <ChevronDown className="h-7 w-7 text-blue-500 chevron-glow" strokeWidth={3} />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                      });
                    })()}
                  </tbody>
                </table>
              )}
            </div>
            <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-white">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600 font-medium">
                  Total: {(() => {
                    const rows = getDisplayRows();
                    return `${rows.length} ${rows.length === 1 ? 'Item' : 'Items'}`;
                  })()}
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-1 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    disabled={itemsPerPage === 1000 || currentPage * itemsPerPage >= getDisplayRows().length}
                    className="p-1 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Items per page:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="p-1 border rounded-md text-sm bg-white"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={1000}>All</option>
                </select>
              </div>
            </div>
          </div>
        </main>

        {isAddStocksOpen && (
          <AddStocksModal
            onClose={closeModal}
            selectedEquipment={selectedEquipment}
            categories={categories}
            onSuccess={fetchEquipment}
            onAdded={(productKey, count, meta) => {
              const now = new Date().toISOString();
              setAddedBatchesByProduct(prev => ({
                ...prev,
                [productKey]: [
                  { count, at: now, ...meta },
                  ...(prev[productKey] || []),
                ],
              }));

              // Refresh equipment to get the newly added items
              fetchEquipment();
            }}
          />
        )}

        {/* Receipt Lightbox Modal */}
        {receiptPreview && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/80" onClick={() => setReceiptPreview(null)} />
            <div className="relative max-w-5xl w-full max-h-[95vh] px-4">
              <button
                onClick={() => setReceiptPreview(null)}
                className="absolute -top-10 right-6 text-white/80 hover:text-white transition-colors"
                aria-label="Close preview"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <img
                src={receiptPreview.src}
                alt={receiptPreview.alt || 'Receipt preview'}
                className="mx-auto max-h-[90vh] w-auto object-contain rounded-lg shadow-2xl"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/images/placeholder-equipment.png';
                }}
              />
            </div>
          </div>
        )}

        {/* Success Toast Notification */}
        {showSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="relative bg-white rounded-lg shadow-lg p-4 flex items-center max-w-sm w-full mx-4 animate-fade-in pointer-events-auto">
              <div className="flex items-start w-full">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="ml-3 w-0 flex-1">
                  <h3 className="text-base font-semibold text-gray-900">Success!</h3>
                  <p className="mt-1 text-sm text-gray-500">{successMessage}</p>
                </div>
                <div className="ml-4 flex-shrink-0 flex">
                  <button
                    onClick={() => setShowSuccess(false)}
                    className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddStocks;

// New AddStocksModal Component with Three Progressive Modes
const AddStocksModal = ({ onClose, selectedEquipment, categories = [], onSuccess, onAdded }) => {
  const [currentMode, setCurrentMode] = useState('category'); // 'category', 'product', 'serial'
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [serialNumbers, setSerialNumbers] = useState(['']);
  const [receipt, setReceipt] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const serialInputRefs = useRef([]);

  // Fetch products when category is selected
  useEffect(() => {
    if (selectedCategory) {
      fetchProducts(selectedCategory.id);
    }
  }, [selectedCategory]);

  const fetchProducts = async (categoryId) => {
    try {
      setLoading(true);
      // Fetch all equipment for the category without pagination limits
      const response = await fetch(`/api/equipment?category_id=${categoryId}&per_page=1000`, {
        headers: {
          'Accept': 'application/json',
        },
      });

      const contentType = response.headers.get('content-type');
      let data;
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        throw new Error('Server returned non-JSON response');
      }

      if (data.success) {
        // Group equipment by name/brand to show only item types, not individual units
        const equipmentItems = data.data.data || [];
        const groupedItems = equipmentItems.reduce((acc, item) => {
          // Create unique key based on name and brand for grouping
          const key = `${item.name || 'Unknown'}_${item.brand || 'Unknown'}`;
          if (!acc[key]) {
            acc[key] = {
              id: item.id, // Use the first item's ID as the group ID
              name: item.name,
              brand: item.brand,
              specifications: item.specifications,
              item_image: item.item_image,
              category_id: item.category_id,
              // Count how many units exist (dynamic count)
              existing_count: 1,
              available_count: item.status === 'available' ? 1 : 0,
              borrowed_count: item.status === 'borrowed' ? 1 : 0,
              issued_count: item.status === 'issued' ? 1 : 0,
              items: [item] // Keep track of all items
            };
          } else {
            // Increment count for each additional item with same name/brand
            acc[key].existing_count += 1;
            // Increment status counts
            if (item.status === 'available') {
              acc[key].available_count += 1;
            }
            if (item.status === 'borrowed') {
              acc[key].borrowed_count += 1;
            }
            if (item.status === 'issued') {
              acc[key].issued_count += 1;
            }
            acc[key].items.push(item);
          }
          return acc;
        }, {});

        setProducts(Object.values(groupedItems));
      } else {
        setErrors({ products: 'Failed to fetch products' });
      }
    } catch (err) {
      setErrors({ products: 'Error fetching products' });
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    fetchProducts(category.id); // Fetch products when category is selected
    setCurrentMode('product');
    setErrors({});
  };

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    setCurrentMode('serial');
    setErrors({});
  };

  const handleSerialChange = (index, value) => {
    const newSerialNumbers = [...serialNumbers];
    newSerialNumbers[index] = value;
    setSerialNumbers(newSerialNumbers);
  };

  const handleSerialKeyDown = (index, e) => {
    if (e.key === 'Enter') {
      e.preventDefault();

      // If this is the last field and it has content, add a new field
      if (index === serialNumbers.length - 1 && serialNumbers[index].trim()) {
        addSerialField();
        // Focus will be set after the new field is added
        setTimeout(() => {
          if (serialInputRefs.current[index + 1]) {
            serialInputRefs.current[index + 1].focus();
          }
        }, 0);
      } else if (index < serialNumbers.length - 1) {
        // Move to next existing field
        serialInputRefs.current[index + 1]?.focus();
      }
    }
  };

  const addSerialField = () => {
    setSerialNumbers([...serialNumbers, '']);
  };

  const removeSerialField = (index) => {
    const newSerialNumbers = serialNumbers.filter((_, idx) => idx !== index);
    setSerialNumbers(newSerialNumbers);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrors({ receipt: 'File size must be less than 5MB' });
        return;
      }
      setReceipt(file);
      setReceiptPreview(URL.createObjectURL(file));
      setErrors({});
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    // Validate serial numbers
    const emptySerials = serialNumbers.filter(s => !s.trim());
    if (emptySerials.length > 0) {
      setErrors({ serials: 'All serial numbers must be filled' });
      setLoading(false);
      return;
    }

    // Check for duplicate serial numbers
    const trimmedSerials = serialNumbers.map(s => s.trim());
    const uniqueSerials = new Set(trimmedSerials);
    if (trimmedSerials.length !== uniqueSerials.size) {
      setErrors({ serials: 'Duplicate serial numbers are not allowed' });
      setLoading(false);
      return;
    }

    // Validate receipt
    if (!receipt) {
      setErrors({ receipt: 'Receipt image is required' });
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('equipment_id', selectedProduct.id);
      formData.append('serial_numbers', JSON.stringify(serialNumbers));
      formData.append('receipt_image', receipt);

      // Add CSRF token for Laravel
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
      if (csrfToken) {
        formData.append('_token', csrfToken);
      }

      const response = await fetch('/api/equipment/add-stock', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
        },
        body: formData,
      });

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      let data;
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        // If not JSON, it's likely an HTML error page
        const text = await response.text();
        throw new Error(`Server returned an error (${response.status}). Please check your connection and try again.`);
      }

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Error adding stocks');
      }

      // Trigger equipment update event for dynamic refresh
      window.dispatchEvent(new Event('equipment:updated'));

      // Inform parent how many were added and include batch meta for dropdown (before closing)
      if (onAdded && selectedProduct) {
        const productKey = `${selectedProduct.name || 'Unknown'}_${selectedProduct.brand || 'Unknown'}`;
        onAdded(productKey, serialNumbers.length, {
          serials: [...serialNumbers],
          specs: selectedProduct?.specifications || '',
          price: selectedProduct?.purchase_price || 0,
          receiptUrl: receiptPreview || null,
        });
      }

      // Refresh the products list to show updated counts
      if (selectedCategory) {
        await fetchProducts(selectedCategory.id);
      }

      if (onSuccess) onSuccess();
      
      // Call onAdded callback to update the parent component
      if (onAdded && selectedProduct) {
        const productKey = `${selectedProduct.name}_${selectedProduct.brand}`;
        onAdded(productKey, serialNumbers.length, {
          category: selectedCategory?.name,
          product: selectedProduct.name,
          brand: selectedProduct.brand,
          serialNumbers: serialNumbers,
          receiptUrl: receiptPreview || null,
        });
      }
      
      handleClose();
      
      // Trigger success toast notification in parent component
      window.dispatchEvent(new CustomEvent('stock:added', { 
        detail: { 
          count: serialNumbers.length,
          product: selectedProduct.name,
          brand: selectedProduct.brand
        } 
      }));
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (currentMode === 'product') {
      setCurrentMode('category');
      setSelectedCategory(null);
      setErrors({});
    } else if (currentMode === 'serial') {
      setCurrentMode('product');
      setSelectedProduct(null);
      setErrors({});
    }
  };

  const handleClose = () => {
    setErrors({});
    onClose();
  };

  const filteredProducts = products.filter(product =>
    product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.specifications?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={handleClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-[700px] max-w-[92vw] p-6 max-h-[90vh] overflow-y-auto">
        <button onClick={handleClose} className="absolute right-4 top-4 text-gray-500 hover:text-blue-600">
          <X className="h-6 w-6" />
        </button>
        <h3 className="text-xl font-bold text-blue-600 text-center">Add Stocks</h3>

        {/* Category Selection Mode */}
        {currentMode === 'category' && (
          <div className="mt-6">
            <div className="relative mb-4">
              <input
                type="text"
                placeholder="Monitor"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 pl-10"
              />
              <div className="absolute left-3 top-3.5 text-gray-400">
                <Search className="h-5 w-5" />
              </div>
              <button className="absolute right-3 top-3.5 text-gray-400">
                <Grid3X3 className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {categories.map((category) => (
                <div
                  key={category.id}
                  onClick={() => handleCategorySelect(category)}
                  className="p-3 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-colors"
                >
                  <div className="font-medium text-gray-900">{category.name}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Product Selection Mode */}
        {currentMode === 'product' && (
          <div className="mt-6">
            <div className="flex items-center mb-4">
              <button
                onClick={goBack}
                className="flex items-center text-blue-600 hover:text-blue-700 mr-3"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </button>
              <span className="text-sm text-gray-600">{selectedCategory?.name}</span>
            </div>

            <div className="relative mb-4">
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 pl-10"
              />
              <div className="absolute left-3 top-3.5 text-gray-400">
                <Search className="h-5 w-5" />
              </div>
              <button className="absolute right-3 top-3.5 text-gray-400">
                <Grid3X3 className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {loading ? (
                <div className="text-center py-4 text-gray-500">Loading products...</div>
              ) : (
                filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => handleProductSelect(product)}
                    className="p-3 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-colors"
                  >
                    <div className="font-medium text-gray-900">{product.brand}</div>
                    <div className="text-sm text-gray-500">{product.specifications}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      Available: {product.available_count || 0}/{product.existing_count || 0}
                      {product.borrowed_count > 0 && (
                        <span className="ml-2 text-blue-600">({product.borrowed_count} borrowed)</span>
                      )}
                      {product.issued_count > 0 && (
                        <span className="ml-2 text-orange-600">({product.issued_count} issued)</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Serial Number Entry Mode */}
        {currentMode === 'serial' && (
          <form onSubmit={handleSubmit}>
            {/* Selected Product Info */}
            <div className="mt-6">
              <div className="flex items-center mb-4">
                <button
                  onClick={goBack}
                  className="flex items-center text-blue-600 hover:text-blue-700 mr-3"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </button>
                <span className="text-sm text-gray-600">{selectedCategory?.name}</span>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-4">
                  {selectedProduct?.item_image ? (
                    <img
                      src={`/storage/${selectedProduct.item_image}`}
                      alt={selectedProduct.name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center">
                      <span className="text-gray-400 text-xs">No img</span>
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-gray-900">{selectedProduct?.brand}</h4>
                      <button className="p-1 rounded text-gray-400 hover:text-blue-600">
                        <Grid3X3 className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{selectedProduct?.specifications}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Serial Numbers */}
            <div className="mb-6">
              <div className="flex items-center mb-2">
                <label className="text-sm text-gray-600">Serial Numbers</label>
                <span className="ml-2 px-2 py-0.5 rounded-full bg-gray-800 text-white text-xs font-semibold">
                  {serialNumbers.length}
                </span>
              </div>
              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2 select-scrollbar">
                {serialNumbers.map((serial, idx) => (
                  <div key={idx} className="flex items-center space-x-3">
                    <label className="text-sm text-gray-500 w-20">Serial No.</label>
                    <input
                      ref={(el) => (serialInputRefs.current[idx] = el)}
                      value={serial}
                      onChange={(e) => handleSerialChange(idx, e.target.value)}
                      onKeyDown={(e) => handleSerialKeyDown(idx, e)}
                      placeholder="4354354"
                      className="flex-1 px-3 py-2 rounded-md bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={addSerialField}
                      className="p-1.5 rounded-md bg-blue-100 text-blue-700 hover:bg-blue-600 hover:text-white"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    {serialNumbers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSerialField(idx)}
                        className="p-1.5 rounded-md bg-red-100 text-red-600 hover:bg-red-600 hover:text-white"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {errors.serials && (
                <p className="mt-1 text-sm text-red-500">{errors.serials}</p>
              )}
            </div>

            {/* Receipt Upload */}
            <div className="mb-6">
              <label className="text-sm text-gray-600 mb-2 block">Receipt</label>
              <div
                className={`h-36 w-full border-2 border-dashed rounded-lg ${receipt ? 'border-blue-300' : 'border-gray-300'
                  } ${errors.receipt ? 'border-red-500' : ''
                  } hover:border-blue-400 transition-colors relative overflow-hidden`}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const file = e.dataTransfer.files[0];
                  if (file) handleFileChange({ target: { files: [file] } });
                }}
              >
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                {receiptPreview ? (
                  <div className="relative w-full h-full">
                    <img
                      src={receiptPreview}
                      alt="Receipt preview"
                      className="w-full h-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setReceipt(null);
                        setReceiptPreview(null);
                      }}
                      className="absolute top-2 right-2 p-1 rounded-full bg-red-500 text-white hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="p-2 rounded-full bg-gray-100 mb-2">
                      <Grid3X3 className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="text-sm font-medium text-gray-700">Click to upload</div>
                    <div className="text-xs text-gray-500 mt-1">or drag and drop</div>
                    <div className="text-xs text-gray-400 mt-2">
                      JPEG, PNG, GIF, WebP up to 5MB
                    </div>
                  </div>
                )}
              </div>
              {errors.receipt && (
                <p className="mt-1 text-sm text-red-500">{errors.receipt}</p>
              )}
            </div>

            {errors.submit && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                {errors.submit}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className={`inline-flex items-center px-5 py-2 rounded-full ${loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
                  } text-white transition-colors`}
              >
                <span>{loading ? 'Saving...' : 'Save'}</span>
                <ChevronRight className="ml-2 h-5 w-5" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

const AddItemModal = ({ onClose, categories = [], onSuccess }) => {
  const [formData, setFormData] = useState({
    category: '',
    brand: '',
    supplier: '',
    description: '',
    price: '',
    item_image: null,
    receipt_image: null
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [preview, setPreview] = useState({
    item_image: null,
    receipt_image: null
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const formatPrice = (value) => {
    if (!value || value === '' || value === null || value === undefined) return '';
    // Convert to string and remove all non-digit characters except decimal point
    const numericValue = value.toString().replace(/[^\d.]/g, '');
    if (numericValue === '' || numericValue === '.') return '';

    // Split by decimal point
    const parts = numericValue.split('.');
    // Format the integer part with commas
    const integerPart = parts[0] ? parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '0';
    // Keep decimal part if exists (max 2 decimal places)
    const decimalPart = parts[1] ? '.' + parts[1].slice(0, 2) : '';

    return integerPart + decimalPart;
  };

  const parsePrice = (value) => {
    if (!value || value === '') return '';
    // Remove commas and keep only numbers and decimal point
    return value.toString().replace(/,/g, '');
  };

  const handlePriceChange = (e) => {
    const value = e.target.value;
    // Parse the input to get raw numeric value
    const rawValue = parsePrice(value);

    // Allow empty string, numbers, and decimal points
    if (rawValue === '' || /^\d*\.?\d*$/.test(rawValue)) {
      // Store raw value in formData
      setFormData(prev => ({
        ...prev,
        price: rawValue
      }));
    }
    if (errors.price) {
      setErrors(prev => ({ ...prev, price: null }));
    }
  };

  const handlePriceBlur = (e) => {
    // Format the price on blur - ensure 2 decimal places
    const rawValue = parsePrice(e.target.value);
    if (rawValue && rawValue !== '' && !isNaN(rawValue)) {
      const numValue = parseFloat(rawValue);
      if (!isNaN(numValue)) {
        const formattedValue = numValue.toFixed(2);
        setFormData(prev => ({
          ...prev,
          price: formattedValue
        }));
      }
    } else if (rawValue === '') {
      setFormData(prev => ({
        ...prev,
        price: ''
      }));
    }
  };

  const handlePriceIncrement = () => {
    const currentPrice = parseFloat(formData.price) || 0;
    // Use larger step for larger values, smaller step for smaller values
    const step = currentPrice >= 100 ? 1 : 0.01;
    const newPrice = (currentPrice + step).toFixed(2);
    setFormData(prev => ({
      ...prev,
      price: newPrice
    }));
    if (errors.price) {
      setErrors(prev => ({ ...prev, price: null }));
    }
  };

  const handlePriceDecrement = () => {
    const currentPrice = parseFloat(formData.price) || 0;
    // Use larger step for larger values, smaller step for smaller values
    const step = currentPrice >= 100 ? 1 : 0.01;
    const newPrice = Math.max(0, currentPrice - step).toFixed(2);
    setFormData(prev => ({
      ...prev,
      price: newPrice
    }));
    if (errors.price) {
      setErrors(prev => ({ ...prev, price: null }));
    }
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      if (files[0].size > 5 * 1024 * 1024) {
        setErrors(prev => ({
          ...prev,
          [name]: 'File size must be less than 5MB'
        }));
        return;
      }

      // Create preview URL
      const url = URL.createObjectURL(files[0]);
      setPreview(prev => ({
        ...prev,
        [name]: url
      }));

      setFormData(prev => ({
        ...prev,
        [name]: files[0]
      }));

      if (errors[name]) {
        setErrors(prev => ({ ...prev, [name]: null }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    // Validation
    const requiredFields = ['category', 'brand', 'supplier', 'description'];
    const newErrors = {};
    requiredFields.forEach(field => {
      if (!formData[field]) {
        newErrors[field] = 'This field is required';
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setLoading(false);
      return;
    }

    try {
      const formDataToSend = new FormData();

      // Special handling for category - convert to category_id
      if (formData.category) {
        formDataToSend.append('category_id', formData.category);
      }

      // Add other form fields
      const fieldsToAdd = ['brand', 'supplier', 'description', 'price'];
      fieldsToAdd.forEach(key => {
        if (formData[key] !== null && formData[key] !== '') {
          formDataToSend.append(key, formData[key]);
        }
      });

      // Add files if they exist
      if (formData.item_image) {
        formDataToSend.append('item_image', formData.item_image);
      }
      if (formData.receipt_image) {
        formDataToSend.append('receipt_image', formData.receipt_image);
      }

      // Add CSRF token for Laravel
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
      if (csrfToken) {
        formDataToSend.append('_token', csrfToken);
      }

      const response = await fetch('/api/equipment', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
        },
        body: formDataToSend,
      });

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      let data;
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        // If not JSON, it's likely an HTML error page
        const text = await response.text();
        throw new Error(`Server returned an error (${response.status}). Please check your connection and try again.`);
      }

      if (!response.ok) {
        console.error('Server response:', data);
        throw new Error(data.message || data.error || 'Error adding equipment');
      }

      // Trigger equipment update event for dynamic refresh
      window.dispatchEvent(new Event('equipment:updated'));

      // Show success message
      setShowSuccess(true);

      // Reset form and refresh after a short delay
      setTimeout(() => {
        handleReset();
        if (onSuccess) {
          onSuccess();
        }
        setShowSuccess(false);
        onClose();
        
        // Trigger success toast notification in parent component
        window.dispatchEvent(new CustomEvent('item:added', { 
          detail: { 
            brand: formData.brand,
            category: categories.find(c => c.id === formData.category)?.name || 'Equipment'
          } 
        }));
      }, 2000);
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };



  const handleReset = () => {
    setFormData({
      category: '',
      brand: '',
      supplier: '',
      description: '',
      price: '',
      item_image: null,
      receipt_image: null
    });
    setPreview({
      item_image: null,
      receipt_image: null
    });
    setErrors({});
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/30" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-xl w-[880px] max-w-[95vw] p-8">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-gray-500 hover:text-blue-600"
            type="button"
          >
            <X className="h-6 w-6" />
          </button>
          <h3 className="text-xl font-bold text-blue-600 text-center">Add Equipment</h3>

          <form onSubmit={handleSubmit} className="mt-6">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <label className="text-sm text-gray-600">Category*</label>
                <div className="mt-2">
                  <div className="relative">
                    {/* Dropdown trigger button */}
                    <div
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className={`w-full px-3 py-2 rounded-md bg-gray-100 cursor-pointer ${errors.category ? 'border-red-500' : 'border-transparent'
                        } border hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    >
                      <span className={!formData.category ? 'text-gray-500' : ''}>
                        {formData.category ?
                          categories.find(c => c.id === formData.category)?.name
                          : 'Select a category'}
                      </span>
                    </div>

                    {/* Dropdown menu */}
                    {isDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200">
                        <div
                          className="max-h-48 overflow-y-auto select-scrollbar"
                        >
                          {categories && categories.map(category => (
                            <div
                              key={category.id}
                              className={`px-3 py-2 cursor-pointer hover:bg-blue-50 ${formData.category === category.id ? 'bg-blue-50 text-blue-600' : ''
                                }`}
                              onClick={() => {
                                handleInputChange({
                                  target: { name: 'category', value: category.id }
                                });
                                setIsDropdownOpen(false);
                              }}
                            >
                              {category.name || 'Unknown Category'}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {errors.category && <p className="mt-1 text-sm text-red-500">{errors.category}</p>}
                </div>
              </div>

              

              <div>
                <label className="text-sm text-gray-600">Brand*</label>
                <input
                  name="brand"
                  value={formData.brand}
                  onChange={handleInputChange}
                  className={`mt-2 w-full px-3 py-2 rounded-md bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.brand ? 'border-red-500' : ''
                    }`}
                  placeholder="Brand name"
                />
                {errors.brand && <p className="mt-1 text-sm text-red-500">{errors.brand}</p>}
              </div>

              <div>
                <label className="text-sm text-gray-600">Supplier*</label>
                <input
                  name="supplier"
                  value={formData.supplier}
                  onChange={handleInputChange}
                  className={`mt-2 w-full px-3 py-2 rounded-md bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.supplier ? 'border-red-500' : ''
                    }`}
                  placeholder="Supplier name"
                />
                {errors.supplier && <p className="mt-1 text-sm text-red-500">{errors.supplier}</p>}
              </div>

              <div>
                <label className="text-sm text-gray-600">Description*</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className={`mt-2 w-full px-3 py-2 rounded-md bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.description ? 'border-red-500' : ''
                    }`}
                  placeholder="Item description"
                  rows={3}
                />
                {errors.description && <p className="mt-1 text-sm text-red-500">{errors.description}</p>}
              </div>

              <div>
                <label className="text-sm text-gray-600">Price</label>
                <div className="mt-2 relative">
                  <input
                    name="price"
                    type="text"
                    value={formatPrice(formData.price)}
                    onChange={handlePriceChange}
                    onBlur={handlePriceBlur}
                    className="w-full px-3 py-2 pr-10 rounded-md bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                    inputMode="decimal"
                  />
                  <div className="absolute right-0 top-0 bottom-0 flex flex-col border-l border-gray-300">
                    <button
                      type="button"
                      onClick={handlePriceIncrement}
                      className="flex-1 px-2 flex items-center justify-center text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors border-b border-gray-200"
                      aria-label="Increase price"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={handlePriceDecrement}
                      className="flex-1 px-2 flex items-center justify-center text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      aria-label="Decrease price"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-600">Item image</label>
                <div className="mt-2">
                  <div
                    className={`h-36 w-full border-2 border-dashed rounded-lg ${formData.item_image ? 'border-blue-300' : 'border-gray-300'
                      } ${errors.item_image ? 'border-red-500' : ''
                      } hover:border-blue-400 transition-colors relative overflow-hidden`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const file = e.dataTransfer.files[0];
                      if (file) handleFileChange({ target: { name: 'item_image', files: [file] } });
                    }}
                  >
                    <input
                      type="file"
                      name="item_image"
                      onChange={handleFileChange}
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    {formData.item_image ? (
                      <div className="relative w-full h-full">
                        <img
                          src={preview.item_image}
                          alt="Item preview"
                          className="w-full h-full object-contain"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFormData(prev => ({ ...prev, item_image: null }));
                            setPreview(prev => ({ ...prev, item_image: null }));
                          }}
                          className="absolute top-2 right-2 p-1 rounded-full bg-red-500 text-white hover:bg-red-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full">
                        <div className="p-2 rounded-full bg-blue-50 mb-2">
                          <Plus className="h-6 w-6 text-blue-500" />
                        </div>
                        <div className="text-sm font-medium text-gray-700">Click to upload</div>
                        <div className="text-xs text-gray-500 mt-1">or drag and drop</div>
                        <div className="text-xs text-gray-400 mt-2">
                          JPEG, PNG, GIF, WebP up to 5MB
                        </div>
                      </div>
                    )}
                  </div>
                  {errors.item_image && (
                    <p className="mt-1 text-sm text-red-500">{errors.item_image}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-600">Receipt image</label>
                <div className="mt-2">
                  <div
                    className={`h-36 w-full border-2 border-dashed rounded-lg ${formData.receipt_image ? 'border-blue-300' : 'border-gray-300'
                      } ${errors.receipt_image ? 'border-red-500' : ''
                      } hover:border-blue-400 transition-colors relative overflow-hidden`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const file = e.dataTransfer.files[0];
                      if (file) handleFileChange({ target: { name: 'receipt_image', files: [file] } });
                    }}
                  >
                    <input
                      type="file"
                      name="receipt_image"
                      onChange={handleFileChange}
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    {formData.receipt_image ? (
                      <div className="relative w-full h-full">
                        <img
                          src={preview.receipt_image}
                          alt="Receipt preview"
                          className="w-full h-full object-contain"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFormData(prev => ({ ...prev, receipt_image: null }));
                            setPreview(prev => ({ ...prev, receipt_image: null }));
                          }}
                          className="absolute top-2 right-2 p-1 rounded-full bg-red-500 text-white hover:bg-red-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full">
                        <div className="p-2 rounded-full bg-blue-50 mb-2">
                          <Plus className="h-6 w-6 text-blue-500" />
                        </div>
                        <div className="text-sm font-medium text-gray-700">Click to upload</div>
                        <div className="text-xs text-gray-500 mt-1">or drag and drop</div>
                        <div className="text-xs text-gray-400 mt-2">
                          JPEG, PNG, GIF, WebP up to 5MB
                        </div>
                      </div>
                    )}
                  </div>
                  {errors.receipt_image && (
                    <p className="mt-1 text-sm text-red-500">{errors.receipt_image}</p>
                  )}
                </div>
              </div>
            </div>

            {errors.submit && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                {errors.submit}
              </div>
            )}

            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={handleReset}
                className="text-blue-600 hover:underline"
                disabled={loading}
              >
                Reset all
              </button>
              <button
                type="submit"
                className={`inline-flex items-center px-5 py-2 rounded-full ${loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
                  } text-white transition-colors`}
                disabled={loading}
              >
                <span>{loading ? 'Saving...' : 'Save'}</span>
                <ChevronRight className="ml-2 h-5 w-5" />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Success Popup */}
      {showSuccess && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center animate-fadeIn">
          <div className="absolute inset-0 bg-black/50 transition-opacity duration-300" />
          <div className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 transform transition-all duration-500 animate-scaleIn">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 animate-bounce">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Success!</h3>
              <p className="text-gray-600 text-center">Equipment has been added successfully.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};