import React, { useState, useEffect } from 'react';
import HomeSidebar from './HomeSidebar';
import GlobalHeader from './components/GlobalHeader';
import api from './services/api';

const Card = ({ selected, name, qty, image, onClick }) => {
  return (
    <button 
      onClick={onClick} 
      className={`relative h-56 w-64 rounded-xl overflow-hidden shadow-sm border ${
        selected ? 'border-blue-500' : 'border-gray-200'
      } bg-white text-left focus:outline-none`}
    > 
      <div className="absolute inset-0 overflow-hidden">
        {image ? (
          <img
            src={image.startsWith('http') ? image : image.startsWith('/storage') ? image : `/storage/${image}`}
            alt={name}
            className="h-full w-full object-cover"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/images/placeholder-equipment.png';
            }}
          />
        ) : (
          <div className="h-full w-full bg-gray-200" />
        )}
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-b from-transparent to-[#2262C6]" />
      <div className="absolute bottom-0 left-0 right-0 px-4 py-3 flex items-center justify-between">
        <span className="text-xs font-semibold text-white uppercase">{name}</span>
        <span className="text-xs text-white font-medium">{qty}</span>
      </div>
    </button>
  );
};

const Equipment = () => {
  const [selected, setSelected] = useState(null);
  const [categories, setCategories] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [stockData, setStockData] = useState({});

  const toggleItemExpansion = (itemName) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemName)) {
      newExpanded.delete(itemName);
    } else {
      newExpanded.add(itemName);
    }
    setExpandedItems(newExpanded);
  };

  const getStockDataForItem = (itemName, categoryId) => {
    // Filter equipment for this specific item and category
    return equipment.filter(eq => 
      eq.category_id === categoryId && 
      (eq.name === itemName || eq.brand === itemName) &&
      (eq.status === 'available' || eq.status === 'in_use')
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return 'text-green-600 bg-green-50';
      case 'in_use': return 'text-orange-600 bg-orange-50';
      case 'borrowed': return 'text-orange-600 bg-orange-50';
      case 'issued': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'available': return 'Available';
      case 'in_use': return 'Borrowed';
      case 'borrowed': return 'Borrowed';
      case 'issued': return 'Issued';
      default: return status;
    }
  };

  const fetchData = async () => {
      try {
        // Fetch categories first
        const catRes = await api.get('/categories');
        if (catRes?.data?.success && Array.isArray(catRes.data.data)) {
          const categoriesData = catRes.data.data;
          setCategories(categoriesData);
          
          // Then fetch equipment
          const eqRes = await api.get('/equipment');
          if (eqRes?.data?.success && eqRes.data.data && Array.isArray(eqRes.data.data.data)) {
            const equipmentData = eqRes.data.data.data;
            
            // Separate assigned and unassigned equipment
            const assignedEquipment = equipmentData.filter(eq => eq.category_id);
            const unassignedEquipment = equipmentData.filter(eq => !eq.category_id);
            
            // Update categories with dynamic available/total counts
            const categoriesWithCount = categoriesData.map(cat => {
              const categoryEquipment = assignedEquipment.filter(eq => eq.category_id === cat.id);
              const available = categoryEquipment.filter(eq => eq.status === 'available').length;
              const inUse = categoryEquipment.filter(eq => eq.status === 'in_use').length;
              const total = available + inUse; // Only count available and in_use equipment
              return {
                ...cat,
                qty: `${available}/${total}`,
                availableCount: available,
                inUseCount: inUse,
                totalCount: total
              };
            });
            setCategories(categoriesWithCount);
            setEquipment(assignedEquipment);
          }
        }
      } catch (e) {
        console.error('Failed to fetch categories/equipment:', e);
      }
  };

  useEffect(() => {
    fetchData();
    const handler = () => fetchData();
    window.addEventListener('categories:updated', handler);
    window.addEventListener('equipment:updated', handler);
    return () => {
      window.removeEventListener('categories:updated', handler);
      window.removeEventListener('equipment:updated', handler);
    };
  }, []);

  return (
    <div className="h-screen overflow-hidden bg-white flex">
      <HomeSidebar />
      <div className="flex-1 flex flex-col">
        <GlobalHeader title="Equipment" />
        
        <main className="px-10 py-6 mb-10 flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto">
            <h2 className="text-3xl font-bold text-blue-600">Equipment</h2>
            {!selected && (
              <>
                <h3 className="text-base font-semibold text-gray-700 mt-3">Categories</h3>
                <div className="mt-6 grid grid-cols-4 gap-6">
                  {categories.map((cat) => (
                    <div key={cat.id}>
                      <Card
                        selected={selected === cat.name}
                        name={cat.name}
                        qty={cat.qty || '0/0'}
                        image={cat.image}
                        onClick={() => setSelected(cat.name)}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}
            {selected && (
              <>
                <div className="mt-3">
                  <button 
                    onClick={() => setSelected(null)} 
                    className="mb-4 flex items-center text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className="h-5 w-5 mr-1" 
                      viewBox="0 0 20 20" 
                      fill="currentColor"
                    >
                      <path 
                        fillRule="evenodd" 
                        d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" 
                        clipRule="evenodd" 
                      />
                    </svg>
                    <span>Back</span>
                  </button>
                </div>
                <div className="mt-6 flex flex-col items-start w-full">
                  {categories.filter(cat => cat.name === selected).map(cat => (
                    <div key={cat.id} className="w-full">
                      <div className="mb-6 text-2xl font-semibold text-gray-800">Inventory / {selected}</div>
                      
                      {/* Column Headers */}
                      <div className="grid grid-cols-3 gap-4 mb-4 text-gray-700 font-semibold text-sm">
                        <div className="text-left">Items</div>
                        <div className="text-center">Available/Total</div>
                        <div className="text-right">Total Price(₱)</div>
                      </div>
                      
                      {/* Equipment List */}
                      <div className="space-y-3">
                        {(() => {
                          const categoryEquipment = equipment.filter(eq => eq.category_id === cat.id && !(eq.name === 'Lenovo' && eq.serial_number === '87123qwe'));
                          
                          if (categoryEquipment.length === 0) {
                            return <div className="text-gray-400 text-sm">No equipment found for this category.</div>;
                          }

                          // Group equipment by name/brand to show aggregated counts
                          const groupedEquipment = categoryEquipment.reduce((acc, eq) => {
                            const key = eq.name || eq.brand || 'Unknown';
                            if (!acc[key]) {
                              acc[key] = {
                                name: key,
                                total: 0,
                                available: 0,
                                inUse: 0,
                                price: eq.purchase_price || 0
                              };
                            }
                            // Only count available and in_use equipment
                            if (eq.status === 'available' || eq.status === 'in_use') {
                              acc[key].total += 1;
                              if (eq.status === 'available') {
                                acc[key].available += 1;
                              } else if (eq.status === 'in_use') {
                                acc[key].inUse += 1;
                              }
                            }
                            return acc;
                          }, {});

                          return Object.values(groupedEquipment).map((group, index) => {
                            const isExpanded = expandedItems.has(group.name);
                            const stockItems = getStockDataForItem(group.name, cat.id);
                            
                            return (
                              <div key={`${group.name}-${index}`} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                                {/* Clickable Item Row */}
                                <div 
                                  className="grid grid-cols-3 gap-4 items-center p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                                  onClick={() => toggleItemExpansion(group.name)}
                                >
                                  <div className="text-left font-medium text-gray-800 flex items-center">
                                    {group.name}
                                    <svg 
                                      className={`ml-2 h-4 w-4 text-gray-400 transition-transform duration-200 ${
                                        isExpanded ? 'rotate-180' : ''
                                      }`}
                                      fill="none" 
                                      stroke="currentColor" 
                                      viewBox="0 0 24 24"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </div>
                                  <div className="text-center text-gray-700">{group.available}/{group.total}</div>
                                  <div className="text-right text-gray-800">₱{Number(group.price).toFixed(2)}</div>
                                </div>
                                
                                {/* Expandable Stock Details */}
                                <div className={`transition-all duration-300 ease-in-out ${
                                  isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                                } overflow-hidden`}>
                                  <div className="border-t border-gray-100 bg-gray-50">
                                    <div className="p-4">
                                      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                                        {/* Stock Table Header */}
                                        <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
                                          <div className="grid grid-cols-5 gap-4 text-sm font-semibold text-gray-700">
                                            <div>Serial Number</div>
                                            <div>Status</div>
                                            <div>Date Added</div>
                                            <div>Last Updated</div>
                                            <div className="text-center">Actions</div>
                                          </div>
                                        </div>
                                        
                                        {/* Stock Table Body */}
                                        <div className="divide-y divide-gray-200">
                                          {stockItems.length > 0 ? (
                                            stockItems.map((stock, stockIndex) => (
                                              <div 
                                                key={stock.id || stockIndex} 
                                                className={`px-4 py-3 ${
                                                  stockIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                                }`}
                                              >
                                                <div className="grid grid-cols-5 gap-4 items-center text-sm">
                                                  <div className="font-medium text-gray-900">
                                                    {stock.serial_number || 'N/A'}
                                                  </div>
                                                  <div>
                                                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(stock.status)}`}>
                                                      {getStatusText(stock.status)}
                                                    </span>
                                                  </div>
                                                  <div className="text-gray-600">
                                                    {stock.created_at ? new Date(stock.created_at).toLocaleDateString() : 'N/A'}
                                                  </div>
                                                  <div className="text-gray-600">
                                                    {stock.updated_at ? new Date(stock.updated_at).toLocaleDateString() : 'N/A'}
                                                  </div>
                                                  <div className="flex justify-center space-x-2">
                                                    <button 
                                                      className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                                                      title="Edit"
                                                    >
                                                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                      </svg>
                                                    </button>
                                                    <button 
                                                      className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                                                      title="Delete"
                                                    >
                                                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                      </svg>
                                                    </button>
                                                  </div>
                                                </div>
                                              </div>
                                            ))
                                          ) : (
                                            <div className="px-4 py-8 text-center text-gray-500 text-sm">
                                              No stock items found for this equipment.
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {/* Success Popup */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0" onClick={() => setShowSuccess(false)} />
          <div className="relative bg-white rounded-lg shadow-md p-4 flex items-center max-w-sm w-full mx-4">
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
                <p className="mt-1 text-sm text-gray-500">Equipment has been added successfully.</p>
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
  );
};

export default Equipment;