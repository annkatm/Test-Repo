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
  const [borrowedCategory, setBorrowedCategory] = useState("All");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Sample data for comprehensive analytics
  const [summary, setSummary] = useState({ 
    total_items: 89, 
    available_stock: 45, 
    low_stock: 8, 
    out_of_stock: 3,
    total_requests: 156,
    approved_requests: 142,
    pending_requests: 12,
    total_users: 84
  });

  // Equipment inventory data
  const [equipmentData] = useState([
    { category: "Laptop", total: 45, borrowed: 32, available: 13, maintenance: 0 },
    { category: "Printer", total: 12, borrowed: 5, available: 7, maintenance: 0 },
    { category: "Router", total: 8, borrowed: 4, available: 4, maintenance: 0 },
    { category: "Projector", total: 10, borrowed: 7, available: 3, maintenance: 0 },
    { category: "Switch", total: 14, borrowed: 8, available: 6, maintenance: 0 },
  ]);

  // Monthly requests data
  const [monthlyRequests] = useState([
    { month: "2024-06", requests: 45, approved: 35, denied: 5, returned: 30 },
    { month: "2024-07", requests: 60, approved: 50, denied: 4, returned: 47 },
    { month: "2024-08", requests: 55, approved: 42, denied: 6, returned: 40 },
    { month: "2024-09", requests: 70, approved: 65, denied: 3, returned: 58 },
    { month: "2024-10", requests: 62, approved: 54, denied: 5, returned: 46 },
  ]);

  // Top borrowed items
  const [topBorrowed] = useState([
    { item: "HP ProBook 440", borrowed: 22, category: "Laptop" },
    { item: "Lenovo ThinkPad E14", borrowed: 18, category: "Laptop" },
    { item: "MacBook Air M2", borrowed: 16, category: "Laptop" },
    { item: "Epson L3150", borrowed: 15, category: "Printer" },
    { item: "Canon PIXMA", borrowed: 12, category: "Printer" },
    { item: "TP-Link Archer C6", borrowed: 12, category: "Networking" },
    { item: "BenQ MX532", borrowed: 9, category: "Projector" },
    { item: "Epson WorkForce", borrowed: 8, category: "Printer" },
    { item: "Cisco Router", borrowed: 7, category: "Networking" },
    { item: "Dell Monitor", borrowed: 6, category: "Peripherals" },
  ]);

  // Most expensive equipment
  const [expensiveEquipment] = useState([
    { item: "Dell Precision Workstation", value: 25000, category: "Laptop" },
    { item: "MacBook Pro M3 Max", value: 22000, category: "Laptop" },
    { item: "Cisco Catalyst Switch", value: 15000, category: "Networking" },
    { item: "Epson Large Format Printer", value: 12000, category: "Printer" },
    { item: "Sony 4K Projector", value: 8000, category: "Projector" },
    { item: "HP Enterprise Router", value: 5000, category: "Networking" },
    { item: "Canon Professional Camera", value: 4000, category: "Peripherals" },
    { item: "Logitech Conference Camera", value: 3000, category: "Peripherals" },
    { item: "Dell UltraSharp Monitor", value: 2000, category: "Peripherals" },
    { item: "Microsoft Surface Hub", value: 1500, category: "Peripherals" },
  ]);

  // User activity data
  const [userActivity] = useState([
    { user: "Admin A", role: "Admin", logins: 32, lastLogin: "2024-10-20" },
    { user: "Admin B", role: "Admin", logins: 28, lastLogin: "2024-10-21" },
    { user: "Emp_01", role: "Employee", logins: 21, lastLogin: "2024-10-21" },
    { user: "Emp_02", role: "Employee", logins: 20, lastLogin: "2024-10-20" },
  ]);

  // Return compliance data
  const [returnCompliance] = useState([
    { user: "Emp_01", borrowed: 5, returned: 5, late: 0, avgDelayDays: 0 },
    { user: "Emp_02", borrowed: 8, returned: 7, late: 1, avgDelayDays: 2 },
    { user: "Emp_03", borrowed: 6, returned: 4, late: 2, avgDelayDays: 3 },
  ]);

  // Admin activity data
  const [adminActivity] = useState([
    { admin: "Admin A", approvals: 28, rejections: 3, stockAdds: 10, logins: 15 },
    { admin: "Admin B", approvals: 35, rejections: 1, stockAdds: 7, logins: 17 },
    { admin: "Admin C", approvals: 22, rejections: 2, stockAdds: 5, logins: 11 },
  ]);

  // Recent transactions
  const [transactions] = useState([
    { date: "2024-10-21", employee: "John Doe", item: "HP Laptop", status: "Completed", qty: 1, approvedBy: "Admin A" },
    { date: "2024-10-20", employee: "Jane Smith", item: "Epson Printer", status: "Pending", qty: 1, approvedBy: "-" },
    { date: "2024-10-19", employee: "Mike Johnson", item: "Router", status: "Completed", qty: 1, approvedBy: "Admin B" },
    { date: "2024-10-18", employee: "Sarah Wilson", item: "Projector", status: "Declined", qty: 1, approvedBy: "Admin C" },
  ]);

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
    let filtered = {
      equipment: equipmentData,
      monthlyRequests: monthlyRequests,
      topBorrowed: borrowedCategory === "All" 
        ? topBorrowed 
        : topBorrowed.filter(item => item.category === borrowedCategory),
      expensiveEquipment: equipmentCategory === "All" 
        ? expensiveEquipment 
        : expensiveEquipment.filter(item => item.category === equipmentCategory),
      userActivity: userActivity,
      returnCompliance: returnCompliance,
      adminActivity: adminActivity,
      transactions: transactions
    };

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered.transactions = transactions.filter(t => 
        t.employee.toLowerCase().includes(searchLower) ||
        t.item.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [searchTerm, equipmentData, monthlyRequests, topBorrowed, userActivity, returnCompliance, adminActivity, transactions]);

  // Export functionality
  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Date,Employee,Item,Status,Quantity,Approved By\n" +
      transactions.map(t => `${t.date},${t.employee},${t.item},${t.status},${t.qty},${t.approvedBy}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "reports-data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
          {/* Summary Cards */}
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
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Category:</span>
                      <select
                        value={equipmentCategory}
                        onChange={(e) => setEquipmentCategory(e.target.value)}
                        className="px-3 py-1 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-[#2262C6] focus:border-transparent bg-white min-w-[120px]"
                      >
                        <option value="All">All</option>
                        <option value="Laptop">Laptop</option>
                        <option value="Networking">Networking</option>
                        <option value="Printer">Printer</option>
                        <option value="Projector">Projector</option>
                        <option value="Peripherals">Peripherals</option>
                      </select>
                    </div>
                  </div>
              <div className="h-64 flex items-end justify-between gap-2">
                    {filteredData.expensiveEquipment.map((item, index) => {
                      const maxValue = Math.max(...filteredData.expensiveEquipment.map(e => e.value));
                      const height = (item.value / maxValue) * 200;
                      const getColorClass = (value) => {
                        if (value >= 20000) return "bg-red-500";
                        if (value >= 10000) return "bg-orange-500";
                        if (value >= 5000) return "bg-yellow-500";
                        return "bg-[#2262C6]";
                      };
                      
                      return (
                  <div key={index} className="flex flex-col items-center flex-1">
                    <div
                            className={`${getColorClass(item.value)} rounded-t w-full mb-2 transition-all duration-500 hover:opacity-80`}
                            style={{ height: `${height}px` }}
                            title={`$${item.value.toLocaleString()}`}
                    ></div>
                          <span className="text-xs text-gray-600 text-center leading-tight">{item.item}</span>
                          <span className="text-xs font-semibold text-[#2262C6]">${(item.value / 1000).toFixed(0)}k</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 flex justify-center">
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-red-500 rounded"></div>
                        <span className="text-gray-600">$20k+</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-orange-500 rounded"></div>
                        <span className="text-gray-600">$10k-20k</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                        <span className="text-gray-600">$5k-10k</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-[#2262C6] rounded"></div>
                        <span className="text-gray-600">Under $5k</span>
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
                        <option value="Laptop">Laptop</option>
                        <option value="Networking">Networking</option>
                        <option value="Printer">Printer</option>
                        <option value="Projector">Projector</option>
                        <option value="Peripherals">Peripherals</option>
                      </select>
                    </div>
                  </div>
              <div className="flex items-center justify-center h-64">
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
                    {filteredData.returnCompliance.map((user, index) => (
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
                ))}
              </div>
            </div>

                {/* Monthly Trends */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">Monthly Request Trends</h3>
              <div className="h-64 relative">
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
                </svg>
              
              {/* Legend */}
                    <div className="absolute bottom-0 left-0 flex gap-4">
                <div className="flex items-center gap-2">
                        <div className="w-3 h-0.5 bg-[#2262C6]"></div>
                        <span className="text-xs text-gray-600">Requests</span>
                </div>
                <div className="flex items-center gap-2">
                        <div className="w-3 h-0.5 bg-green-500"></div>
                        <span className="text-xs text-gray-600">Approved</span>
                      </div>
                </div>
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
        </main>
      </div>
    </div>
  );
};

export default Reports;
