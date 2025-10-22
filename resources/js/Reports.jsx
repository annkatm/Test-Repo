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
    { item: "HP ProBook 440", borrowed: 22 },
    { item: "Lenovo ThinkPad E14", borrowed: 18 },
    { item: "Epson L3150", borrowed: 15 },
    { item: "TP-Link Archer C6", borrowed: 12 },
    { item: "BenQ MX532", borrowed: 9 },
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
      topBorrowed: topBorrowed,
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
                {/* Equipment Usage Chart */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">Equipment Usage by Category</h3>
                  <div className="h-64 flex items-end justify-between gap-2">
                    {filteredData.equipment.map((item, index) => (
                      <div key={index} className="flex flex-col items-center flex-1">
                        <div
                          className="bg-[#2262C6] rounded-t w-full mb-2 transition-all duration-500 hover:bg-[#1e40af]"
                          style={{ height: `${(item.borrowed / Math.max(1, Math.max(...filteredData.equipment.map(e => e.borrowed)))) * 200}px` }}
                        ></div>
                        <span className="text-xs text-gray-600 text-center">{item.category}</span>
                        <span className="text-xs font-semibold">{item.borrowed}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Borrowed Items */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">Top Borrowed Items</h3>
                  <div className="space-y-3">
                    {filteredData.topBorrowed.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-[#2262C6] text-white rounded-full flex items-center justify-center text-sm font-semibold">
                            {index + 1}
                          </div>
                          <span className="font-medium text-gray-800">{item.item}</span>
                        </div>
                        <span className="text-[#2262C6] font-semibold">{item.borrowed}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Users & Activity Section */}
          {(category === "All" || category === "Users") && (
            <section className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <Users className="h-5 w-5 text-[#2262C6]" />
                Users & Activity
              </h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* User Activity */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">User Login Activity</h3>
                  <div className="space-y-3">
                    {filteredData.userActivity.map((user, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-800">{user.user}</div>
                          <div className="text-sm text-gray-500">{user.role}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[#2262C6] font-semibold">{user.logins} logins</div>
                          <div className="text-xs text-gray-500">{user.lastLogin}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

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
              </div>
            </section>
          )}

          {/* Requests & Trends Section */}
          {(category === "All" || category === "Requests") && (
            <section className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#2262C6]" />
                Requests & Trends
              </h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

                {/* Admin Activity */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">Admin Activity</h3>
                  <div className="space-y-3">
                    {filteredData.adminActivity.map((admin, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg">
                        <div className="font-medium text-gray-800 mb-2">{admin.admin}</div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Approvals:</span>
                            <span className="text-green-600 font-semibold">{admin.approvals}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Rejections:</span>
                            <span className="text-red-600 font-semibold">{admin.rejections}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Stock Adds:</span>
                            <span className="text-blue-600 font-semibold">{admin.stockAdds}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Logins:</span>
                            <span className="text-gray-800 font-semibold">{admin.logins}</span>
                          </div>
                        </div>
                      </div>
                    ))}
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
