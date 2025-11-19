import React, { useState, useEffect } from 'react';
import { Laptop, Plus } from 'lucide-react';
import ItemCategories from './ItemCategories';
import EquipmentTypes from './EquipmentTypes';
import Items from './Items';

const EmployeeTransaction = () => {
  const [employees, setEmployees] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categories, setCategories] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [workLocation, setWorkLocation] = useState('');

  // Per-user localStorage helpers
  const getUserTag = () => {
    try {
      const raw = localStorage.getItem('user');
      if (raw) { const u = JSON.parse(raw); return u?.id || u?.email || 'guest'; }
    } catch (_) {}
    return 'guest';
  };
  const userKey = (base) => `${base}:${getUserTag()}`;
  const migrateKeyIfNeeded = (base) => {
    try {
      const scoped = userKey(base);
      const cur = localStorage.getItem(scoped);
      if (cur) return; // already scoped
      const legacy = localStorage.getItem(base);
      if (legacy != null) localStorage.setItem(scoped, legacy);
    } catch (_) {}
  };

  const isLaptopCategory = (categoryId) => {
    const cat = categories.find(c => String(c.id) === String(categoryId));
    return (cat?.name || '').toLowerCase() === 'laptop';
  };

  const getCategoryNameById = (categoryId) => {
    const cat = categories.find(c => String(c.id) === String(categoryId));
    return (cat?.name || '').toLowerCase();
  };

  const getLimitForCategoryId = (categoryId) => {
    const name = getCategoryNameById(categoryId);
    if (name === 'laptop') return 1;
    if (name === 'monitor') return 3;
    if (name === 'keyboard') return 1;
    if (name === 'mouse') return 1;
    return Infinity;
  };

  const countInCartByCategoryId = (categoryId) => {
    try {
      const idStr = String(categoryId);
      let count = 0;
      for (const ci of cartItems) {
        const units = Array.isArray(ci?.units) ? ci.units : [];
        for (const u of units) {
          if (String(u?.category_id) === idStr) count += 1;
        }
      }
      return count;
    } catch (_) {
      return 0;
    }
  };

  const isAtLimitForCategoryId = (categoryId) => {
    const limit = getLimitForCategoryId(categoryId);
    const current = countInCartByCategoryId(categoryId);
    return current >= limit;
  };

  const logActivity = (message, variant = 'info') => {
    try {
      migrateKeyIfNeeded('employee_activities');
      const prev = JSON.parse(localStorage.getItem(userKey('employee_activities')) || '[]');
      const entry = { id: Date.now(), message, variant, time: new Date().toISOString() };
      const next = [entry, ...(Array.isArray(prev) ? prev : [])].slice(0, 50);
      localStorage.setItem(userKey('employee_activities'), JSON.stringify(next));
    } catch (_) {}
  };

  // Keep a per-user local list of reserved equipment IDs so they stay hidden after request submission
  const getReservedIds = () => {
    try {
      migrateKeyIfNeeded('employee_reserved_equipment_ids');
      const raw = localStorage.getItem(userKey('employee_reserved_equipment_ids')) || '[]';
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? new Set(arr.map(String)) : new Set();
    } catch (_) { return new Set(); }
  };
  const addReservedIds = (ids) => {
    try {
      const cur = getReservedIds();
      for (const id of ids) cur.add(String(id));
      localStorage.setItem(userKey('employee_reserved_equipment_ids'), JSON.stringify(Array.from(cur)));
    } catch (_) {}
  };
  const removeReservedId = (id) => {
    try {
      const cur = getReservedIds();
      cur.delete(String(id));
      localStorage.setItem(userKey('employee_reserved_equipment_ids'), JSON.stringify(Array.from(cur)));
    } catch (_) {}
  };
  const cleanupReservedIds = (equipmentData) => {
    try {
      const reservedIds = getReservedIds();
      const availableIds = new Set(equipmentData.map(eq => String(eq.id)));
      let needsCleanup = false;
      reservedIds.forEach(id => {
        if (availableIds.has(id)) {
          reservedIds.delete(id);
          needsCleanup = true;
        }
      });
      if (needsCleanup) {
        localStorage.setItem(userKey('employee_reserved_equipment_ids'), JSON.stringify(Array.from(reservedIds)));
      }
    } catch (_) {}
  };
  
  const filterOutReserved = (list) => {
    try {
      const cur = getReservedIds();
      return (Array.isArray(list) ? list : []).filter((eq) => !cur.has(String(eq.id)));
    } catch (_) {
      return Array.isArray(list) ? list : [];
    }
  };

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
        
        // Clean up reserved list: remove IDs that are now available
        cleanupReservedIds(equipmentData);
        
        setEquipment(filterOutReserved(equipmentData));
      } catch (e) {
        if (e.name !== 'AbortError') setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
    return () => controller.abort();
  }, []);

  // Listen for restore events from other parts of the app (e.g., EmployeeTransaction)
  useEffect(() => {
    const handler = async (e) => {
      try {
        const eqId = e?.detail?.equipment_id;
        if (eqId) {
          // Allow this unit to reappear by removing it from reserved list
          try { removeReservedId(eqId); } catch (_) {}
          // Try to fetch a single equipment unit and add it back if available
          try {
            const res = await fetch(`/api/equipment/${eqId}`);
            const data = await res.json();
            const item = data?.data || data;
            if (item && (!item.status || item.status === 'available')) {
              setEquipment((prev) => {
                if (Array.isArray(prev) && prev.some((x) => String(x.id) === String(item.id))) return prev;
                return [item, ...(Array.isArray(prev) ? prev : [])];
              });
            }
          } catch (_err) {
            // If single fetch fails, fall back to refreshing available list
            const res = await fetch('/api/equipment?per_page=100&status=available');
            const data = await res.json();
            let equipmentData = [];
            if (Array.isArray(data)) equipmentData = data; else if (data?.data?.data) equipmentData = data.data.data; else if (Array.isArray(data?.data)) equipmentData = data.data;
            setEquipment(equipmentData || []);
          }
        } else {
          // No id provided: refresh available equipment
          const res = await fetch('/api/equipment?per_page=100&status=available');
          const data = await res.json();
          let equipmentData = [];
          if (Array.isArray(data)) equipmentData = data; else if (data?.data?.data) equipmentData = data.data.data; else if (Array.isArray(data?.data)) equipmentData = data.data;
          setEquipment(equipmentData || []);
        }
      } catch (_e) { /* ignore */ }
    };
    window.addEventListener('ireply:equipment:restore', handler);
    return () => window.removeEventListener('ireply:equipment:restore', handler);
  }, []);

  // On mount, process any queued restore requests from other views (e.g., OnProcessTransactions cancel)
  useEffect(() => {
    (async () => {
      try {
        const key = 'ireply_restore_queue';
        const raw = localStorage.getItem(key);
        const arr = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
        if (!arr || arr.length === 0) return;
        // Clear queue first to avoid double-processing if anything throws below
        try { localStorage.setItem(key, JSON.stringify([])); } catch (_) {}

        for (const id of arr) {
          try { removeReservedId(id); } catch (_) {}
          try {
            const res = await fetch(`/api/equipment/${id}`);
            const data = await res.json();
            const item = data?.data || data;
            if (item && (!item.status || item.status === 'available')) {
              setEquipment((prev) => {
                if (Array.isArray(prev) && prev.some((x) => String(x.id) === String(item.id))) return prev;
                return [item, ...(Array.isArray(prev) ? prev : [])];
              });
            }
          } catch (_e) {
            // If single fetch fails, refresh available list once
            try {
              const res = await fetch('/api/equipment?per_page=100&status=available');
              const data = await res.json();
              let equipmentData = [];
              if (Array.isArray(data)) equipmentData = data; else if (data?.data?.data) equipmentData = data.data.data; else if (Array.isArray(data?.data)) equipmentData = data.data;
              setEquipment(equipmentData || []);
            } catch (_) {}
          }
        }
      } catch (_) { /* ignore */ }
    })();
  }, []);

  // Group equipment units into products (same brand/name/specs)
  const getGroupedEquipment = () => {
    const groups = {};
    for (const eq of equipment) {
      const key = `${(eq.name || eq.brand || 'Unknown').toLowerCase()}||${(eq.specifications || '').toLowerCase()}||${eq.category_id || ''}`;
      if (!groups[key]) {
        groups[key] = {
          key,
          name: eq.name || eq.brand || 'Unknown',
          brand: eq.brand || eq.name || 'Unknown',
          specifications: eq.specifications || '',
          category_id: eq.category_id,
          image: eq.item_image_url || eq.item_image || null,
          items: [],
        };
      }
      groups[key].items.push(eq);
    }
    return Object.values(groups)
      .map(g => ({
        ...g,
        availableCount: g.items.filter(i => !i.status || i.status === 'available').length,
        representative: g.items[0] || null,
      }));
  };

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
      
      // Clean up reserved list: remove IDs that are now available
      cleanupReservedIds(equipmentData);
      
      setEquipment(filterOutReserved(equipmentData));
    } catch (e) {
      setError('Failed to load equipment for category');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllAvailableEquipment = async () => {
    try {
      setLoading(true);
      setSelectedCategory(null);
      const res = await fetch('/api/equipment?per_page=100&status=available');
      const data = await res.json();
      let equipmentData = [];
      if (Array.isArray(data)) {
        equipmentData = data;
      } else if (data && data.data && Array.isArray(data.data.data)) {
        equipmentData = data.data.data;
      } else if (Array.isArray(data.data)) {
        equipmentData = data.data;
      }
      
      // Clean up reserved list: remove IDs that are now available
      cleanupReservedIds(equipmentData);
      
      setEquipment(filterOutReserved(equipmentData));
    } catch (e) {
      setError('Failed to load all equipment');
    } finally {
      setLoading(false);
    }
  };

  const handlePlusClick = (item) => {
    if (item.status && item.status !== 'available') {
      alert('This equipment is currently unavailable. Please choose another item.');
      return;
    }
    if (isAtLimitForCategoryId(item.category_id)) {
      const name = getCategoryNameById(item.category_id) || 'item';
      const limit = getLimitForCategoryId(item.category_id);
      alert(`You can only add up to ${limit} ${name}${limit > 1 ? 's' : ''}.`);
      return;
    }
    // Group key based on same logic as equipment grouping
    const groupKey = `${(item.name || item.brand || 'Unknown').toLowerCase()}||${(item.specifications || '').toLowerCase()}||${item.category_id || ''}`;
    const existingGroup = cartItems.find(ci => ci.groupKey === groupKey);
    if (existingGroup) {
      setCartItems(cartItems.map(ci => 
        ci.groupKey === groupKey
          ? { ...ci, quantity: ci.quantity + 1, units: [...ci.units, item] }
          : ci
      ));
    } else {
      setCartItems([
        ...cartItems,
        {
          groupKey,
          name: item.name || item.brand || 'Unknown',
          brand: item.brand || item.name || 'Unknown',
          specifications: item.specifications || '',
          image: item.item_image_url || item.item_image || null,
          quantity: 1,
          units: [item]
        }
      ]);
    }

    // Remove the added item from the visible equipment list so it vanishes
    // This reflects that this specific unit is now taken/reserved in the cart
    setEquipment(prev => prev.filter(eq => eq.id !== item.id));

    logActivity(`Added to cart: ${(item.name || item.brand || 'Item')} (${item.id})`, 'success');

    const itemsSection = document.getElementById('items-section');
    if (itemsSection) {
      itemsSection.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest'
      });
    }
  };

  const handleRemoveFromCart = (groupKey) => {
    const group = cartItems.find(ci => ci.groupKey === groupKey);
    if (group) {
      // Return all units in this group back to the equipment list if not already there
      setEquipment(prev => {
        const existingIds = new Set(prev.map(eq => eq.id));
        const toAdd = group.units.filter(u => !existingIds.has(u.id));
        return [...toAdd, ...prev];
      });
      logActivity(`Removed from cart: ${group.name} (x${group.quantity})`, 'warning');
    }
    setCartItems(cartItems.filter(ci => ci.groupKey !== groupKey));
  };

  const handleQuantityChange = (groupKey, newQuantity) => {
    const group = cartItems.find(ci => ci.groupKey === groupKey);
    if (!group) return;
    if (newQuantity <= 0) {
      handleRemoveFromCart(groupKey);
      return;
    }
    if (newQuantity < group.quantity) {
      // Decrement: return one unit to equipment
      const unit = group.units[group.units.length - 1];
      if (unit) {
        setEquipment(prev => {
          if (getReservedIds().has(String(unit.id))) return prev; // keep hidden if reserved
          return prev.some(eq => eq.id === unit.id) ? prev : [unit, ...prev];
        });
      }
      setCartItems(cartItems.map(ci => 
        ci.groupKey === groupKey ? { ...ci, quantity: newQuantity, units: ci.units.slice(0, -1) } : ci
      ));
      logActivity(`Decreased quantity: ${group.name} to x${newQuantity}`, 'info');
    } else if (newQuantity > group.quantity) {
      const catId = group?.units?.[0]?.category_id;
      if (catId && isAtLimitForCategoryId(catId)) {
        const name = getCategoryNameById(catId) || 'item';
        const limit = getLimitForCategoryId(catId);
        alert(`You can only add up to ${limit} ${name}${limit > 1 ? 's' : ''}.`);
        return;
      }
      // Increment: try to take one matching available unit from equipment
      const matchIndex = equipment.findIndex(eq => (
        `${(eq.name || eq.brand || 'Unknown').toLowerCase()}||${(eq.specifications || '').toLowerCase()}||${eq.category_id || ''}` === groupKey
      ));
      if (matchIndex === -1) return; // no more stock available
      const unit = equipment[matchIndex];
      setEquipment(prev => prev.filter((_, idx) => idx !== matchIndex));
      setCartItems(cartItems.map(ci => 
        ci.groupKey === groupKey ? { ...ci, quantity: newQuantity, units: [...ci.units, unit] } : ci
      ));
      logActivity(`Increased quantity: ${group.name} to x${newQuantity}`, 'info');
    }
  };

  const handleCancel = () => {
    if (cartItems.length > 0) {
      setEquipment(prev => {
        // Add back any unit from all groups that's not already present in the equipment list
        const existingIds = new Set(prev.map(eq => eq.id));
        const toAdd = cartItems.flatMap(ci => ci.units || []).filter(u => !existingIds.has(u.id) && !getReservedIds().has(String(u.id)));
        return [...toAdd, ...prev];
      });
    }
    setCartItems([]);
    logActivity('Canceled cart and reset selection', 'warning');
    // Reset selection and reload default available equipment
    setSelectedCategory(null);
    (async () => {
      try {
        const res = await fetch('/api/equipment?per_page=100&status=available');
        const data = await res.json();
        let equipmentData = [];
        if (Array.isArray(data)) {
          equipmentData = data;
        } else if (data && data.data && Array.isArray(data.data.data)) {
          equipmentData = data.data.data;
        } else if (Array.isArray(data.data)) {
          equipmentData = data.data;
        }
        setEquipment(equipmentData);
      } catch (e) {
        // non-blocking; keep prior equipment if reload fails
      } finally {
        // Scroll back to categories/options
        const cat = document.getElementById('categories-section');
        if (cat && typeof cat.scrollIntoView === 'function') {
          cat.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    })();
  };

  const submitRequest = async () => {
    if (cartItems.length === 0) {
      alert('Please add items to your cart before submitting a request.');
      return;
    }

    try {
      setLoading(true);
      logActivity(`Submitting request for ${cartItems.reduce((s, i) => s + i.quantity, 0)} item(s)`, 'info');
      
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
      for (const group of cartItems) {
        for (const unit of group.units) {
          if (unit.status && unit.status !== 'available') {
            results.push({ success: false, data: { message: 'Item unavailable' } });
            logActivity(`Request skipped (unavailable): ${group.name} (${unit.id})`, 'warning');
            continue;
          }
          if (seen.has(unit.id)) continue; // avoid duplicate requests for same equipment
          seen.add(unit.id);
          const requestData = {
            employee_id: currentEmployee.id,
            equipment_id: unit.id,
            request_type: 'new_assignment',
            request_mode: 'on_site',
            reason: `Request for 1 unit of ${group.name || group.brand}`,
            expected_start_date: startDate
          };

          console.log('Submitting request:', requestData);

          // Build headers suitable for Laravel session auth; include Authorization only if present
          const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': csrfToken,
            'X-Requested-With': 'XMLHttpRequest',
          };
          const authToken = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
          if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

          const response = await fetch('/api/requests', {
            method: 'POST',
            headers,
            credentials: 'same-origin',
            body: JSON.stringify(requestData)
          });

          let data = null;
          try {
            data = await response.json();
          } catch (parseErr) {
            data = { success: false, message: 'Invalid JSON response', parseErr: String(parseErr) };
          }
          console.log('Response status:', response.status, 'Response data:', data);
          const ok = (
            response.ok && (
              data?.success === true ||
              data?.status === 'success' ||
              typeof (data?.data?.id) !== 'undefined' ||
              typeof (data?.id) !== 'undefined'
            )
          );
          results.push({ success: ok, status: response.status, data, unitId: unit.id, unit, groupKey: group.groupKey });

          if (ok) {
            logActivity(`Request submitted: ${group.name} (${unit.id})`, 'success');
            try {
              const newReq = {
                id: data?.data?.id || data?.id || null,
                equipment_id: unit.id,
                equipment_name: group.name || unit.name || unit.brand || 'Item',
                created_at: new Date().toISOString(),
                expected_start_date: startDate,
                status: 'Pending',
              };
              window.dispatchEvent(new CustomEvent('ireply:request:created', { detail: newReq }));
              // Persist to a queue so other views can process later if not mounted
              try {
                const key = 'ireply_created_queue';
                const raw = localStorage.getItem(key);
                const arr = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
                arr.push(newReq);
                localStorage.setItem(key, JSON.stringify(arr));
              } catch (_) {}
            } catch (_) {}
          } else {
            const msg = data?.message || data?.error || `HTTP ${response.status}`;
            logActivity(`Request failed: ${group.name} (${unit.id}) - ${msg}`, 'warning');
          }
        }
      }

      // Check outcomes
      const successCount = results.filter(r => r.success).length;
      const failedCount = results.length - successCount;
      const successIds = new Set(results.filter(r => r.success).map(r => r.unitId));

      if (successCount > 0) {
        // Optimistically remove successful units from the Equipment Types list so they vanish immediately
        // Persistently hide these units for this user
        addReservedIds(Array.from(successIds));
        setEquipment(prev => prev.filter(eq => !successIds.has(eq.id)));

        if (failedCount === 0) {
          alert(`✓ All ${successCount} request(s) submitted successfully!\n\nYour requests have been sent to the Super Admin for approval.`);
          setCartItems([]); // Clear cart when everything succeeded
          try {
            const msg = `${successCount} request(s) submitted`;
            if (window.IReplyNotify) window.IReplyNotify(msg, 'success', true);
            window.dispatchEvent(new CustomEvent('ireply:notify', { detail: { message: `You submitted ${successCount} request(s)`, variant: 'success' } }));
          } catch (_) {}
        } else {
          alert(`${successCount} request(s) submitted successfully, but ${failedCount} failed.\n\nSuccessful requests have been sent to the Super Admin.`);
          // Remove only successful units from the cart; keep failed ones
          const nextCart = cartItems
            .map(ci => {
              const remainingUnits = (ci.units || []).filter(u => !successIds.has(u.id));
              const nextQty = Math.max(0, remainingUnits.length);
              return nextQty > 0 ? { ...ci, units: remainingUnits, quantity: nextQty } : null;
            })
            .filter(Boolean);
          setCartItems(nextCart);
          try {
            const msg = `${successCount} request(s) submitted (some failed)`;
            if (window.IReplyNotify) window.IReplyNotify(msg, 'warning', true);
            window.dispatchEvent(new CustomEvent('ireply:notify', { detail: { message: msg, variant: 'warning' } }));
          } catch (_) {}
        }
      } else {
        const firstFailure = results[0] || {};
        const msg = firstFailure?.data?.message || firstFailure?.data?.error || `HTTP ${firstFailure?.status || 'unknown'}`;
        alert(`All requests failed. Please check your inputs and try again.\n\nDetails: ${msg}`);
        logActivity(`All requests failed - ${msg}`, 'warning');
      }
    } catch (error) {
      console.error('Failed to submit request:', error);
      alert('Failed to submit request. Please try again.\n\nError: ' + error.message);
      logActivity(`Submit request error: ${error.message}`, 'warning');
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
        <h1 className="text-4xl font-bold text-[#2262C6] transition-all duration-300">Transaction</h1>
      </div>

      <div className="pl-5 grid grid-cols-1 md:grid-cols-12 gap-8 items-start bg-white ">
        <ItemCategories
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectAll={fetchAllAvailableEquipment}
          onSelectCategory={handleItemTableClick}
        />

        <EquipmentTypes
          groups={getGroupedEquipment().slice(0, 4)}
          onAdd={handlePlusClick}
          isAtLimit={isAtLimitForCategoryId}
          selectedCategory={selectedCategory}
          hasEquipment={equipment.length > 0}
        />

        <Items
          cartItems={cartItems}
          onQuantityChange={handleQuantityChange}
          onCancel={handleCancel}
          onSubmit={submitRequest}
          loading={loading}
          workLocation={workLocation}
          setWorkLocation={setWorkLocation}
          startDate={startDate}
          setStartDate={setStartDate}
          isAtLimit={isAtLimitForCategoryId}
        />
      </div>
    </div>
  );
};

export default EmployeeTransaction;
