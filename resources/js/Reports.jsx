import React, { useEffect, useMemo, useState } from "react";
import HomeSidebar from "./HomeSidebar";
import GlobalHeader from "./components/GlobalHeader";
import { Search, Filter, Download, Calendar, BarChart3, PieChart, TrendingUp, Users, Package, Clock, Shield } from "lucide-react";
import { reportService } from "./services/api";

const Reports = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [category, setCategory] = useState("All");
  const [equipmentCategory, setEquipmentCategory] = useState("All");
  const [equipmentFilterType, setEquipmentFilterType] = useState("by_item");
  const [borrowedCategory, setBorrowedCategory] = useState("All");
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // API data state
  const [summary, setSummary] = useState({ 
    total_items: 0, 
    available_stock: 0, 
    low_stock: 0, 
    out_of_stock: 0,
    total_requests: 0,
    approved_requests: 0,
    pending_requests: 0,
    total_users: 0
  });

  const [equipmentData, setEquipmentData] = useState([]);
  const [monthlyRequests, setMonthlyRequests] = useState([]);
  const [topBorrowed, setTopBorrowed] = useState([]);
  const [expensiveEquipment, setExpensiveEquipment] = useState([]);
  const [userActivity, setUserActivity] = useState([]);
  const [returnCompliance, setReturnCompliance] = useState([]);
  const [adminActivity, setAdminActivity] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);

  // Fetch categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories');
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          setCategories(result.data);
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };
    fetchCategories();
  }, []);

  // Fetch data from API
  useEffect(() => {
    const fetchReportsData = async () => {
      setLoading(true);
      setError('');
      
      try {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        if (searchTerm) params.append('search', searchTerm);

        const response = await fetch(`/api/reports/overview?${params.toString()}`);
        const result = await response.json();

        if (result.success && result.data) {
          const data = result.data;
          
          // Update summary
          setSummary({
            total_items: data.summary?.total_items || 0,
            available_stock: data.summary?.available_stock || 0,
            low_stock: data.summary?.low_stock || 0,
            out_of_stock: data.summary?.out_of_stock || 0,
            total_requests: 0,
            approved_requests: 0,
            pending_requests: 0,
            total_users: 0
          });

          // Update monthly trend
          const trendData = (data.trend || []).map(t => ({
            month: t.month,
            requests: t.requests || 0,
            approved: t.completed || 0,
            denied: 0,
            returned: t.completed || 0
          }));
          console.log('Monthly Trend Data:', trendData);
          setMonthlyRequests(trendData);

          // Update transactions
          setTransactions((data.transactions || []).map(t => ({
            date: t.date,
            employee: t.employee || 'Unknown',
            item: t.item || 'Unknown',
            status: t.status || 'Unknown',
            qty: t.qty || 1,
            approvedBy: t.approvedBy || '-'
          })));

          // Update top borrowed items from API
          const borrowedItems = (data.topBorrowed || []).map(item => ({
            item: `${item.brand || ''} ${item.item || ''}`.trim() || 'Unknown',
            borrowed: parseInt(item.borrowed_count) || 0,
            category: item.category || 'Uncategorized'
          }));
          console.log('Top Borrowed Items:', borrowedItems);
          setTopBorrowed(borrowedItems);

          // Update expensive equipment from API - group by item name and keep max value
          console.log('Raw expensive equipment data:', data.expensiveEquipment);
          
          const equipmentMap = new Map();
          (data.expensiveEquipment || []).forEach(item => {
            // Create a unique key from brand and item name
            const brand = (item.brand || '').trim();
            const itemName = (item.item || '').trim();
            const combinedName = brand && itemName 
              ? `${brand} ${itemName}`.trim()
              : brand || itemName || 'Unknown';
            const itemValue = parseFloat(item.value) || 0;
            const itemCount = parseInt(item.count) || 1;
            const existing = equipmentMap.get(combinedName);
            
            // Keep the entry with the maximum value for each unique item name, and sum up counts
            if (!existing || itemValue > existing.value) {
              equipmentMap.set(combinedName, {
                item: combinedName,
                value: itemValue,
                count: itemCount,
                category: item.category || 'Uncategorized'
              });
            } else if (existing && itemValue === existing.value) {
              // If same price, add to count
              existing.count += itemCount;
            }
          });
          
          // Convert to array, sort by value (descending - most expensive first), and limit to top 15 for better visualization
          const sortedEquipment = Array.from(equipmentMap.values())
            .sort((a, b) => b.value - a.value)
            .slice(0, 15); // Show top 15 most expensive items
          
          console.log('Processed expensive equipment:', sortedEquipment);
          setExpensiveEquipment(sortedEquipment);

          // Keep sample data for other sections (can be updated when endpoints are available)
          setEquipmentData([
            { category: "Laptop", total: 45, borrowed: 32, available: 13, maintenance: 0 },
            { category: "Printer", total: 12, borrowed: 5, available: 7, maintenance: 0 },
            { category: "Router", total: 8, borrowed: 4, available: 4, maintenance: 0 },
            { category: "Projector", total: 10, borrowed: 7, available: 3, maintenance: 0 },
            { category: "Switch", total: 14, borrowed: 8, available: 6, maintenance: 0 },
          ]);

          // Update return compliance from API
          const complianceData = (data.returnCompliance || []).map(item => ({
            user: item.user || 'Unknown',
            borrowed: parseInt(item.borrowed) || 0,
            returned: parseInt(item.returned) || 0,
            late: parseInt(item.late) || 0,
            avgDelayDays: parseInt(item.avgDelayDays) || 0
          }));
          console.log('Return Compliance Data:', complianceData);
          setReturnCompliance(complianceData);

          // Keep sample data for user activity
          setUserActivity([
            { user: "Admin A", role: "Admin", logins: 32, lastLogin: "2024-10-20" },
            { user: "Admin B", role: "Admin", logins: 28, lastLogin: "2024-10-21" },
          ]);

          setAdminActivity([
            { admin: "Admin A", approvals: 28, rejections: 3, stockAdds: 10, logins: 15 },
            { admin: "Admin B", approvals: 35, rejections: 1, stockAdds: 7, logins: 17 },
          ]);
        } else {
          setError(result.message || 'Failed to fetch reports data');
        }
      } catch (err) {
        console.error('Error fetching reports:', err);
        setError('Failed to load reports data');
      } finally {
        setLoading(false);
      }
    };

    fetchReportsData();
  }, [startDate, endDate, searchTerm]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isFilterDropdownOpen && !event.target.closest('.filter-dropdown-container')) {
        setIsFilterDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFilterDropdownOpen]);

  // Helper functions
  const getStatusColor = (status) => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-800";
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "Declined":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Filter data based on search and category
  const filteredData = useMemo(() => {
    console.log('Filtering - Borrowed Category:', borrowedCategory, 'Equipment Category:', equipmentCategory, 'Filter Type:', equipmentFilterType);
    
    let expensiveEquipmentFiltered = expensiveEquipment;
    
    // First, filter by category if not "All"
    if (equipmentCategory !== "All") {
      expensiveEquipmentFiltered = expensiveEquipmentFiltered.filter(item => item.category === equipmentCategory);
    }
    
    // Then, handle "by_total" vs "by_item" filter
    if (equipmentFilterType === "by_total") {
      // When "by total" is selected, calculate total = price × count for each item
      expensiveEquipmentFiltered = expensiveEquipmentFiltered.map(item => ({
        ...item,
        displayValue: item.value * (item.count || 1), // Total = price × quantity
        isTotal: true
      }))
      .sort((a, b) => b.displayValue - a.displayValue)
      .slice(0, 15);
    } else {
      // When "by_item" is selected, just sort by value
      expensiveEquipmentFiltered = expensiveEquipmentFiltered
        .sort((a, b) => b.value - a.value)
        .slice(0, 15);
    }
    
    let filtered = {
      equipment: equipmentData,
      monthlyRequests: monthlyRequests,
      topBorrowed: borrowedCategory === "All" 
        ? topBorrowed 
        : topBorrowed.filter(item => item.category === borrowedCategory),
      expensiveEquipment: expensiveEquipmentFiltered,
      userActivity: userActivity,
      returnCompliance: returnCompliance,
      adminActivity: adminActivity,
      transactions: transactions
    };
    
    console.log('Filtered Top Borrowed:', filtered.topBorrowed.length, 'items');
    console.log('Filtered Expensive Equipment:', filtered.expensiveEquipment.length, 'items');

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered.transactions = transactions.filter(t => 
        t.employee.toLowerCase().includes(searchLower) ||
        t.item.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [searchTerm, equipmentData, monthlyRequests, topBorrowed, expensiveEquipment, userActivity, returnCompliance, adminActivity, transactions, borrowedCategory, equipmentCategory, equipmentFilterType]);

  // Export functionality using API endpoint
  const handleExport = () => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (searchTerm) params.append('search', searchTerm);
    
    window.location.href = `/api/reports/export?${params.toString()}`;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <HomeSidebar />

      {/* Main Section */}
      <div className="flex-1 flex flex-col">
        <GlobalHeader title="System Analytics & Reports" />

        {/* Header with Filters */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#2262C6]">System Analytics & Reports</h1>
              <p className="text-sm text-gray-600">Comprehensive system insights and analytics</p>
            </div>
            
            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-[#2262C6] focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-[#2262C6] focus:border-transparent"
              />
            </div>
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-gray-500" />
              <input
                type="text"
                  placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-[#2262C6] focus:border-transparent"
              />
            </div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-[#2262C6] focus:border-transparent"
              >
                <option value="All">All Categories</option>
                <option value="Equipment">Equipment</option>
                <option value="Users">Users</option>
                <option value="Requests">Requests</option>
                <option value="Activity">Activity</option>
              </select>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-[#2262C6] text-white rounded-lg hover:bg-[#1e40af] transition-colors text-sm font-medium"
              >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2262C6]"></div>
              <span className="ml-3 text-gray-600">Loading reports data...</span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              <p className="font-medium">Error loading reports</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

          {/* Summary Cards */}
          {!loading && !error && (
            <>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Package className="h-5 w-5 text-[#2262C6]" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Total Items</div>
                  <div className="text-2xl font-bold text-gray-900">{summary.total_items}</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Package className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Available</div>
                  <div className="text-2xl font-bold text-gray-900">{summary.available_stock}</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Package className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Low Stock</div>
                  <div className="text-2xl font-bold text-gray-900">{summary.low_stock}</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Package className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Out of Stock</div>
                  <div className="text-2xl font-bold text-gray-900">{summary.out_of_stock}</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Total Requests</div>
                  <div className="text-2xl font-bold text-gray-900">{summary.total_requests}</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Users className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Total Users</div>
                  <div className="text-2xl font-bold text-gray-900">{summary.total_users}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Equipment & Inventory Section */}
          {(category === "All" || category === "Equipment") && (
            <section className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <Package className="h-5 w-5 text-[#2262C6]" />
                Equipment & Inventory
              </h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Most Expensive Equipment Chart */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Most Expensive Equipment</h3>
                    <div className="relative filter-dropdown-container">
                      <button
                        onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-[#2262C6] bg-white text-sm font-medium text-gray-700 hover:bg-blue-50 transition-all duration-200 shadow-sm"
                      >
                        <Filter className="h-4 w-4 text-[#2262C6]" />
                        <span>Filter</span>
                        <svg
                          className={`h-4 w-4 text-gray-600 transition-transform duration-200 ${isFilterDropdownOpen ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {isFilterDropdownOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setIsFilterDropdownOpen(false)}
                          ></div>
                          <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-20 overflow-hidden transform transition-all duration-200 ease-out"
                            style={{
                              animation: 'fadeInDown 0.2s ease-out forwards'
                            }}
                          >
                            <div className="p-4 border-b border-gray-200 bg-gray-50">
                              <h4 className="text-sm font-semibold text-gray-800">Filter</h4>
                            </div>
                            
                            <div className="p-4 space-y-4">
                              {/* Type Section */}
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                                  Type
                                </label>
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    onClick={() => setEquipmentFilterType("by_item")}
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                                      equipmentFilterType === "by_item"
                                        ? "bg-[#2262C6] text-white shadow-sm"
                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                    }`}
                                  >
                                    By Item
                                  </button>
                                  <button
                                    onClick={() => setEquipmentFilterType("by_total")}
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                                      equipmentFilterType === "by_total"
                                        ? "bg-[#2262C6] text-white shadow-sm"
                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                    }`}
                                  >
                                    By Total
                                  </button>
                                </div>
                              </div>
                              
                              {/* Category Section */}
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                                  Category
                                </label>
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    onClick={() => setEquipmentCategory("All")}
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                                      equipmentCategory === "All"
                                        ? "bg-[#2262C6] text-white shadow-sm"
                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                    }`}
                                  >
                                    All
                                  </button>
                                  {categories.map((cat) => (
                                    <button
                                      key={cat.id}
                                      onClick={() => setEquipmentCategory(cat.name)}
                                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                                        equipmentCategory === cat.name
                                          ? "bg-[#2262C6] text-white shadow-sm"
                                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                      }`}
                                    >
                                      {cat.name}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
              <div className="h-64 overflow-x-auto">
                <div className="h-full flex items-end justify-start gap-2 min-w-max px-2">
                    {filteredData.expensiveEquipment.length === 0 ? (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <p>No equipment data available</p>
                      </div>
                    ) : (
                      filteredData.expensiveEquipment.map((item, index) => {
                      // Use displayValue when "by_total" is selected, otherwise use value
                      const displayValue = equipmentFilterType === "by_total" && item.displayValue 
                        ? item.displayValue 
                        : item.value;
                      const maxValue = Math.max(...filteredData.expensiveEquipment.map(e => 
                        equipmentFilterType === "by_total" && e.displayValue ? e.displayValue : e.value
                      ), 1);
                      const height = (displayValue / maxValue) * 200;
                      const getColorClass = (value) => {
                        if (value >= 20000) return "bg-red-500";
                        if (value >= 10000) return "bg-orange-500";
                        if (value >= 5000) return "bg-yellow-500";
                        return "bg-[#2262C6]";
                      };
                      
                      // Format display text
                      const displayText = equipmentFilterType === "by_total"
                        ? `₱${(displayValue / 1000).toFixed(0)}k`
                        : `₱${(displayValue / 1000).toFixed(0)}k`;
                      
                      // Tooltip text
                      const tooltipText = equipmentFilterType === "by_total"
                        ? `${item.item}: ₱${displayValue.toLocaleString()} (${item.count || 1} pcs × ₱${item.value.toLocaleString()})`
                        : `${item.item}: ₱${displayValue.toLocaleString()}`;
                      
                      return (
                  <div key={index} className="flex flex-col items-center min-w-[60px] max-w-[80px]">
                    <div
                            className={`${getColorClass(displayValue)} rounded-t w-full mb-2 transition-all duration-500 hover:opacity-80 cursor-pointer`}
                            style={{ height: `${height}px`, minHeight: '4px' }}
                            title={tooltipText}
                    ></div>
                          <span className="text-xs text-gray-600 text-center leading-tight break-words">{item.item}</span>
                          <span className="text-xs font-semibold text-[#2262C6]">{displayText}</span>
                        </div>
                      );
                    })
                    )}
                  </div>
                </div>
                  <div className="mt-4 flex justify-center">
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-red-500 rounded"></div>
                        <span className="text-gray-600">₱20k+</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-orange-500 rounded"></div>
                        <span className="text-gray-600">₱10k-20k</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                        <span className="text-gray-600">₱5k-10k</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-[#2262C6] rounded"></div>
                        <span className="text-gray-600">Under ₱5k</span>
              </div>
                </div>
              </div>
            </div>

                {/* Top Borrowed Items Pie Chart */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Top Borrowed Items</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Category:</span>
                      <select
                        value={borrowedCategory}
                        onChange={(e) => setBorrowedCategory(e.target.value)}
                        className="px-3 py-1 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-[#2262C6] focus:border-transparent bg-white min-w-[120px]"
                      >
                        <option value="All">All</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.name}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
              <div className="flex items-center justify-center h-64">
                {filteredData.topBorrowed.length === 0 ? (
                  <div className="text-center text-gray-400">
                    <p>No borrowed items data available</p>
                    <p className="text-sm mt-2">Transactions will appear here once equipment is borrowed</p>
                  </div>
                ) : (
                <div className="relative w-48 h-48">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="8"
                    />
                    {(() => {
                          const total = filteredData.topBorrowed.reduce((sum, item) => sum + item.borrowed, 0) || 1;
                      let offset = 0;
                          const colors = ['#2262C6', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];
                          
                          return filteredData.topBorrowed.map((item, idx) => {
                            const percentage = Math.round((item.borrowed / total) * 100);
                        const dash = `${percentage * 2.51} ${100 * 2.51}`;
                        const circle = (
                          <circle
                            key={idx}
                            cx="50"
                            cy="50"
                            r="40"
                            fill="none"
                                stroke={colors[idx % colors.length]}
                            strokeWidth="8"
                            strokeDasharray={dash}
                            strokeDashoffset={`-${offset}`}
                          />
                        );
                        offset += percentage * 2.51;
                        return circle;
                      });
                    })()}
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                          <div className="text-2xl font-bold text-gray-900">
                            {filteredData.topBorrowed.reduce((s, i) => s + i.borrowed, 0)}
                          </div>
                          <div className="text-xs text-gray-500">Total Borrowed</div>
                    </div>
                  </div>
                </div>
                )}
              </div>
                  <div className="mt-4 max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                    <div className="space-y-2 pr-2">
                      {filteredData.topBorrowed.map((item, index) => {
                        const colors = ['#2262C6', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];
                        const total = filteredData.topBorrowed.reduce((sum, i) => sum + i.borrowed, 0);
                        const percentage = Math.round((item.borrowed / total) * 100);
                        
                        return (
                          <div key={index} className="flex items-center justify-between py-1">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: colors[index % colors.length] }}
                    ></div>
                              <span className="text-sm text-gray-600 truncate">{item.item}</span>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <span className="text-sm font-semibold text-gray-800">{item.borrowed}</span>
                              <span className="text-xs text-gray-500 ml-1">({percentage}%)</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* System Trends & Compliance Section */}
          {(category === "All" || category === "Users" || category === "Requests") && (
            <section className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#2262C6]" />
                System Trends & Compliance
              </h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Return Compliance */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">Return Compliance</h3>
                  <div className="space-y-3">
                    {filteredData.returnCompliance.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        <p>No return compliance data available</p>
                        <p className="text-sm mt-2">Data will appear once employees borrow and return equipment</p>
                      </div>
                    ) : (
                      filteredData.returnCompliance.map((user, index) => (
                        <div key={index} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-gray-800">{user.user}</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              user.late === 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {user.late === 0 ? 'Compliant' : `${user.late} late`}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            Borrowed: {user.borrowed} | Returned: {user.returned} | Avg Delay: {user.avgDelayDays} days
                          </div>
                        </div>
                      ))
                    )}
                  </div>
            </div>

                {/* Monthly Trends */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">Monthly Request Trends</h3>
              <div className="h-64 relative">
                {filteredData.monthlyRequests.length === 0 ? (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <p>No monthly trend data available</p>
                      <p className="text-sm mt-2">Trends will appear as requests are made</p>
                    </div>
                  </div>
                ) : (
                  <>
                <svg className="w-full h-full" viewBox="0 0 400 200">
                  <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f3f4f6" strokeWidth="1"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                  
                      {/* Requests line */}
                  <polyline
                    fill="none"
                        stroke="#2262C6"
                    strokeWidth="3"
                        points={filteredData.monthlyRequests.map((point, index) => 
                          `${index * 60 + 30},${200 - (point.requests / Math.max(1, Math.max(...filteredData.monthlyRequests.map(p => p.requests)))) * 180}`
                    ).join(' ')}
                  />
                  
                      {/* Approved line */}
                  <polyline
                    fill="none"
                        stroke="#10b981"
                    strokeWidth="3"
                        points={filteredData.monthlyRequests.map((point, index) => 
                          `${index * 60 + 30},${200 - (point.approved / Math.max(1, Math.max(...filteredData.monthlyRequests.map(p => p.approved)))) * 180}`
                    ).join(' ')}
                      />
                      
                  {/* Data point markers */}
                  {filteredData.monthlyRequests.map((point, index) => {
                    const maxRequests = Math.max(1, Math.max(...filteredData.monthlyRequests.map(p => p.requests)));
                    const maxApproved = Math.max(1, Math.max(...filteredData.monthlyRequests.map(p => p.approved)));
                    const requestY = 200 - (point.requests / maxRequests) * 180;
                    const approvedY = 200 - (point.approved / maxApproved) * 180;
                    const x = index * 60 + 30;
                    
                    return (
                      <g key={index}>
                        <circle cx={x} cy={requestY} r="4" fill="#2262C6" />
                        <circle cx={x} cy={approvedY} r="4" fill="#10b981" />
                        <text x={x} y="195" fontSize="10" fill="#6b7280" textAnchor="middle">
                          {point.month ? new Date(point.month + '-01').toLocaleDateString('en-US', { month: 'short' }) : ''}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              
              {/* Legend */}
                    <div className="absolute top-0 right-0 flex gap-4 bg-white/80 backdrop-blur-sm px-3 py-2 rounded-lg">
                <div className="flex items-center gap-2">
                        <div className="w-3 h-0.5 bg-[#2262C6]"></div>
                        <span className="text-xs text-gray-600">Requests</span>
                </div>
                <div className="flex items-center gap-2">
                        <div className="w-3 h-0.5 bg-green-500"></div>
                        <span className="text-xs text-gray-600">Approved</span>
                      </div>
                </div>
                </>
                )}
              </div>
            </div>
          </div>
            </section>
          )}

          {/* Recent Transactions Table */}
          <section className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <Clock className="h-5 w-5 text-[#2262C6]" />
              Recent Transactions
            </h2>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Employee</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Item</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Qty</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Approved By</th>
                  </tr>
                </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredData.transactions.map((transaction, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="py-3 px-4 text-gray-900">{transaction.date}</td>
                        <td className="py-3 px-4 text-gray-900">{transaction.employee}</td>
                        <td className="py-3 px-4 text-gray-900">{transaction.item}</td>
                        <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                          {transaction.status}
                        </span>
                      </td>
                        <td className="py-3 px-4 text-gray-900">{transaction.qty}</td>
                        <td className="py-3 px-4 text-gray-900">{transaction.approvedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          </section>
          </>
          )}
        </main>
      </div>
    </div>
  );
};

export default Reports;