import React, { useState, useEffect, useRef } from "react";
import HomeSidebar from "./HomeSidebar";
import GlobalHeader from "./components/GlobalHeader";
import api from './services/api';

const HomePage = () => {
  const [activeView, setActiveView] = useState("Dashboard");
  const [dashboardData, setDashboardData] = useState({
    totalEquipment: 0,
    availableStock: 0,
    currentHolder: 0,
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
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch categories and equipment data
        const [categoriesRes, equipmentRes] = await Promise.all([
          api.get('/categories'),
          api.get('/equipment')
        ]);

        if (categoriesRes?.data?.success && equipmentRes?.data?.success) {
          const categories = categoriesRes.data.data || [];
          const equipment = equipmentRes.data.data?.data || [];

          // Calculate statistics
          const totalEquipment = equipment.length;
          const availableStock = equipment.filter(eq => eq.status === 'available').length;
          const currentHolder = equipment.filter(eq => eq.status === 'in_use').length;

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
          });

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
            categories: categoriesWithStats,
            newArrivals,
            equipmentStats,
            reportStats
          });
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
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
        <main className="px-10 pt-3 pb-6 flex-1 flex flex-col overflow-hidden">
          {/* Scrollable Content Container */}
          <div 
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto transaction-scrollbar sticky-transition"
            style={{ maxHeight: 'calc(100vh - 200px)' }}
          >
            {/* Labels that fade out on scroll */}
            <div 
              className={`transition-all duration-500 ease-in-out ${
                scrollY > 50 ? 'opacity-0 transform -translate-y-2' : 'opacity-100 transform translate-y-0'
              }`}
            >
              <h2 className="text-4xl font-bold text-[#2262C6] transition-all duration-300">Dashboard</h2>
            </div>

            {/* Stats Cards - scroll with content initially, then stick at top */}
            <div className="sticky top-0 z-10 bg-white pb-4 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-9 transition-all duration-300">
                <div className="bg-gradient-to-b from-[#0064FF] to-[#003C99] text-white rounded-2xl p-3 shadow flex flex-col h-26">
                  <h4 className="text-xs uppercase tracking-wider opacity-80">Total Number of Equipment</h4>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-2xl font-bold">{loading ? '...' : dashboardData.totalEquipment}</p>
                    <div className="w-6 h-6 rounded-full bg-white/30"></div>
                  </div>
                </div>
                <div className="bg-gray-100 rounded-2xl p-3 shadow flex flex-col h-26">
                  <h4 className="text-xs font-semibold text-gray-600">Available stock</h4>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-2xl font-bold text-gray-900">{loading ? '...' : dashboardData.availableStock}</p>
                    <div className="w-6 h-6 rounded-full bg-gray-300"></div>
                  </div>
                </div>
                <div className="bg-gray-100 rounded-2xl p-3 shadow flex flex-col h-26">
                  <h4 className="text-xs font-semibold text-gray-600">Current holder</h4>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-2xl font-bold text-gray-900">{loading ? '...' : dashboardData.currentHolder}</p>
                    <div className="w-6 h-6 rounded-full bg-gray-300"></div>
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
                              {category.percentage === 0 ? '0% Unavailable' : `${category.percentage}% Available`}
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
            
            {/* Additional Boxes */}
            <div className="mt-6 mb-6">
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
                  <div className="space-y-5">
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
          </div>
        </main>
      </div>
    </div>
  );
};

export default HomePage;
