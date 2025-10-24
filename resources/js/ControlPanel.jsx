import React from "react";
import FileUploadWidget from "./components/FileUploadWidget";
import { UserCog } from "lucide-react";
import api from './services/api';
import HomeSidebar from "./HomeSidebar";
import GlobalHeader from "./components/GlobalHeader";

const ControlPanel = () => {
  // Page-level data only (cards)

  const controlPanelCards = [
 
    { id: 1, title: 'Position', subtitle: 'Manage', icon: UserCog },
    { id: 2, title: 'Equipment Categories', subtitle: 'Manage', icon: UserCog },
    { id: 3, title: 'Department', subtitle: 'Manage', icon: UserCog },
    { id: 4, title: 'Client', subtitle: 'Manage', icon: UserCog },
    { id: 5, title: 'Employee Type', subtitle: 'Manage', icon: UserCog },
  ];

  const [showCategoryModal, setShowCategoryModal] = React.useState(false);
  const [catName, setCatName] = React.useState('');
  const [catDesc, setCatDesc] = React.useState('');
  const [catImage, setCatImage] = React.useState(null);
  const [catError, setCatError] = React.useState('');
  const [catLoading, setCatLoading] = React.useState(false);
  const [showSuccess, setShowSuccess] = React.useState(false);
  const [categoryItems, setCategoryItems] = React.useState([]);
  const [showExisting, setShowExisting] = React.useState(true);

  // Generic dropdown management states
  const [activeModal, setActiveModal] = React.useState(null);
  const [dropdownItems, setDropdownItems] = React.useState({
    positions: [],
    departments: [],
    clients: [],
    employeeTypes: []
  });
  const [newItemName, setNewItemName] = React.useState('');
  const [itemError, setItemError] = React.useState('');
  const [itemLoading, setItemLoading] = React.useState(false);

  const handleCardClick = async (card) => {
    if (card.title === 'Equipment Categories') {
      // Load categories before opening modal
      try {
        const res = await api.get('/categories');
        if (res?.data?.success && Array.isArray(res.data.data)) {
          setCategoryItems(res.data.data.map(c => ({ id: c.id, name: c.name })));
        } else {
          setCategoryItems([]);
        }
      } catch (e) {
        setCategoryItems([]);
      }
      setShowCategoryModal(true);
    } else {
      // Handle other dropdown management cards
      const modalType = card.title.toLowerCase().replace(' ', '');
      setActiveModal(modalType);
      await loadDropdownItems(modalType);
    }
  };

  const loadDropdownItems = async (type) => {
    try {
      const endpoint = getEndpointForType(type);
      const res = await api.get(endpoint);
      if (res?.data?.success && Array.isArray(res.data.data)) {
        setDropdownItems(prev => ({
          ...prev,
          [type]: res.data.data.map(item => ({ id: item.id, name: item.name }))
        }));
      }
    } catch (e) {
      console.error(`Failed to load ${type}:`, e);
    }
  };

  const getEndpointForType = (type) => {
    const endpoints = {
      'position': '/positions',
      'department': '/departments', 
      'client': '/clients',
      'employee type': '/employee-types'
    };
    return endpoints[type] || '/items';
  };

  const getDisplayName = (type) => {
    const displayNames = {
      'position': 'Position',
      'department': 'Department', 
      'client': 'Client',
      'employee type': 'Employee Type'
    };
    return displayNames[type] || type;
  };

  const addNewItem = async () => {
    if (!newItemName.trim()) {
      setItemError('Name is required');
      return;
    }

    setItemLoading(true);
    setItemError('');
    
    try {
      const endpoint = getEndpointForType(activeModal);
      const res = await api.post(endpoint, { name: newItemName.trim() });
      
      if (res?.data?.success) {
        setNewItemName('');
        await loadDropdownItems(activeModal);
        // Notify other components
        window.dispatchEvent(new CustomEvent(`${activeModal}:updated`));
      } else {
        setItemError(res?.data?.message || 'Failed to add item');
      }
    } catch (e) {
      setItemError('Failed to add item');
    } finally {
      setItemLoading(false);
    }
  };

  const removeItem = async (idx) => {
    const item = dropdownItems[activeModal][idx];
    if (!item) return;

    try {
      const endpoint = getEndpointForType(activeModal);
      await api.delete(`${endpoint}/${item.id}`);
      await loadDropdownItems(activeModal);
      // Notify other components
      window.dispatchEvent(new CustomEvent(`${activeModal}:updated`));
    } catch (e) {
      setItemError('Failed to delete item');
    }
  };

  const closeGenericModal = () => {
    setActiveModal(null);
    setNewItemName('');
    setItemError('');
  };

  const removeCategoryItem = async (idx) => {
    const item = categoryItems[idx];
    if (!item) return;
    try {
      await api.delete(`/categories/${item.id}`);
      setCategoryItems(prev => prev.filter((_, i) => i !== idx));
      // notify other screens (e.g., Equipment) to refresh
      window.dispatchEvent(new CustomEvent('categories:updated'));
    } catch (e) {
      setCatError('Failed to delete category');
    }
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    setCatError('');
    
    // Validate all required fields
    if (!catName.trim()) {
      setCatError('Category name is required.');
      return;
    }
    if (!catImage) {
      setCatError('Category image is required.');
      return;
    }
    
    setCatLoading(true);
    try {
      const form = new FormData();
      form.append('name', catName.trim());
      form.append('description', catDesc.trim());
      form.append('image', catImage);
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content },
        body: form
      });
      const contentType = res.headers.get('content-type');
      let data;
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        // Try to get text (likely HTML error page)
        const text = await res.text();
        setCatError('Server error: Unexpected response format.');
        return;
      }
      if (data.success) {
        setShowCategoryModal(false);
        setCatName(''); setCatDesc(''); setCatImage(null); setCatError('');
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000); // Hide after 3 seconds
      } else {
        // Show detailed validation errors if present
        if (data.errors) {
          const errorMessages = Object.values(data.errors).flat().join(' ');
          setCatError(errorMessages || data.message || 'Failed to add category');
        } else {
          setCatError(data.message || 'Failed to add category');
        }
      }
    } catch (err) {
      setCatError('Error: ' + (err.message || 'Unknown'));
    } finally {
      setCatLoading(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-white flex">
      <HomeSidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <GlobalHeader title="Control Panel" />
        
        {/* Main Content Area */}
        <main className="px-10 py-6 flex-1 overflow-y-auto">
          {/* Page Title */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-[#2262C6] mb-2">Control Panel</h1>
            <p className="text-gray-500 text-lg">Control Panel</p>
          </div>

          {/* Control Panel Cards */}
          <div className="grid grid-cols-3 gap-6 max-w-4xl">
            {controlPanelCards.map((card, index) => (
              <div
                key={card.id}
                className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                style={{ boxShadow: '0 2px 8px rgba(29, 78, 216, 0.4)' }}
                onClick={() => handleCardClick(card)}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <card.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-lg font-semibold text-blue-600 mb-1">
                      {card.title}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {card.subtitle}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Category Modal */
          }
          {showCategoryModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/30" onClick={() => setShowCategoryModal(false)} />
              <div className="relative bg-white rounded-2xl shadow-2xl w-[460px] max-w-[95vw] p-8 border border-blue-100" style={{ boxShadow: '0 8px 32px rgba(29, 78, 216, 0.35)' }}>
                <h3 className="text-lg font-bold text-blue-600 text-center mb-6">Add Category</h3>
                <form onSubmit={handleCategorySubmit}>
                  <div className="mb-4">
                    <label className="block text-[12px] text-gray-600 mb-1">Name*</label>
                    <input type="text" value={catName} onChange={e => setCatName(e.target.value)} className="w-full px-3 py-2 rounded-md bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                  </div>
                  <div className="mb-4">
                    <label className="block text-[12px] text-gray-600 mb-1">Description</label>
                    <input type="text" value={catDesc} onChange={e => setCatDesc(e.target.value)} className="w-full px-3 py-2 rounded-md bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>

                  {/* Existing Categories header with toggle */}
                  <div className="mb-2 flex items-center justify-between">
                    <span className="block text-[12px] text-gray-600">Existing Categories</span>
                    <button
                      type="button"
                      onClick={() => setShowExisting(v => !v)}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      {showExisting ? 'Hide' : 'Show'}
                    </button>
                  </div>

                  {/* Visual category list */}
                  {showExisting && (
                  <div className="mb-5">
                    <div className="w-full rounded-xl border border-blue-100 bg-white shadow-[0_6px_16px_rgba(29,78,216,0.15)]">
                      <div className="max-h-40 overflow-y-auto divide-y divide-gray-100">
                        {categoryItems.map((item, idx) => (
                          <div key={item.id ?? idx} className="flex items-center justify-between px-4 py-2 text-sm hover:bg-blue-50">
                            <span className="text-gray-700">{item.name}</span>
                            <button type="button" onClick={() => removeCategoryItem(idx)} className="text-red-500 hover:text-red-600">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M6 7h12l-1 12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 7Zm3-3h6l1 2H8l1-2Z"/></svg>
                            </button>
                          </div>
                        ))}
                        {categoryItems.length === 0 && (
                          <div className="px-4 py-3 text-sm text-gray-400">No categories yet.</div>
                        )}
                      </div>
                    </div>
                  </div>
                  )}
                  <FileUploadWidget
                    label="Image"
                    onFileSelect={file => setCatImage(file)}
                    error="Category image is required."
                    required={true}
                  />
                  {catError && <div className="mb-2 text-xs text-red-600">{catError}</div>}
                  <div className="flex justify-end mt-6 space-x-2">
                    <button type="button" className="px-4 py-2 rounded bg-gray-200 text-gray-700" onClick={() => setShowCategoryModal(false)}>Cancel</button>
                    <button type="submit" disabled={catLoading} className="px-5 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">
                      {catLoading ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Generic Dropdown Management Modal */}
          {activeModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/30" onClick={closeGenericModal} />
              <div className="relative bg-white rounded-2xl shadow-2xl w-[460px] max-w-[95vw] p-8 border border-blue-100" style={{ boxShadow: '0 8px 32px rgba(29, 78, 216, 0.35)' }}>
                <h3 className="text-lg font-bold text-blue-600 text-center mb-6">Manage {getDisplayName(activeModal)}</h3>
                
                {/* Add new item */}
                <div className="mb-4">
                  <label className="block text-[12px] text-gray-600 mb-1">Add New {getDisplayName(activeModal)}</label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-md bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={`Enter ${getDisplayName(activeModal).toLowerCase()} name`}
                    />
                    <button
                      type="button"
                      onClick={addNewItem}
                      disabled={itemLoading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {itemLoading ? 'Adding...' : 'Add'}
                    </button>
                  </div>
                </div>

                {/* Existing items list */}
                <div className="mb-2 flex items-center justify-between">
                  <span className="block text-[12px] text-gray-600">Existing {getDisplayName(activeModal)}</span>
                </div>
                
                <div className="mb-5">
                  <div className="w-full rounded-xl border border-blue-100 bg-white shadow-[0_6px_16px_rgba(29,78,216,0.15)]">
                    <div className="max-h-40 overflow-y-auto divide-y divide-gray-100">
                      {dropdownItems[activeModal]?.map((item, idx) => (
                        <div key={item.id ?? idx} className="flex items-center justify-between px-4 py-2 text-sm hover:bg-blue-50">
                          <span className="text-gray-700">{item.name}</span>
                          <button type="button" onClick={() => removeItem(idx)} className="text-red-500 hover:text-red-600">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M6 7h12l-1 12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 7Zm3-3h6l1 2H8l1-2Z"/></svg>
                          </button>
                        </div>
                      ))}
                      {(!dropdownItems[activeModal] || dropdownItems[activeModal].length === 0) && (
                        <div className="px-4 py-3 text-sm text-gray-400">No {activeModal} yet.</div>
                      )}
                    </div>
                  </div>
                </div>

                {itemError && <div className="mb-2 text-xs text-red-600">{itemError}</div>}
                
                <div className="flex justify-end mt-6 space-x-2">
                  <button type="button" className="px-4 py-2 rounded bg-gray-200 text-gray-700" onClick={closeGenericModal}>Close</button>
                </div>
              </div>
            </div>
          )}

          {/* Success Notification */}
          {showSuccess && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="bg-white rounded-lg shadow-xl p-6 flex items-center space-x-4 border-l-4 border-green-500">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Success!</h3>
                  <p className="text-gray-600">Category has been added successfully.</p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ControlPanel;
