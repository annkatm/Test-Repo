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
      } bg-white text-left focus:outline-none transition-all duration-200 hover:shadow-md`}
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
          <div className="h-full w-full bg-gray-200 flex items-center justify-center">
            <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
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
  const [successMessage, setSuccessMessage] = useState('Equipment has been processed successfully.');
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [individualEquipment, setIndividualEquipment] = useState({});
  const [deletingItem, setDeletingItem] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editSerialNumber, setEditSerialNumber] = useState('');
  const [contextMenu, setContextMenu] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedItemDetails, setSelectedItemDetails] = useState(null);
  const [imagePreview, setImagePreview] = useState(null); // { src, alt }

  const toggleExpanded = (itemName) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemName)) {
      newExpanded.delete(itemName);
    } else {
      newExpanded.add(itemName);
    }
    setExpandedItems(newExpanded);
  };

  const handleDeleteClick = (e, item) => {
    e.stopPropagation();
    setDeletingItem(item);
    setShowDeleteConfirm(true);
  };

  const handleEditClick = (e, item) => {
    e.stopPropagation();
    setEditingItem(item);
    setEditSerialNumber(item.serial_number || '');
    setShowEditModal(true);
  };

  const confirmEdit = async () => {
    if (!editingItem) return;

    if (!editSerialNumber.trim()) {
      alert('Serial number cannot be empty');
      return;
    }

    try {
      const response = await api.put(`/equipment/${editingItem.id}`, {
        serial_number: editSerialNumber.trim()
      });
      
      if (response.data.success) {
        await fetchData();
        // Notify other components (e.g., Home dashboard) to refresh
        window.dispatchEvent(new Event('equipment:updated'));
        setSuccessMessage('Serial number updated successfully.');
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
        setShowEditModal(false);
        setEditingItem(null);
        setEditSerialNumber('');
      } else {
        alert(response.data.message || 'Failed to update serial number');
      }
    } catch (error) {
      console.error('Edit error:', error);
      alert(error.response?.data?.message || 'Failed to update serial number');
    }
  };

  const cancelEdit = () => {
    setShowEditModal(false);
    setEditingItem(null);
    setEditSerialNumber('');
  };

  const handleContextMenu = (e, group) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('Context menu triggered for:', group.name); // Debug log
    
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      group: group
    });
  };

  const handleViewDetails = () => {
    if (contextMenu?.group) {
      const items = individualEquipment[contextMenu.group.name] || [];
      if (items.length > 0) {
        const firstItem = items[0];
        // Map category details from categories list
        const category = categories.find(c => c.id === firstItem?.category_id);
        // Resolve images coming from backend naming
        const resolvedItemImage = firstItem?.item_image_url || (firstItem?.item_image ? `/storage/${firstItem.item_image}` : firstItem?.image) || category?.image || null;
        const resolvedReceiptImage = firstItem?.receipt_image_url || (firstItem?.receipt_image ? `/storage/${firstItem.receipt_image}` : firstItem?.receipt) || null;

        const resolvedDescription = firstItem?.description || firstItem?.specifications || firstItem?.notes || category?.description || null;

        setSelectedItemDetails({
          ...contextMenu.group,
          items: items,
          image: resolvedItemImage,
          receipt: resolvedReceiptImage,
          brand: firstItem?.brand || null,
          supplier: firstItem?.supplier || firstItem?.location || null,
          description: resolvedDescription,
          purchase_price: firstItem?.purchase_price || contextMenu.group.price,
          category_id: firstItem?.category_id || null,
          category_name: category?.name || null,
          category_image: category?.image || null,
          category_description: category?.description || null,
          created_at: firstItem?.created_at || null,
          serial_number: firstItem?.serial_number || null,
          model: firstItem?.model || null,
          specifications: firstItem?.specifications || null,
          asset_tag: firstItem?.asset_tag || null,
          condition: firstItem?.condition || null,
          purchase_date: firstItem?.purchase_date || null,
          warranty_expiry: firstItem?.warranty_expiry || null,
          notes: firstItem?.notes || null,
          location: firstItem?.location || null
        });
        setShowDetailsModal(true);
      }
    }
    setContextMenu(null);
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedItemDetails(null);
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    const handleContextMenuGlobal = (e) => {
      if (contextMenu) {
        e.preventDefault();
      }
    };
    
    if (contextMenu) {
      document.addEventListener('click', handleClick);
      document.addEventListener('contextmenu', handleContextMenuGlobal);
      return () => {
        document.removeEventListener('click', handleClick);
        document.removeEventListener('contextmenu', handleContextMenuGlobal);
      };
    }
  }, [contextMenu]);

  const confirmDelete = async () => {
    if (!deletingItem) return;

    try {
      const response = await api.delete(`/equipment/${deletingItem.id}`);
      
      if (response.data.success) {
        await fetchData();
        // Notify other components (e.g., Home dashboard) to refresh
        window.dispatchEvent(new Event('equipment:updated'));
        setSuccessMessage('Equipment has been archived successfully.');
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        alert(response.data.message || 'Failed to delete equipment');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert(error.response?.data?.message || 'Failed to delete equipment');
    } finally {
      setShowDeleteConfirm(false);
      setDeletingItem(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setDeletingItem(null);
  };

  const fetchData = async () => {
    try {
      const catRes = await api.get('/categories');
      if (catRes?.data?.success && Array.isArray(catRes.data.data)) {
        const categoriesData = catRes.data.data;
        setCategories(categoriesData);
        
        // Fetch all equipment without pagination limits
        const eqRes = await api.get('/equipment?per_page=1000');
        if (eqRes?.data?.success && eqRes.data.data && Array.isArray(eqRes.data.data.data)) {
          const equipmentData = eqRes.data.data.data;
          
          const assignedEquipment = equipmentData.filter(eq => eq.category_id);
          
          const categoriesWithCount = categoriesData.map(cat => {
            const categoryEquipment = assignedEquipment.filter(eq => eq.category_id === cat.id);
            const available = categoryEquipment.filter(eq => eq.status === 'available').length;
            const borrowed = categoryEquipment.filter(eq => eq.status === 'borrowed').length;
            const issued = categoryEquipment.filter(eq => eq.status === 'issued').length;
            const total = categoryEquipment.length; // Total count of all equipment in this category
            
            return {
              ...cat,
              qty: `${available}/${total}`, // Show available/total format (e.g., "6/9")
              availableCount: available,
              borrowedCount: borrowed,
              issuedCount: issued,
              totalCount: total
            };
          });
          setCategories(categoriesWithCount);
          setEquipment(assignedEquipment);
          
          const individualData = {};
          assignedEquipment.forEach(eq => {
            const key = eq.name || eq.brand || 'Unknown';
            if (!individualData[key]) {
              individualData[key] = [];
            }
            individualData[key].push(eq);
          });
          setIndividualEquipment(individualData);
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
    
    // Prevent default context menu on the entire page
    const preventDefaultContextMenu = (e) => {
      const target = e.target;
      // Only prevent if clicking on equipment items
      if (target.closest('.equipment-item-row')) {
        e.preventDefault();
      }
    };
    
    document.addEventListener('contextmenu', preventDefaultContextMenu);
    
    return () => {
      window.removeEventListener('categories:updated', handler);
      window.removeEventListener('equipment:updated', handler);
      document.removeEventListener('contextmenu', preventDefaultContextMenu);
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
                      
                      <div className="grid grid-cols-3 gap-4 mb-4 text-gray-700 font-semibold text-sm">
                        <div className="text-left">Items</div>
                        <div className="text-center">Available/Total</div>
                        <div className="text-right">Total Price(₱)</div>
                      </div>
                      
                      <div className="space-y-3">
                        {(() => {
                          const categoryEquipment = equipment.filter(eq => eq.category_id === cat.id);
                          
                          if (categoryEquipment.length === 0) {
                            return <div className="text-gray-400 text-sm">No equipment found for this category.</div>;
                          }

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
                            if (eq.status === 'available' || eq.status === 'borrowed' || eq.status === 'issued') {
                              acc[key].total += 1;
                              if (eq.status === 'available') {
                                acc[key].available += 1;
                              } else if (eq.status === 'borrowed') {
                                acc[key].borrowed += 1;
                              } else if (eq.status === 'issued') {
                                acc[key].issued += 1;
                              }
                            }
                            return acc;
                          }, {});

                          return Object.values(groupedEquipment).map((group, index) => {
                            const isExpanded = expandedItems.has(group.name);
                            const individualItems = individualEquipment[group.name] || [];
                            
                            return (
                              <div key={`${group.name}-${index}`} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                                <div 
                                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors duration-200 grid grid-cols-3 gap-4 items-center equipment-item-row"
                                  onClick={() => toggleExpanded(group.name)}
                                  onContextMenu={(e) => handleContextMenu(e, group)}
                                >
                                  <div className="text-left font-medium text-gray-800">{group.name}</div>
                                  <div className="text-center text-gray-700">{group.available}/{group.total}</div>
                                  <div className="text-right text-gray-800 flex items-center justify-end">
                                    <span>₱{Number(group.price).toFixed(2)}</span>
                                    <svg 
                                      className={`ml-2 h-4 w-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                      fill="none" 
                                      stroke="currentColor" 
                                      viewBox="0 0 24 24"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </div>
                                </div>
                                
                                {isExpanded && (
                                  <div className="border-t border-gray-100 bg-gray-50">
                                    <div className="p-4">
                                      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                                        <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
                                          <div className="grid grid-cols-5 gap-4 text-sm font-semibold text-gray-700">
                                            <div>Serial Number</div>
                                            <div>Status</div>
                                            <div>Date Added</div>
                                            <div>Last Updated</div>
                                            <div className="text-center">Actions</div>
                                          </div>
                                        </div>
                                        
                                        <div className="divide-y divide-gray-200">
                                          {individualItems.map((item, itemIndex) => (
                                            <div key={`${item.id}-${itemIndex}`} className={`px-4 py-3 ${itemIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                              <div className="grid grid-cols-5 gap-4 items-center text-sm">
                                                <div className="font-medium text-gray-900">{item.serial_number || 'N/A'}</div>
                                                <div>
                                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                    item.status === 'available' ? 'bg-green-100 text-green-800' :
                                                    item.status === 'borrowed' ? 'bg-blue-100 text-blue-800' :
                                                    item.status === 'issued' ? 'bg-orange-100 text-orange-800' :
                                                    'bg-gray-100 text-gray-800'
                                                  }`}>
                                                    {item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1).replace('_', ' ') : 'Unknown'}
                                                  </span>
                                                </div>
                                                <div className="text-gray-600">
                                                  {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A'}
                                                </div>
                                                <div className="text-gray-600">
                                                  {item.updated_at ? new Date(item.updated_at).toLocaleDateString() : 'N/A'}
                                                </div>
                                                <div className="flex justify-center space-x-2">
                                                  <button 
                                                    onClick={(e) => handleEditClick(e, item)}
                                                    className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors duration-200"
                                                    title="Edit"
                                                  >
                                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                  </button>
                                                  <button 
                                                    onClick={(e) => handleDeleteClick(e, item)}
                                                    className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors duration-200"
                                                    title="Delete"
                                                  >
                                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                  </button>
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
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
          <div className="relative bg-white rounded-lg shadow-lg p-4 flex items-center max-w-sm w-full mx-4 animate-fade-in">
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

      {/* Context Menu */}
      {contextMenu && (
        <>
          {/* Backdrop to catch clicks */}
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
          />
          <div 
            className="fixed z-50 bg-white rounded-lg shadow-2xl border-2 border-gray-300 py-2 min-w-48 animate-fade-in"
            style={{ 
              left: `${Math.min(contextMenu.x, window.innerWidth - 200)}px`, 
              top: `${Math.min(contextMenu.y, window.innerHeight - 100)}px` 
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleViewDetails}
              className="w-full px-4 py-3 text-left text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center transition-colors"
            >
              <svg className="w-5 h-5 mr-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              View Details
            </button>
          </div>
        </>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedItemDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 lg:p-6">
          <div className="relative bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-y-auto mx-4 sm:mx-6 lg:mx-8" style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)' }}>
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex justify-between items-center z-10">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 truncate pr-4">Equipment Details - {selectedItemDetails.name}</h2>
              <button
                onClick={closeDetailsModal}
                className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-4 sm:p-6">
              {/* Form-like Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6">
                {/* Left Column */}
                <div className="space-y-4">
                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category*</label>
                    <div className="relative">
                      <select 
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                        disabled
                      >
                        <option value="">{selectedItemDetails.category_name || selectedItemDetails.category_id || 'Select a category'}</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Brand */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Brand*</label>
                    <input
                      type="text"
                      value={selectedItemDetails.brand || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                      placeholder="Brand name"
                      disabled
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description*</label>
                    <textarea
                      value={selectedItemDetails.description || selectedItemDetails.category_description || ''}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 resize-none"
                      placeholder="Item description"
                      disabled
                    />
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  {/* Serial Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Serial Number*</label>
                    <input
                      type="text"
                      value={selectedItemDetails.serial_number || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                      placeholder="Serial number"
                      disabled
                    />
                  </div>

                  {/* Supplier */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Supplier*</label>
                    <input
                      type="text"
                      value={selectedItemDetails.supplier || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                      placeholder="Supplier name"
                      disabled
                    />
                  </div>

                  {/* Price */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Price</label>
                    <input
                      type="text"
                      value={`₱ ${Number(selectedItemDetails.purchase_price || selectedItemDetails.price || 0).toFixed(2)}`}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                      disabled
                    />
                  </div>

                  {/* Additional Fields */}
                  {selectedItemDetails.model && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
                      <input
                        type="text"
                        value={selectedItemDetails.model}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                        disabled
                      />
                    </div>
                  )}

                  {selectedItemDetails.asset_tag && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Asset Tag</label>
                      <input
                        type="text"
                        value={selectedItemDetails.asset_tag}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                        disabled
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Image Upload Sections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6">
                {/* Item Image */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Item image</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 text-center bg-gray-50">
                    {selectedItemDetails.image || selectedItemDetails.category_image ? (
                      <div className="space-y-2">
                        <img 
                          src={(selectedItemDetails.image || selectedItemDetails.category_image)}
                          alt={selectedItemDetails.name}
                          className="mx-auto h-24 sm:h-32 w-auto object-contain cursor-zoom-in"
                          onClick={() => setImagePreview({ src: (selectedItemDetails.image || selectedItemDetails.category_image), alt: selectedItemDetails.name })}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/images/placeholder-equipment.png';
                          }}
                        />
                        <p className="text-sm text-gray-600">Current item image</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </div>
                        <p className="text-sm text-gray-600">No image available</p>
                        <p className="text-xs text-gray-500">JPEG, PNG, GIF, WebP up to 5MB</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Receipt Image */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Receipt image</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 text-center bg-gray-50">
                    {selectedItemDetails.receipt ? (
                      <div className="space-y-2">
                        <img 
                          src={selectedItemDetails.receipt}
                          alt="Receipt"
                          className="mx-auto h-24 sm:h-32 w-auto object-contain cursor-zoom-in"
                          onClick={() => setImagePreview({ src: selectedItemDetails.receipt, alt: 'Receipt' })}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.parentElement.innerHTML = '<div class="space-y-2"><div class="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center"><svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></div><p class="text-sm text-gray-600">Receipt not available</p></div>';
                          }}
                        />
                        <p className="text-sm text-gray-600">Current receipt image</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </div>
                        <p className="text-sm text-gray-600">No receipt available</p>
                        <p className="text-xs text-gray-500">JPEG, PNG, GIF, WebP up to 5MB</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Inventory Summary */}
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 sm:p-6 rounded-lg mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Inventory Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm">
                    <p className="text-xs text-gray-600 mb-1">Available</p>
                    <p className="text-xl sm:text-2xl font-bold text-green-600">{selectedItemDetails.available}</p>
                  </div>
                  <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm">
                    <p className="text-xs text-gray-600 mb-1">In Use</p>
                    <p className="text-xl sm:text-2xl font-bold text-blue-600">{selectedItemDetails.inUse}</p>
                  </div>
                  <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm">
                    <p className="text-xs text-gray-600 mb-1">Total</p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">{selectedItemDetails.total}</p>
                  </div>
                  <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm">
                    <p className="text-xs text-gray-600 mb-1">Total Value</p>
                    <p className="text-lg sm:text-xl font-bold text-gray-900">
                      ₱{(Number(selectedItemDetails.purchase_price || selectedItemDetails.price || 0) * selectedItemDetails.total).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Individual Items List */}
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-3">
                  Individual Items ({selectedItemDetails.items.length})
                </h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {selectedItemDetails.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">Serial: {item.serial_number || 'N/A'}</p>
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mt-1 text-sm text-gray-600">
                          <span>Added: {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A'}</span>
                          <span>Updated: {item.updated_at ? new Date(item.updated_at).toLocaleDateString() : 'N/A'}</span>
                        </div>
                      </div>
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
                        item.status === 'available' ? 'bg-green-100 text-green-800' :
                        item.status === 'borrowed' ? 'bg-blue-100 text-blue-800' :
                        item.status === 'issued' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1).replace('_', ' ') : 'Unknown'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox */}
      {imagePreview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/80" onClick={() => setImagePreview(null)} />
          <div className="relative max-w-5xl w-full max-h-[95vh] px-4">
            <button
              onClick={() => setImagePreview(null)}
              className="absolute -top-10 right-6 text-white/80 hover:text-white"
              aria-label="Close preview"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img
              src={imagePreview.src}
              alt={imagePreview.alt || 'Preview'}
              className="mx-auto max-h-[90vh] w-auto object-contain rounded-lg shadow-2xl"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/images/placeholder-equipment.png';
              }}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0" onClick={cancelDelete} />
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-semibold text-gray-900">Archive Equipment</h3>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-3">
                  Are you sure you want to archive this equipment item? This action will move the item to the archive where it can be restored later if needed.
                </p>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <p className="text-sm font-medium text-gray-900">
                    {deletingItem.name || deletingItem.brand || 'Unknown Item'}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Serial: {deletingItem.serial_number || 'N/A'}
                  </p>
                  <p className="text-xs text-gray-600">
                    Status: {deletingItem.status ? deletingItem.status.charAt(0).toUpperCase() + deletingItem.status.slice(1).replace('_', ' ') : 'Unknown'}
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={cancelDelete}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                >
                  Archive
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Serial Number Modal */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0" onClick={cancelEdit} />
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-semibold text-gray-900">Edit Serial Number</h3>
                </div>
              </div>
              
              <div className="mb-6">
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 mb-4">
                  <p className="text-sm font-medium text-gray-900">
                    {editingItem.name || editingItem.brand || 'Unknown Item'}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Current Serial: {editingItem.serial_number || 'N/A'}
                  </p>
                </div>
                
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Serial Number
                </label>
                <input
                  type="text"
                  value={editSerialNumber}
                  onChange={(e) => setEditSerialNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter new serial number"
                  autoFocus
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={cancelEdit}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmEdit}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Save Changes
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