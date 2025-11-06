import React, { useState, useEffect, useRef } from "react";
import { Package, CheckCircle, User } from 'lucide-react';
import HomeSidebar from "./HomeSidebar";
import GlobalHeader from "./components/GlobalHeader";
import api, { transactionService } from './services/api';

const HomePage = () => {
  const [activeView, setActiveView] = useState("Dashboard");
  const [dashboardData, setDashboardData] = useState({
    totalEquipment: 0,
    availableStock: 0,
    currentHolder: 0,
    borrowedCount: 0,
    issuedCount: 0,
    holderDetails: [],
    categories: [],
    newArrivals: [],
    equipmentStats: {
      laptops: 0,
      keyboards: 0,
      monitors: 0,
      mice: 0
    },
    reportStats: {}
  });
  const [loading, setLoading] = useState(true);
  const [scrollY, setScrollY] = useState(0);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    const fetchDashboardData = async (showLoading = true) => {
      try {
        if (showLoading) {
          setLoading(true);
        }
        
        // Fetch categories, equipment data, current holders (transactions), and employees
        const [categoriesRes, equipmentRes, holdersRes, employeesRes] = await Promise.all([
          api.get('/categories'),
          api.get('/equipment?per_page=1000'), // Fetch all equipment without pagination
          transactionService.getAll({ status: 'released' }),
          api.get('/employees') // Fetch employees to get issued equipment data
        ]);

        if (categoriesRes?.data?.success && equipmentRes?.data?.success) {
          const categories = categoriesRes.data.data || [];
          const equipment = equipmentRes.data.data?.data || [];
          const currentHoldersData = holdersRes?.success ? holdersRes.data : [];
          const employeesData = employeesRes?.data?.success ? employeesRes.data.data : [];

          // Calculate statistics
          const totalEquipment = equipment.length;
          const availableStock = equipment.filter(eq => eq.status === 'available').length;
          const borrowedCount = equipment.filter(eq => eq.status === 'borrowed').length;
          const issuedCount = equipment.filter(eq => eq.status === 'issued').length;
          
          // Debug: Log equipment status breakdown
          console.log('Equipment Status Breakdown:', {
            total: totalEquipment,
            available: availableStock,
            borrowed: borrowedCount,
            issued: issuedCount,
            statusCounts: equipment.reduce((acc, eq) => {
              acc[eq.status] = (acc[eq.status] || 0) + 1;
              return acc;
            }, {})
          });
          
          // Count unique employees who are holding equipment (dynamic)
          // Build a map of employees and their equipment (borrowed + issued)
          const holdersMap = new Map();
          
          // Process borrowed equipment from transactions
          equipment.forEach(eq => {
            if (eq.status === 'borrowed') {
              // Try to find the associated transaction/holder info
              const transaction = currentHoldersData.find(t => t.equipment_id === eq.id);
              
              if (transaction) {
                const employeeName = transaction.full_name || transaction.employee_name || 
                                   transaction.name || 'Unknown Holder';
                const employeeId = transaction.employee_id || employeeName;
                const position = transaction.position || 'N/A';
                
                if (!holdersMap.has(employeeId)) {
                  holdersMap.set(employeeId, {
                    employee_id: employeeId,
                    employee_name: employeeName,
                    position: position,
                    equipment: [],
                    borrowedCount: 0,
                    issuedCount: 0
                  });
                }
                
                const holderData = holdersMap.get(employeeId);
                holderData.equipment.push({
                  id: eq.id,
                  name: eq.name || 'Unknown Equipment',
                  category: eq.category?.name || 'Uncategorized',
                  status: eq.status
                });
                holderData.borrowedCount++;
              }
            }
          });
          
          // Process issued equipment from employees
          employeesData.forEach(employee => {
            // Check if employee has issued_item field (JSON string)
            let issuedEquipmentData = [];
            
            if (employee.issued_item) {
              try {
                const parsedIssued = typeof employee.issued_item === 'string' 
                  ? JSON.parse(employee.issued_item) 
                  : employee.issued_item;
                
                if (Array.isArray(parsedIssued) && parsedIssued.length > 0) {
                  console.log('Employee', employee.first_name, 'has issued_item:', parsedIssued);
                  
                  // Get equipment IDs from issued_item
                  const issuedEquipmentIds = parsedIssued.map(item => item.id);
                  
                  // Find matching equipment from the main equipment list
                  // Match by ID regardless of status, since being in issued_item means it's issued
                  const matchedEquipment = equipment.filter(eq => issuedEquipmentIds.includes(eq.id));
                  
                  console.log('Matched equipment for', employee.first_name, ':', matchedEquipment);
                  
                  // If equipment found in main list, use it
                  if (matchedEquipment.length > 0) {
                    issuedEquipmentData = matchedEquipment;
                  } else {
                    // If not found in main equipment list, use data from issued_item JSON
                    issuedEquipmentData = parsedIssued.map(item => ({
                      id: item.id,
                      name: item.name || item.brand || 'Unknown',
                      brand: item.brand,
                      specifications: item.specs,
                      category: { name: 'Uncategorized' },
                      status: 'issued' // Force status to issued since it's in employee's issued_item
                    }));
                  }
                }
              } catch (e) {
                console.error('Error parsing issued_item for employee:', employee.first_name, e);
              }
            }
            
            // Also check issued_equipment array if it exists (from backend relationship)
            if (employee.issued_equipment && Array.isArray(employee.issued_equipment) && employee.issued_equipment.length > 0) {
              console.log('Employee', employee.first_name, 'has issued_equipment array:', employee.issued_equipment);
              // Add equipment from issued_equipment that's not already in issuedEquipmentData
              const existingIds = issuedEquipmentData.map(eq => eq.id);
              const additionalEquipment = employee.issued_equipment.filter(eq => !existingIds.includes(eq.id));
              issuedEquipmentData = [...issuedEquipmentData, ...additionalEquipment];
            }
            
            // Process if employee has any issued equipment
            if (issuedEquipmentData.length > 0) {
              const employeeName = `${employee.first_name} ${employee.last_name}`.trim();
              const employeeId = employee.id;
              const position = employee.position || 'N/A';
              
              console.log('Processing employee:', employeeName, 'with', issuedEquipmentData.length, 'issued equipment items');
              
              if (!holdersMap.has(employeeId)) {
                holdersMap.set(employeeId, {
                  employee_id: employeeId,
                  employee_name: employeeName,
                  position: position,
                  equipment: [],
                  borrowedCount: 0,
                  issuedCount: 0
                });
              }
              
              const holderData = holdersMap.get(employeeId);
              
              // Add issued equipment to the holder's equipment list
              issuedEquipmentData.forEach(eq => {
                console.log('Adding issued equipment:', eq.name || eq.brand, 'to', employeeName);
                holderData.equipment.push({
                  id: eq.id,
                  name: eq.name || eq.brand || 'Unknown Equipment',
                  category: eq.category?.name || eq.category_name || 'Uncategorized',
                  status: 'issued'
                });
                holderData.issuedCount++;
              });
              
              console.log('Final holder data for', employeeName, ':', holderData);
            }
          });
          
          const currentHolder = holdersMap.size;
          const holderDetails = Array.from(holdersMap.values());

          // Calculate equipment type stats with prices
          const equipmentStats = {
            laptops: {
              count: 0,
              totalPrice: 0,
              items: []
            },
            keyboards: {
              count: 0,
              totalPrice: 0,
              items: []
            },
            monitors: {
              count: 0,
              totalPrice: 0,
              items: []
            },
            mice: {
              count: 0,
              totalPrice: 0,
              items: []
            }
          };

          // Process equipment data by type heuristics (legacy)
          equipment.forEach(eq => {
            const price = parseFloat((eq && (eq.purchase_price ?? eq.price)) || 0) || 0;
            const typeSource = (eq?.category?.name || eq?.name || eq?.model || '').toLowerCase();

            if (typeSource.includes('laptop')) {
              equipmentStats.laptops.count++;
              equipmentStats.laptops.totalPrice += price;
              equipmentStats.laptops.items.push(eq);
            } else if (typeSource.includes('keyboard')) {
              equipmentStats.keyboards.count++;
              equipmentStats.keyboards.totalPrice += price;
              equipmentStats.keyboards.items.push(eq);
            } else if (typeSource.includes('monitor')) {
              equipmentStats.monitors.count++;
              equipmentStats.monitors.totalPrice += price;
              equipmentStats.monitors.items.push(eq);
            } else if (typeSource.includes('mouse')) {
              equipmentStats.mice.count++;
              equipmentStats.mice.totalPrice += price;
              equipmentStats.mice.items.push(eq);
            }
          });

          // Build Report Overview stats by category (dynamic)
          const reportStats = {};
          // Tally by existing categories
          categories.forEach(cat => {
            const inCategory = equipment.filter(eq => eq.category_id === cat.id);
            const count = inCategory.length;
            const totalPrice = inCategory.reduce((sum, eq) => sum + (parseFloat((eq && (eq.purchase_price ?? eq.price)) || 0) || 0), 0);
            reportStats[cat.name] = {
              count,
              totalPrice,
              items: inCategory
            };
          });
          // Include Uncategorized bucket
          const uncategorized = equipment.filter(eq => !eq.category_id);
          if (uncategorized.length > 0) {
            const totalPrice = uncategorized.reduce((sum, eq) => sum + (parseFloat((eq && (eq.purchase_price ?? eq.price)) || 0) || 0), 0);
            reportStats['Uncategorized'] = {
              count: uncategorized.length,
              totalPrice,
              items: uncategorized
            };
          }

          // Process categories with equipment counts and status
          const categoriesWithStats = categories.map(cat => {
            const categoryEquipment = equipment.filter(eq => eq.category_id === cat.id);
            const available = categoryEquipment.filter(eq => eq.status === 'available').length;
            const total = categoryEquipment.length;
            const percentage = total > 0 ? Math.round((available / total) * 100) : 0;
            
            return {
              ...cat,
              available,
              total,
              percentage,
              status: percentage >= 50 ? 'good' : percentage >= 20 ? 'warning' : 'low'
            };
          }).filter(cat => cat.total > 0); // Only show categories that have equipment

          // Get recent equipment (last 30 days) - simulate with recent entries
          const recentEquipment = equipment
            .filter(eq => eq.created_at)
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 10);

          // Group recent equipment by category for new arrivals
          const newArrivals = categories.map(cat => {
            const recentInCategory = recentEquipment.filter(eq => eq.category_id === cat.id);
            if (recentInCategory.length > 0) {
              const available = recentInCategory.filter(eq => eq.status === 'available').length;
              return {
                date: new Date(recentInCategory[0].created_at).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: '2-digit', 
                  year: 'numeric' 
                }),
                name: cat.name,
                available,
                qty: recentInCategory.length
              };
            }
            return null;
          }).filter(Boolean).slice(0, 5);

          setDashboardData({
            totalEquipment,
            availableStock,
            currentHolder,
            borrowedCount,
            issuedCount,
            holderDetails,
            categories: categoriesWithStats,
            newArrivals,
            equipmentStats,
            reportStats
          });
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    };

    // Initial fetch
    fetchDashboardData();

    // Set up periodic refresh every 30 seconds for dynamic updates
    const refreshInterval = setInterval(() => {
      fetchDashboardData(false); // Don't show loading spinner on background refresh
    }, 30000); // 30 seconds

    // Listen for equipment updates from other pages (e.g., AddStocks)
    const handleEquipmentUpdate = () => {
      fetchDashboardData(false); // Refresh without loading spinner
    };
    window.addEventListener('equipment:updated', handleEquipmentUpdate);

    // Cleanup interval and event listener on component unmount
    return () => {
      clearInterval(refreshInterval);
      window.removeEventListener('equipment:updated', handleEquipmentUpdate);
    };
  }, []);

  // Handle scroll events for fade-out effect
  useEffect(() => {
    const handleScroll = () => {
      if (scrollContainerRef.current) {
        setScrollY(scrollContainerRef.current.scrollTop);
      }
    };

    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* Sidebar */}
      <HomeSidebar onSelect={(label) => setActiveView(label)} />

      {/* Main Section */}
      <div className="flex-1 flex flex-col">
        <GlobalHeader 
          title="Dashboard"
        />

        {/* Main Content Area */}
        <main className="px-10 pt-3 pb-0 flex-1 overflow-y-auto">
          <h2 className="text-4xl font-bold text-[#2262C6] mb-6">Dashboard</h2>

            {/* Stats Cards - scroll with content initially, then stick at top */}
            <div className="sticky top-0 z-10 bg-white pb-4 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-9 transition-all duration-300">
                <div className="bg-gradient-to-b from-[#0064FF] to-[#003C99] text-white rounded-2xl p-3 shadow flex flex-col h-26">
                  <h4 className="text-xs uppercase tracking-wider opacity-80">Total Number of Equipment</h4>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-2xl font-bold">{loading ? '...' : dashboardData.totalEquipment}</p>
                    <Package className="w-8 h-8 text-white/70" />
                  </div>
                </div>
                <div className="bg-gray-100 rounded-2xl p-3 shadow flex flex-col h-26">
                  <h4 className="text-xs font-semibold text-gray-600">Available stock</h4>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-2xl font-bold text-gray-900">{loading ? '...' : dashboardData.availableStock}</p>
                    <CheckCircle className="w-8 h-8 text-gray-500" />
                  </div>
                </div>
                <div className="bg-gray-100 rounded-2xl p-3 shadow flex flex-col h-26">
                  <h4 className="text-xs font-semibold text-gray-600">Current holder</h4>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-2xl font-bold text-gray-900">{loading ? '...' : dashboardData.currentHolder}</p>
                    <User className="w-8 h-8 text-gray-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* Equipment by Category */}
           <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-4 md:p-5 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Equipment by Category</h3>
              </div>
              <div className="overflow-hidden rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr className="text-left">
                      <th className="py-2.5 px-4 font-semibold">Items</th>
                      <th className="py-2.5 px-4 font-semibold">Available</th>
                      <th className="py-2.5 px-4 font-semibold">Total</th>
                      <th className="py-2.5 px-4 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loading ? (
                      <tr>
                        <td colSpan="4" className="py-4 px-4 text-center text-gray-500">Loading...</td>
                      </tr>
                    ) : dashboardData.categories.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="py-4 px-4 text-center text-gray-500">No categories found</td>
                      </tr>
                    ) : (
                      dashboardData.categories.map((category) => (
                        <tr key={category.id} className="hover:bg-blue-50/40">
                          <td className="py-2.5 px-4">{category.name}</td>
                          <td className="py-2.5 px-4">{category.available}</td>
                          <td className="py-2.5 px-4">{category.total}</td>
                          <td className="py-2.5 px-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              category.status === 'good' 
                                ? 'bg-green-100 text-green-700' 
                                : category.status === 'warning'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {category.percentage === 0 ? 'Unavailable' : `${category.percentage}% Available`}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* New Arrival */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-4 md:p-5 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">New Arrival</h3>
              </div>
              <div className="overflow-hidden rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr className="text-left">
                      <th className="py-2.5 px-4 font-semibold">Date</th>
                      <th className="py-2.5 px-4 font-semibold">Items</th>
                      <th className="py-2.5 px-4 font-semibold">Available</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loading ? (
                      <tr>
                        <td colSpan="4" className="py-4 px-4 text-center text-gray-500">Loading...</td>
                      </tr>
                    ) : dashboardData.newArrivals.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="py-4 px-4 text-center text-gray-500">No recent arrivals</td>
                      </tr>
                    ) : (
                      dashboardData.newArrivals.map((arrival, index) => (
                        <tr key={`${arrival.name}-${index}`} className="hover:bg-blue-50/40">
                          <td className="py-2.5 px-4">{arrival.date}</td>
                          <td className="py-2.5 px-4">{arrival.name}</td>
                          <td className="py-2.5 px-4">{arrival.available}</td>
                          <td className="py-2.5 px-4 text-right">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                              {arrival.qty}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            </div>
            
            {/* Current Holders Table - Dynamic */}
            <div className="mt-6">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-4 md:p-5 transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">Current Holders</h3>
                  <span className="text-sm text-gray-500">{dashboardData.currentHolder} {dashboardData.currentHolder === 1 ? 'Employee' : 'Employees'}</span>
                </div>
                <div className="overflow-hidden rounded-xl border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr className="text-left">
                        <th className="py-2.5 px-4 font-semibold">Employee Name</th>
                        <th className="py-2.5 px-4 font-semibold">Position</th>
                        <th className="py-2.5 px-4 font-semibold">Equipment Held</th>
                        <th className="py-2.5 px-4 font-semibold text-center">Borrowed</th>
                        <th className="py-2.5 px-4 font-semibold text-center">Issued</th>
                        <th className="py-2.5 px-4 font-semibold text-center">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {loading ? (
                        <tr>
                          <td colSpan="6" className="py-4 px-4 text-center text-gray-500">Loading...</td>
                        </tr>
                      ) : dashboardData.holderDetails.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="py-4 px-4 text-center text-gray-500">No current holders</td>
                        </tr>
                      ) : (
                        dashboardData.holderDetails.map((holder, index) => (
                          <tr key={`${holder.employee_id}-${index}`} className="hover:bg-blue-50/40">
                            <td className="py-2.5 px-4 font-medium text-gray-900">{holder.employee_name}</td>
                            <td className="py-2.5 px-4 text-gray-600">{holder.position}</td>
                            <td className="py-2.5 px-4">
                              <div className="flex flex-wrap gap-1">
                                {holder.equipment.slice(0, 3).map((eq, idx) => (
                                  <span 
                                    key={eq.id} 
                                    className={`text-xs px-2 py-0.5 rounded ${
                                      eq.status === 'borrowed' 
                                        ? 'bg-blue-100 text-blue-700' 
                                        : 'bg-orange-100 text-orange-700'
                                    }`}
                                  >
                                    {eq.name}
                                  </span>
                                ))}
                                {holder.equipment.length > 3 && (
                                  <span className="text-xs text-gray-500 px-2 py-0.5">
                                    +{holder.equipment.length - 3} more
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                {holder.borrowedCount}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                                {holder.issuedCount}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                {holder.equipment.length}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            {/* Additional Boxes */}
            <div className="mt-6 mb-0">
              {/* Report Overview */}
              <div className="bg-[#F8FAFF] rounded-2xl border border-gray-100 shadow-sm p-4 md:p-6 transition-all duration-300">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-800">Report Overview</h3>
                </div>
                <div className="mt-4">
                  {/* Header */}
                  <div className="flex items-center justify-end mb-4 px-4">
                    <div className="text-sm font-medium text-gray-600 mr-20">Quantity</div>
                    <div className="text-sm font-medium text-gray-600">Overall Price</div>
                  </div>

                  {/* Equipment Rows */}
                  <div className="space-y-2">
                    {(() => {
                      // Prefer category-driven reportStats; fallback to equipmentStats if empty
                      const stats = (dashboardData.reportStats && Object.keys(dashboardData.reportStats).length > 0)
                        ? dashboardData.reportStats
                        : dashboardData.equipmentStats || {};
                      const entries = Object.entries(stats);
                      if (entries.length === 0) {
                        return (
                          <div className="text-center text-gray-500 text-sm">No data</div>
                        );
                      }
                      const maxCount = Math.max(1, ...entries.map(([_, v]) => (v?.count || 0)));
                      const labelFor = (key) => key;
                      return entries.map(([key, value]) => {
                        const count = value?.count || 0;
                        const total = value?.totalPrice || 0;
                        const widthPct = Math.min(100, Math.round((count / maxCount) * 100));
                        return (
                          <div className="flex items-center" key={key}>
                            <div className="w-32">
                              <span className="text-sm text-gray-700">{labelFor(key)}</span>
                            </div>
                            <div className="flex-1 mx-4">
                              <div className="bg-[#E6EEF9] h-8 rounded-lg relative">
                                <div className="bg-[#2E90FA] h-full rounded-lg" style={{ width: `${widthPct}%` }}></div>
                              </div>
                            </div>
                            <div className="w-20 text-center">
                              <span className="text-sm font-medium text-gray-900">{count}</span>
                            </div>
                            <div className="w-32 text-right text-sm text-gray-600">
                              ₱{Number(total || 0).toLocaleString()}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
              {/* Add Category */}
            </div>
        </main>
      </div>
    </div>
  );
};

export default HomePage;
