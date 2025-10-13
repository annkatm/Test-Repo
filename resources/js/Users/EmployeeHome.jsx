import React, { useState, useEffect } from 'react';
import { Laptop, Plus } from 'lucide-react';

const EmployeeHome = () => {
  const [employees, setEmployees] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categories, setCategories] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [returnDate, setReturnDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

  // Load data on component mount
  useEffect(() => {
    const controller = new AbortController();
    const loadData = async () => {
      setLoading(true);
      setError('');
      try {
        const [empRes, catRes, equipRes] = await Promise.all([
          fetch('/api/employees', { signal: controller.signal }),
          fetch('/api/categories', { signal: controller.signal }),
          fetch('/api/equipment?per_page=100&status=available', { signal: controller.signal })
        ]);
        
        const empData = await empRes.json();
        const catData = await catRes.json();
        const equipData = await equipRes.json();
        
        if (empData.success && Array.isArray(empData.data)) {
          setEmployees(empData.data);
        } else if (Array.isArray(empData)) {
          setEmployees(empData);
        } else {
          setEmployees([]);
        }
        
        if (catData && Array.isArray(catData.data)) {
          setCategories(catData.data);
        } else if (Array.isArray(catData)) {
          setCategories(catData);
        } else {
          setCategories([]);
        }
        
        let equipmentData = [];
        if (Array.isArray(equipData)) {
          equipmentData = equipData;
        } else if (equipData && equipData.data && Array.isArray(equipData.data.data)) {
          equipmentData = equipData.data.data;
        } else if (Array.isArray(equipData.data)) {
          equipmentData = equipData.data;
        }
        
        // Debug: Log equipment with images
        const equipmentWithImages = equipmentData.filter(eq => eq.item_image || eq.item_image_url);
        if (equipmentWithImages.length > 0) {
          console.log('Equipment with images:', equipmentWithImages.map(eq => ({
            id: eq.id,
            brand: eq.brand,
            item_image: eq.item_image,
            item_image_url: eq.item_image_url
          })));
        }
        
        setEquipment(equipmentData);
      } catch (e) {
        if (e.name !== 'AbortError') setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    loadData();
    return () => controller.abort();
  }, []);

  const handleItemTableClick = async (category) => {
    try {
      setSelectedCategory(category.name || category);
      setLoading(true);
      const categoryId = category.id || null;
      let url = '/api/equipment?per_page=100&status=available';
      if (categoryId) {
        url += `&category_id=${categoryId}`;
      } else if (typeof category === 'string') {
        url += `&search=${encodeURIComponent(category)}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      
      let equipmentData = [];
      if (Array.isArray(data)) {
        equipmentData = data;
      } else if (data && data.data && Array.isArray(data.data.data)) {
        equipmentData = data.data.data;
      } else if (Array.isArray(data.data)) {
        equipmentData = data.data;
      }
      
      // Debug: Log equipment with images
      const equipmentWithImages = equipmentData.filter(eq => eq.item_image || eq.item_image_url);
      if (equipmentWithImages.length > 0) {
        console.log('Equipment with images (category filter):', equipmentWithImages.map(eq => ({
          id: eq.id,
          brand: eq.brand,
          item_image: eq.item_image,
          item_image_url: eq.item_image_url
        })));
      }
      
      setEquipment(equipmentData);
    } catch (e) {
      setError('Failed to load equipment for category');
    } finally {
      setLoading(false);
    }
  };

  const handlePlusClick = (item) => {
    if (item.status && item.status !== 'available') {
      alert('This equipment is currently unavailable. Please choose another item.');
      return;
    }
    const existingItem = cartItems.find(cartItem => cartItem.id === item.id);
    if (existingItem) {
      setCartItems(cartItems.map(cartItem => 
        cartItem.id === item.id 
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      ));
    } else {
      setCartItems([...cartItems, { ...item, quantity: 1 }]);
    }

    const itemsSection = document.getElementById('items-section');
    if (itemsSection) {
      itemsSection.style.border = '3px solid #3B82F6';
      itemsSection.style.borderRadius = '8px';
      
      itemsSection.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest'
      });
      
      setTimeout(() => {
        itemsSection.style.border = '';
        itemsSection.style.borderRadius = '';
      }, 2000);
    }
  };

  const handleRemoveFromCart = (itemId) => {
    setCartItems(cartItems.filter(item => item.id !== itemId));
  };

  const handleQuantityChange = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      handleRemoveFromCart(itemId);
    } else {
      setCartItems(cartItems.map(item => 
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      ));
    }
  };

  const submitRequest = async () => {
    if (cartItems.length === 0) {
      alert('Please add items to your cart before submitting a request.');
      return;
    }

    try {
      setLoading(true);
      
      // Get the current user/employee ID from check-auth endpoint
      const userResponse = await fetch('/check-auth', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'same-origin'
      });
      
      const userData = await userResponse.json();
      console.log('User data:', userData);
      
      if (!userData.authenticated || !userData.user) {
        alert('You must be logged in to submit a request.');
        return;
      }

      // Get the current user's linked employee information
      let currentEmployee = null;
      
      // First, try to get employee info from the user's linked_employee_id
      if (userData.user.linked_employee_id) {
        try {
          const employeeResponse = await fetch(`/api/employees/${userData.user.linked_employee_id}`);
          const employeeData = await employeeResponse.json();
          if (employeeData.success && employeeData.data) {
            currentEmployee = employeeData.data;
          }
        } catch (error) {
          console.warn('Failed to fetch linked employee:', error);
        }
      }
      
      // Fallback: Find the employee record by email if no linked employee
      if (!currentEmployee) {
        const employeeResponse = await fetch('/api/employees');
        const employeeData = await employeeResponse.json();
        const employees = employeeData.success ? employeeData.data : employeeData;
        console.log('Employees:', employees);

        if (Array.isArray(employees) && employees.length > 0) {
          // 1) First try to match by linked_employee_id if user has one
          if (userData.user.linked_employee_id) {
            currentEmployee = employees.find(emp => emp.id === userData.user.linked_employee_id) || null;
            console.log('Found employee by linked_employee_id:', currentEmployee);
          }

          // 2) If not found by linked_employee_id, try employee_id matching
          if (!currentEmployee && userData.user.employee_id) {
            currentEmployee = employees.find(emp => emp.employee_id === userData.user.employee_id) || null;
            console.log('Found employee by employee_id:', currentEmployee);
          }

          // 3) If not found by employee_id, try email matching
          if (!currentEmployee && userData.user.email) {
            currentEmployee = employees.find(emp => 
              emp.email && emp.email.toLowerCase() === userData.user.email.toLowerCase()
            ) || null;
            console.log('Found employee by email:', currentEmployee);
          }

          // 4) Fallback: match by full name (first + last) if available
          if (!currentEmployee && userData.user.name) {
            const parts = userData.user.name.trim().split(/\s+/);
            const firstName = parts[0] || '';
            const lastName = parts.length > 1 ? parts.slice(-1)[0] : '';
            currentEmployee = employees.find(emp =>
              (emp.first_name || '').toLowerCase() === firstName.toLowerCase() &&
              (emp.last_name || '').toLowerCase() === lastName.toLowerCase()
            ) || null;
            console.log('Found employee by name:', currentEmployee);
          }
        }
      }

      console.log('Current employee:', currentEmployee);

      if (!currentEmployee) {
        alert(`Employee record not found for your account (${userData.user.email}). Please contact the administrator to link your user account to an employee profile.`);
        return;
      }

      // Get CSRF token
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
      
      if (!csrfToken) {
        alert('Security token not found. Please refresh the page.');
        return;
      }

      // Submit each item as a separate request, skipping duplicates and unavailable items
      const seen = new Set();
      const results = [];
      for (const item of cartItems) {
        if (item.status && item.status !== 'available') {
          results.push({ success: false, data: { message: 'Item unavailable' } });
          continue;
        }
        if (seen.has(item.id)) continue; // avoid duplicate requests for same equipment
        seen.add(item.id);
        const requestData = {
          employee_id: currentEmployee.id,
          equipment_id: item.id,
          request_type: 'new_assignment',
          request_mode: 'on_site',
          reason: `Request for ${item.quantity} unit(s) of ${item.name || item.brand}`,
          expected_start_date: startDate,
          expected_end_date: returnDate
        };

        console.log('Submitting request:', requestData);

        const response = await fetch('/api/requests', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': csrfToken,
            'X-Requested-With': 'XMLHttpRequest',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}` // Add auth token
          },
          credentials: 'same-origin',
          body: JSON.stringify(requestData)
        });

        const data = await response.json();
        console.log('Response status:', response.status, 'Response data:', data);
        results.push({ success: response.ok && data.success, data });
      }

      // Check if all requests succeeded
      const successCount = results.filter(r => r.success).length;
      const failedCount = results.length - successCount;

      if (successCount > 0) {
        if (failedCount === 0) {
          alert(`✓ All ${successCount} request(s) submitted successfully!\n\nYour requests have been sent to the Super Admin for approval.`);
          setCartItems([]); // Clear cart
          // Refresh the page to show updated pending requests
          window.location.reload();
        } else {
          alert(`${successCount} request(s) submitted successfully, but ${failedCount} failed.\n\nSuccessful requests have been sent to the Super Admin.`);
          // Remove successful items from cart
          const failedIds = results
            .filter(r => !r.success)
            .map((r, i) => cartItems[i].id);
          setCartItems(cartItems.filter(item => failedIds.includes(item.id)));
        }
      } else {
        alert('All requests failed. Please check your inputs and try again.');
      }
    } catch (error) {
      console.error('Failed to submit request:', error);
      alert('Failed to submit request. Please try again.\n\nError: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-blue-600">Homepage</h1>
      </div>

      <div className="pl-5 grid grid-cols-12 gap-8 items-start bg-gray-50 ">
        <div className="rounded-xl shadow-xl shadow-gray-500/70 col-span-3 overflow-y-auto h-138 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="p-6 h-full">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Item Categories</h2>
            <div className="grid grid-cols-2 gap-3">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleItemTableClick(category)}
                  className={`aspect-square bg-gray-100 rounded-lg flex flex-col items-center justify-center hover:shadow-md transition-all cursor-pointer ${
                    selectedCategory === (category.name || category) ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  <Laptop className="h-6 w-6 text-gray-600 mb-1" />
                  <span className="text-xs font-medium text-gray-700">{category.name || 'Category'}</span>
                </button>
              ))}
              {categories.length === 0 && (
                <div className="col-span-2 text-center text-sm text-gray-500 py-8">No categories found</div>
              )}
            </div>
          </div>
        </div>

        <div className=" rounded-xl col-span-5 bg-white">
          <div className="rounded-xl shadow-lg shadow-gray-500/70 p-6 overflow-y-auto h-138 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
  {selectedCategory ? `${selectedCategory} Types` : 'Equipment Types'}
        </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-600 pb-2">
                <div className="col-span-3">Brand</div>
                <div className="col-span-7">Specs</div>
                <div className="col-span-2"></div>
              </div>
              
              {equipment.slice(0, 4).map((item) => (
                <div key={item.id} className="grid grid-cols-12 gap-4 items-center py-3 border-b border-gray-100">
                  <div className="col-span-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                        <img
                          src={item.item_image_url || (item.item_image ? 
                            (item.item_image.startsWith('http') ? item.item_image :
                             item.item_image.startsWith('/storage') ? `${window.location.origin}${item.item_image}` :
                             `${window.location.origin}/storage/${item.item_image}`) :
                            `${window.location.origin}/images/placeholder-equipment.png`)}
                          alt={item.brand || item.name || 'Equipment'}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = `${window.location.origin}/images/placeholder-equipment.png`;
                          }}
                        />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{item.brand || item.name || 'Unknown'}</div>
                        <div className="text-xs text-gray-500">{item.status || 'available'}</div>
                      </div>
                    </div>
                  </div>
                  <div className="col-span-7">
                    <p className="text-sm text-gray-600">{item.specifications || 'No specs available'}</p>
                  </div>
                  <div className="col-span-2 flex justify-end">
                    <button 
                      onClick={() => handlePlusClick(item)}
                      disabled={item.status && item.status !== 'available'}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${item.status && item.status !== 'available' ? 'bg-gray-200 cursor-not-allowed' : 'bg-blue-100 hover:bg-blue-200'}`}
                    >
                      <Plus className="h-4 w-4 text-blue-600" />
                    </button>
                  </div>
                </div>
              ))}
              {equipment.length === 0 && (
  <div className="text-gray-500 text-sm">
    {selectedCategory ? `No ${selectedCategory} equipment found` : 'No equipment found'}
  </div>
)}
            </div>
          </div>
        </div>

        <div id="items-section" className="shadow-lg shadow-gray-500/70 rounded-xl w-96 min-w-[20rem] mb-4 bg-white h-[552px] flex flex-col">
          <div className="rounded-xl shadow-lg shadow-gray-500/70 w-full h-full flex flex-col">
            {/* Header */}
            <div className="p-6 pb-3">
              <h2 className="text-lg font-semibold text-gray-900">Items</h2>
            </div>

            {/* Scrollable Items Section - Fixed height of 138px */}
            <div className=" px-6 h-[200px] flex-shrink-0 border-b border-gray-200">
              <div className="h-[140px] h-full overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <div className="space-y-2">
                  {cartItems.map((item) =>  (
                    <div key={item.id} className="flex items-center justify-between py-1.5">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                          {item.item_image_url || item.item_image ? (
                            <img
                              src={item.item_image_url || (item.item_image.startsWith('http') ? item.item_image :
                                   item.item_image.startsWith('/storage') ? `${window.location.origin}${item.item_image}` :
                                   `${window.location.origin}/storage/${item.item_image}`)}
                              alt={item.name || item.brand || 'Equipment'}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div className={`w-full h-full flex items-center justify-center ${item.item_image_url || item.item_image ? 'hidden' : 'flex'}`}>
                            <Laptop className="h-5 w-5 text-gray-600" />
                          </div>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 text-sm">{item.name || item.brand}</div>
                          <div className="text-xs text-gray-500">{item.model || item.brand}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                          className="w-6 h-6 bg-red-50 border border-red-200 hover:bg-red-100 rounded-full flex items-center justify-center"
                        >
                          <span className="text-red-600 text-sm font-bold">−</span>
                        </button>
                        <span className="text-xs text-gray-600 min-w-[20px] text-center font-medium">x{item.quantity}</span>
                        <button 
                          onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                          className="w-6 h-6 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-full flex items-center justify-center">
                          <Plus className="h-3 w-3 text-blue-600" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {cartItems.length === 0 && (
                    <div className="text-gray-400 text-sm text-center py-6">
                      <Laptop className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                      <div className="text-xs">Your cart is empty</div>
                      <div className="text-xs">Click + buttons to add items</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

{/* Date Pickers Section - Fixed, compact */}
          {/* Date Pickers Section - Fixed, compact */}
          {cartItems.length > 0 && (
              <div className="px-6 pt-2 pb-2 border-t border-gray-200 flex-shrink-0">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <div className="relative">
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-gray-300"
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Return Date</label>
                    <div className="relative">
                      <input
                        type="date"
                        value={returnDate}
                        onChange={(e) => setReturnDate(e.target.value)}
                        min={startDate}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-gray-300"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Request Summary Section - Fixed at bottom, compact */}
            {cartItems.length > 0 && (
              <div className="px-6 pt-2 pb-4 border-t border-gray-200 bg-white rounded-b-xl flex-shrink-0">
                <div className="bg-gray-50 rounded-lg p-3 mb-3">
                  <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-1">Request Summary</h2>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 text-sm">Total Items</span>
                      <span className="font-semibold text-gray-900 text-sm">x{cartItems.reduce((sum, item) => sum + item.quantity, 0)}</span>
                    </div>
                    <div className="pt-1 mt-1 border-t border-gray-200 space-y-0.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Start</span>
                        <span className="font-medium text-gray-900">
                          {new Date(startDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Return</span>
                        <span className="font-medium text-gray-900">
                          {new Date(returnDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Duration</span>
                        <span className="font-medium text-gray-900">
                          {Math.ceil((new Date(returnDate) - new Date(startDate)) / (1000 * 60 * 60 * 24))} days
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setCartItems([])}
                    className="flex-1 bg-white border border-red-300 hover:bg-red-50 text-red-600 py-2 px-4 rounded-lg text-sm font-medium transition-colors">
                    Cancel
                  </button>
                  <button 
                    onClick={submitRequest}
                    disabled={loading || cartItems.length === 0}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1">
                    {loading ? 'Submitting...' : (
                      <>
                        Request
                        <span>→</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeHome;