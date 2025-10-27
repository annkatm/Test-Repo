import React, { useState, useEffect } from 'react';
import HomeSidebar from './HomeSidebar';
import GlobalHeader from './components/GlobalHeader';
import EmployeeFilter from './components/EmployeeFilter';
import { Eye, Pencil, Trash2, Search, AlertCircle } from 'lucide-react';

const getBadgeColor = (name) => {
  const colors = {
    J: 'bg-blue-500',
    K: 'bg-pink-500', 
    R: 'bg-yellow-500',
    C: 'bg-blue-500',
  };
  const first = name?.[0]?.toUpperCase() || 'B';
  return colors[first] || 'bg-gray-400';
};

// Input component with validation (top-level to avoid remount on parent re-render)
const ValidatedInput = ({ label, value, onChange, type = "text", placeholder, required = false, error, tabIndex }) => (
  <div>
    <label className="block text-sm text-gray-700 font-medium mb-2">
      {label}{required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full px-4 py-3 rounded-lg bg-gray-100 border-0 text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 ${
        error ? 'focus:ring-red-500 bg-red-50' : 'focus:ring-blue-500'
      }`}
      placeholder={placeholder}
      tabIndex={tabIndex}
    />
    {error && (
      <div className="flex items-center mt-1 text-red-500 text-xs">
        <AlertCircle className="h-3 w-3 mr-1" />
        {error}
      </div>
    )}
  </div>
);

// Select component with validation (top-level to avoid remount on parent re-render)
const ValidatedSelect = ({ label, value, onChange, options, required = false, error, tabIndex }) => (
  <div>
    <label className="block text-sm text-gray-700 font-medium mb-2">
      {label}{required && <span className="text-red-500">*</span>}
    </label>
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full px-4 py-3 rounded-lg bg-gray-100 border-0 text-gray-700 focus:outline-none focus:ring-2 ${
        error ? 'focus:ring-red-500 bg-red-50' : 'focus:ring-blue-500'
      }`}
      tabIndex={tabIndex}
    >
      {options.map((option, index) => (
        <option key={index} value={option.value}>{option.label}</option>
      ))}
    </select>
    {error && (
      <div className="flex items-center mt-1 text-red-500 text-xs">
        <AlertCircle className="h-3 w-3 mr-1" />
        {error}
      </div>
    )}
  </div>
);

const EmployeePage = () => {
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [viewing, setViewing] = React.useState(null);
  const [editing, setEditing] = React.useState(null);
  const [deleting, setDeleting] = React.useState(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filters, setFilters] = React.useState({});
  const [form, setForm] = React.useState({
    firstName: '',
    lastName: '',
    email: '',
    contact: '',
    employeeId: '',
    position: '',
    department: '',
    address: '',
    client: '',
    employeeType: 'Regular',
    issuedItem: '',
    status: 'active',
    createAccount: false,
    password: '',
    confirmPassword: '',
    role: 'employee'
  });
  const [errors, setErrors] = useState({});
  const [employees, setEmployees] = useState([]);
  const [dropdownOptions, setDropdownOptions] = useState({
    positions: [],
    departments: [],
    clients: [],
    employeeTypes: [],
    accountTypes: []
  });
  const [isEquipmentModalOpen, setIsEquipmentModalOpen] = useState(false);
  const [availableEquipment, setAvailableEquipment] = useState([]);
  const [issuedEquipment, setIssuedEquipment] = useState([]);
  const [equipmentSearchTerm, setEquipmentSearchTerm] = useState('');

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone) => {
    const phoneRegex = /^[0-9]{11}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  };

  const validatePassword = (password) => {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  };

  const validateForm = (isEdit = false) => {
    const newErrors = {};

    // First Name validation
    if (!form.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (form.firstName.trim().length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters';
    } else if (!/^[a-zA-Z\s]+$/.test(form.firstName.trim())) {
      newErrors.firstName = 'First name can only contain letters and spaces';
    }

    // Last Name validation
    if (!form.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    } else if (form.lastName.trim().length < 2) {
      newErrors.lastName = 'Last name must be at least 2 characters';
    } else if (!/^[a-zA-Z\s]+$/.test(form.lastName.trim())) {
      newErrors.lastName = 'Last name can only contain letters and spaces';
    }

    // Email validation
    if (!form.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(form.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation (optional for edit only)
    if (form.password && !validatePassword(form.password)) {
      newErrors.password = 'Password must be at least 8 characters with uppercase, lowercase, and number';
    }

    // Contact validation
    if (!form.contact.trim()) {
      newErrors.contact = 'Contact number is required';
    } else if (!validatePhone(form.contact.trim())) {
      newErrors.contact = 'Please enter a valid phone number';
    }

    // Address validation
    if (!form.address.trim()) {
      newErrors.address = 'Address is required';
    } else if (form.address.trim().length < 10) {
      newErrors.address = 'Address must be at least 10 characters';
    }

    // Employee Type validation
    if (!form.employeeType) {
      newErrors.employeeType = 'Employee type is required';
    }

    // Optional field validations (only if filled)
    if (form.client && form.client.trim().length < 2) {
      newErrors.client = 'Client name must be at least 2 characters';
    }

    if (form.position && form.position.trim().length < 2) {
      newErrors.position = 'Position must be at least 2 characters';
    }

    if (form.department && form.department.trim().length < 2) {
      newErrors.department = 'Department must be at least 2 characters';
    }

    if (form.issuedItem && form.issuedItem.trim().length < 2) {
      newErrors.issuedItem = 'Issued item must be at least 2 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const loadAvailableEquipment = async () => {
    try {
      const res = await fetch('/api/equipment');
      const data = await res.json();
      if (data.success) {
        // Handle both data structures (data.data or data.data.data)
        const equipmentList = Array.isArray(data.data) ? data.data : (data.data.data || []);
        
        // Debug: Log equipment structure to verify specs field
        if (equipmentList.length > 0) {
          console.log('Equipment sample:', equipmentList[0]);
        }
        
        // Map equipment with category information
        const equipmentWithCategories = equipmentList.map(item => ({
          ...item,
          category: item.category || { id: null, name: 'Uncategorized' }
        }));
        
        // Filter only available equipment
        const available = equipmentWithCategories.filter(eq => 
          eq.status === 'available' || eq.status === 'Available'
        );
        setAvailableEquipment(available);
      }
    } catch (e) {
      console.error('Failed to load equipment:', e);
    }
  };

  const loadDropdownOptions = async () => {
    try {
      const endpoints = {
        positions: '/api/positions',
        departments: '/api/departments',
        clients: '/api/clients',
        employeeTypes: '/api/employee-types',
        accountTypes: '/api/account-types'
      };

      const promises = Object.entries(endpoints).map(async ([key, endpoint]) => {
        try {
          const res = await fetch(endpoint);
          const data = await res.json();
          return [key, data.success && Array.isArray(data.data) ? data.data.map(item => ({ value: item.name, label: item.name })) : []];
        } catch (e) {
          return [key, []];
        }
      });

      const results = await Promise.all(promises);
      const newOptions = {};
      results.forEach(([key, options]) => {
        newOptions[key] = options;
      });

      setDropdownOptions(newOptions);
    } catch (e) {
      console.error('Failed to load dropdown options:', e);
    }
  };

  const fetchEmployees = async (searchTerm = '', filterParams = {}) => {
    try {
      const params = new URLSearchParams();
      
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }
      
      Object.entries(filterParams).forEach(([key, value]) => {
        if (value && value !== 'all') {
          params.append(key, value);
        }
      });

      const response = await fetch(`/api/employees?${params}`);
      const data = await response.json();

      if (data.success && Array.isArray(data.data)) {
        const list = data.data.map(e => ({
          id: e.id,
          name: `${e.first_name} ${e.last_name}`.trim(),
          firstName: e.first_name || '',
          lastName: e.last_name || '',
          position: e.position || '',
          client: e.client || '',
          department: e.department || '',
          employeeType: e.employee_type || 'Regular',
          email: e.email || '',
          phone: e.phone || '',
          address: e.address || '',
          issuedItem: e.issued_item || '',
          issuedEquipment: e.issued_equipment || [],
          user: e.user || null,
          badge: (e.first_name?.[0] || '').toUpperCase(),
          color: getBadgeColor(e.first_name)
        }));
        setEmployees(list);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  useEffect(() => {
    // Load dropdown options first
    loadDropdownOptions();

    // Support deep-linking via /employee?email=... or ?employee_id=...
    const params = new URLSearchParams(window.location.search);
    const filterEmail = params.get('email');
    const filterEmpId = params.get('employee_id');

    fetchEmployees().then(() => {
      if (filterEmail || filterEmpId) {
        const match = employees.find(e => 
          (filterEmail && e.email?.toLowerCase() === filterEmail.toLowerCase()) || 
          (filterEmpId && (e.employeeId === filterEmpId || e.name?.toLowerCase().includes(filterEmpId.toLowerCase())))
        );
        if (match) {
          setViewing(match);
        }
      }
    });

    // Listen for dropdown updates
    const handleDropdownUpdate = (event) => {
      loadDropdownOptions();
    };

    const eventTypes = ['positions:updated', 'departments:updated', 'clients:updated', 'employeetypes:updated', 'accounttypes:updated'];
    eventTypes.forEach(eventType => {
      window.addEventListener(eventType, handleDropdownUpdate);
    });

    return () => {
      eventTypes.forEach(eventType => {
        window.removeEventListener(eventType, handleDropdownUpdate);
      });
    };
  }, []);

  const addEquipmentToIssued = (equipment) => {
    // Check if already added
    if (issuedEquipment.find(eq => eq.id === equipment.id)) {
      return;
    }
    setIssuedEquipment(prev => [...prev, equipment]);
  };

  const removeEquipmentFromIssued = (equipmentId) => {
    setIssuedEquipment(prev => prev.filter(eq => eq.id !== equipmentId));
  };

  const openEquipmentModal = () => {
    loadAvailableEquipment();
    setIsEquipmentModalOpen(true);
  };

  const closeEquipmentModal = () => {
    setIsEquipmentModalOpen(false);
    setEquipmentSearchTerm('');
  };

  const resetAll = () => {
    setForm({
      firstName: '',
      lastName: '',
      email: '',
      contact: '',
      employeeId: '',
      position: '',
      department: '',
      address: '',
      client: '',
      employeeType: 'Regular',
      issuedItem: '',
      status: 'active',
      createAccount: false,
      password: '',
      confirmPassword: '',
      role: 'employee'
    });
    setErrors({});
    setIssuedEquipment([]);
  };

  const closeModal = () => {
    setIsAddOpen(false);
    setErrors({});
  };

  const refreshEmployees = () => {
    fetchEmployees(searchTerm, filters);
  };

  const saveEmployee = () => {
    if (!validateForm()) {
      return;
    }

    // Prepare issued equipment data
    const equipmentData = issuedEquipment.map(eq => ({
      id: eq.id,
      name: eq.name,
      specs: eq.specs || eq.specifications || eq.description || 'N/A',
      serial_number: eq.serial_number
    }));

    fetch('/api/employees', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.contact.trim(),
        address: form.address.trim(),
        employee_type: form.employeeType,
        client: form.client.trim(),
        position: form.position.trim(),
        department: form.department.trim(),
        issued_item: JSON.stringify(equipmentData),
        issued_equipment_ids: issuedEquipment.map(eq => eq.id),
        status: 'active',
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          closeModal();
          resetAll();
          refreshEmployees();
          // Dispatch event to refresh equipment page
          window.dispatchEvent(new Event('equipment:updated'));
        } else {
          alert(data.message || 'Failed to save employee');
        }
      })
      .catch(() => alert('Failed to save employee'));
  };

  const openView = (emp) => setViewing(emp);
  const closeView = () => setViewing(null);

  const openEdit = (emp) => {
    setEditing(emp);
    setForm({
      firstName: emp.firstName || '',
      lastName: emp.lastName || '',
      email: emp.email || '',
      password: '',
      contact: emp.phone || '',
      address: emp.address || '',
      employeeType: emp.employeeType || 'Regular',
      client: emp.client || '',
      position: emp.position || '',
      department: emp.department || '',
      issuedItem: emp.issuedItem || ''
    });
    
    // Load issued equipment if exists
    if (emp.issuedItem) {
      try {
        const parsedEquipment = JSON.parse(emp.issuedItem);
        if (Array.isArray(parsedEquipment)) {
          setIssuedEquipment(parsedEquipment);
        }
      } catch (e) {
        setIssuedEquipment([]);
      }
    } else {
      setIssuedEquipment([]);
    }
    
    setErrors({});
    setIsAddOpen(false);
  };
  
  const closeEdit = () => { 
    setEditing(null); 
    resetAll(); 
  };

  const updateEmployee = () => {
    if (!validateForm(true)) {
      return;
    }

    if (!editing) return;
    
    // Prepare issued equipment data
    const equipmentData = issuedEquipment.map(eq => ({
      id: eq.id,
      name: eq.name,
      specs: eq.specs || eq.specifications || eq.description || 'N/A',
      serial_number: eq.serial_number
    }));
    
    fetch(`/api/employees/${editing.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password || undefined,
        phone: form.contact.trim(),
        address: form.address.trim(),
        employee_type: form.employeeType,
        client: form.client.trim(),
        position: form.position.trim(),
        department: form.department.trim(),
        issued_item: JSON.stringify(equipmentData),
        issued_equipment_ids: issuedEquipment.map(eq => eq.id),
        status: 'active'
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          closeEdit();
          refreshEmployees();
          // Dispatch event to refresh equipment page
          window.dispatchEvent(new Event('equipment:updated'));
        } else {
          alert(data.message || 'Failed to update employee');
        }
      })
      .catch(() => alert('Failed to update employee'));
  };

  const openDelete = (emp) => setDeleting(emp);
  const closeDelete = () => setDeleting(null);

  const confirmDelete = () => {
    if (!deleting) return;
    fetch(`/api/employees/${deleting.id}`, { method: 'DELETE', headers: { 'Accept': 'application/json' } })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          closeDelete();
          refreshEmployees();
          // Dispatch event to refresh equipment page
          window.dispatchEvent(new Event('equipment:updated'));
        } else {
          alert(data.message || 'Failed to delete employee');
        }
      })
      .catch(() => alert('Failed to delete employee'));
  };

  // Use employees directly since filtering is now done on the backend
  const filteredEmployees = employees;

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    fetchEmployees(searchTerm, newFilters);
  };

  const handleSearchChange = (newSearchTerm) => {
    setSearchTerm(newSearchTerm);
    fetchEmployees(newSearchTerm, filters);
  };

  // (components moved to top-level)

  return (
    <div className="h-screen overflow-hidden bg-white flex">
      <HomeSidebar />
      
      <div className="flex-1 flex flex-col">
        <GlobalHeader 
          title="Employees" 
          hideSearch={true}
          showTitle={true}
        />

        <div className="bg-white px-8 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search"
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-80"
                />
              </div>
              <EmployeeFilter
                selectedFilters={filters}
                onFilterChange={handleFilterChange}
                className="min-w-[120px]"
              />
            </div>
            <button 
              onClick={() => setIsAddOpen(true)} 
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Add New
            </button>
          </div>
        </div>

        <div className="flex-1 bg-white px-8 py-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-800">Employees</h2>
            {Object.keys(filters).length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {filteredEmployees.length} of {employees.length} employees
                </span>
                {Object.entries(filters).map(([key, value]) => (
                  value && value !== 'all' && (
                    <span key={key} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                      {key}: {value}
                    </span>
                  )
                ))}
              </div>
            )}
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-600">
                <div className="col-span-3">Name</div>
                <div className="col-span-2">Client</div>
                <div className="col-span-2">Position</div>
                <div className="col-span-2">Employee Type</div>
                <div className="col-span-1">Department</div>
                <div className="col-span-2 text-center">Actions</div>
              </div>
            </div>

            <div className="divide-y divide-gray-200">
              {filteredEmployees.length === 0 ? (
                <div className="py-8 text-center text-gray-500">No employees found.</div>
              ) : (
                filteredEmployees.map((e) => (
                  <div key={e.id} className="px-6 py-4 hover:bg-blue-50 transition-colors">
                    <div className="grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-3 flex items-center space-x-3">
                        <div className={`w-8 h-8 ${e.color} rounded-full text-white text-sm flex items-center justify-center font-medium`}>
                          {e.badge}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-gray-900 font-medium">{e.name}</span>
                          {e.user && (
                            <span className="text-xs text-green-600 font-medium">
                              ✓ Connected to {e.user.name}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="col-span-2 text-gray-600">{e.client}</div>
                      <div className="col-span-2 text-gray-600">{e.position}</div>
                      <div className="col-span-2 text-gray-600">{e.employeeType}</div>
                      <div className="col-span-1 text-gray-600">{e.department}</div>
                      <div className="col-span-2 flex items-center justify-center space-x-3">
                        <button
                          onClick={() => openView(e)}
                          className="text-gray-400 hover:text-blue-500 transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEdit(e)}
                          className="text-gray-400 hover:text-blue-500 transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openDelete(e)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* View Modal */}
        {viewing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/20" onClick={closeView} />
            <div className="relative bg-white rounded-3xl shadow-2xl w-[600px] max-w-[95vw] max-h-[90vh] overflow-y-auto p-6 border border-gray-200">
              <button onClick={closeView} className="absolute right-6 top-6 text-gray-400 hover:text-gray-600 text-xl">✕</button>
              <h3 className="text-2xl font-semibold text-blue-600 mb-8">Employee Details</h3>
              
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">First Name</label>
                  <div className="bg-gray-100 rounded-lg p-3 text-gray-900 w-full">
                    {viewing.firstName}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">Last Name</label>
                  <div className="bg-gray-100 rounded-lg p-3 text-gray-900 w-full">
                    {viewing.lastName}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">Email</label>
                  <div className="bg-gray-100 rounded-lg p-3 text-gray-900 w-full">
                    {viewing.email}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">User Account</label>
                  <div className="bg-gray-100 rounded-lg p-3 text-gray-900 w-full">
                    {viewing.user ? (
                      <div className="flex items-center space-x-2">
                        <span className="text-green-600 font-medium">✓ Connected</span>
                        <span className="text-gray-600">({viewing.user.name} - {viewing.user.role?.name || 'No role'})</span>
                      </div>
                    ) : (
                      <span className="text-gray-500">No user account connected</span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">Contact Number</label>
                  <div className="bg-gray-100 rounded-lg p-3 text-gray-900 w-full">
                    {viewing.phone}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">Address</label>
                  <div className="bg-gray-100 rounded-lg p-3 text-gray-900 w-full">
                    {viewing.address}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">Client</label>
                  <div className="bg-gray-100 rounded-lg p-3 text-gray-900 w-full">
                    {viewing.client}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">Employee Type</label>
                  <div className="bg-gray-100 rounded-lg p-3 text-gray-900 w-full">
                    {viewing.employeeType}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">Department</label>
                  <div className="bg-gray-100 rounded-lg p-3 text-gray-900 w-full">
                    {viewing.department}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">Position</label>
                  <div className="bg-gray-100 rounded-lg p-3 text-gray-900 w-full">
                    {viewing.position}
                  </div>
                </div>

              </div>

              {/* Issued Item Section - Full Width */}
              <div className="mt-6">
                <div className="space-y-4">
                  <label className="block text-sm text-gray-700 font-medium mb-2">
                    Issued Item
                  </label>
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-100 px-4 py-3 border-b border-gray-300">
                      <div className="grid grid-cols-3 gap-4 text-sm font-bold text-gray-800">
                        <div>Items</div>
                        <div>Specs</div>
                        <div>Serial no.</div>
                      </div>
                    </div>
                    <div className="max-h-40 overflow-y-auto">
                      <div className="divide-y divide-gray-200">
                        {viewing.issuedEquipment && viewing.issuedEquipment.length > 0 ? (
                          viewing.issuedEquipment.map((item, index) => (
                            <div key={index} className="px-4 py-3">
                              <div className="grid grid-cols-3 gap-4 items-center">
                                <div className="text-blue-600 underline cursor-pointer font-medium">
                                  {item.name || 'N/A'}
                                </div>
                                <div className="text-gray-700 text-sm leading-tight">
                                  {item.specifications || item.specs || 'N/A'}
                                </div>
                                <div className="text-gray-700 text-sm">
                                  {item.serial_number || 'N/A'}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-center text-gray-500">
                            No items issued
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Modal */}
        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/20" onClick={closeModal} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-[600px] max-w-[95vw] max-h-[70vh] overflow-y-auto p-6 border border-gray-200" style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}}>
              <button onClick={closeModal} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 text-xl">✕</button>
              <h3 className="text-xl font-semibold text-blue-500 text-center mb-8">Add employee</h3>

              <div className="grid grid-cols-2 gap-6">
                {/* LEFT SIDE - Z-pattern: 1, 3, 5, 7, 9 */}
                <div className="space-y-6">
                  <ValidatedInput 
                    label="First Name" 
                    value={form.firstName}
                    onChange={(val) => handleInputChange('firstName', val)}
                    placeholder="Enter first name" 
                    required={true}
                    error={errors.firstName}
                    tabIndex={1}
                  />
                  <ValidatedInput 
                    label="Email" 
                    value={form.email}
                    onChange={(val) => handleInputChange('email', val)}
                    type="email" 
                    placeholder="Enter email address" 
                    required={true}
                    error={errors.email}
                    tabIndex={3}
                  />
                  <ValidatedInput 
                    label="Contact Number" 
                    value={form.contact}
                    onChange={(val) => handleInputChange('contact', val)}
                    type="tel" 
                    placeholder="Enter phone number" 
                    required={true}
                    error={errors.contact}
                    tabIndex={5}
                  />
                  <ValidatedSelect
                    label="Client"
                    value={form.client}
                    onChange={(val) => handleInputChange('client', val)}
                    options={[
                      { value: '', label: 'Select client' },
                      ...dropdownOptions.clients
                    ]}
                    error={errors.client}
                    tabIndex={7}
                  />
                  <ValidatedSelect
                    label="Department"
                    value={form.department}
                    onChange={(val) => handleInputChange('department', val)}
                    options={[
                      { value: '', label: 'Select department' },
                      ...dropdownOptions.departments
                    ]}
                    error={errors.department}
                    tabIndex={9}
                  />
                </div>

                {/* RIGHT SIDE - Z-pattern: 2, 4, 6, 8, 10 */}
                <div className="space-y-6">
                  <ValidatedInput 
                    label="Last Name" 
                    value={form.lastName}
                    onChange={(val) => handleInputChange('lastName', val)}
                    placeholder="Enter last name" 
                    required={true}
                    error={errors.lastName}
                    tabIndex={2}
                  />
                  <ValidatedInput 
                    label="Address" 
                    value={form.address}
                    onChange={(val) => handleInputChange('address', val)}
                    placeholder="Enter complete address" 
                    required={true}
                    error={errors.address}
                    tabIndex={4}
                  />
                  <ValidatedSelect
                    label="Employee Type"
                    value={form.employeeType}
                    onChange={(val) => handleInputChange('employeeType', val)}
                    required={true}
                    options={[
                      { value: '', label: 'Select employee type' },
                      ...dropdownOptions.employeeTypes
                    ]}
                    error={errors.employeeType}
                    tabIndex={6}
                  />
                  <ValidatedSelect
                    label="Position"
                    value={form.position}
                    onChange={(val) => handleInputChange('position', val)}
                    options={[
                      { value: '', label: 'Select position' },
                      ...dropdownOptions.positions
                    ]}
                    error={errors.position}
                    tabIndex={8}
                  />
                </div>
              </div>

              {/* Issued Item Section - Full Width */}
              <div className="mt-6 mb-6">
                <div className="space-y-4">
                  <label className="block text-sm text-gray-700 font-medium mb-2">
                    Issued Item
                  </label>
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-100 px-4 py-3 border-b border-gray-300">
                      <div className="grid grid-cols-3 gap-4 text-sm font-bold text-gray-800">
                        <div>Items</div>
                        <div>Specs</div>
                        <div>Serial no.</div>
                      </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      <div className="divide-y divide-gray-200">
                        {issuedEquipment.length === 0 ? (
                          <div className="px-4 py-6 text-center text-gray-400 text-sm">
                            No equipment issued yet. Click "Add New" to assign equipment.
                          </div>
                        ) : (
                          issuedEquipment.map((equipment) => (
                            <div key={equipment.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                              <div className="flex items-start space-x-3">
                                {/* Equipment Image */}
                                {equipment.item_image ? (
                                  <img 
                                    src={`/storage/${equipment.item_image}`} 
                                    alt={equipment.name}
                                    className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                                    <span className="text-gray-400 text-xs">No img</span>
                                  </div>
                                )}
                                
                                {/* Equipment Details */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                      <h5 className="text-blue-600 font-medium text-sm truncate">
                                        {equipment.name || equipment.brand}
                                      </h5>
                                      <p className="text-gray-600 text-xs mt-0.5 line-clamp-1">
                                        {equipment.specifications || equipment.brand || 'No specifications'}
                                      </p>
                                      <p className="text-gray-500 text-xs mt-0.5">
                                        Serial: {equipment.serial_number || 'N/A'}
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => removeEquipmentFromIssued(equipment.id)}
                                      className="ml-2 text-red-500 hover:text-red-700 text-xs font-medium flex-shrink-0"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                      <button
                        type="button"
                        onClick={openEquipmentModal}
                        className="px-4 py-2 bg-blue-500 border border-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                        tabIndex={10}
                      >
                        Add New
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between">
                <button onClick={resetAll} className="text-blue-500 hover:text-blue-600 font-medium" tabIndex={12}>Reset all</button>
                <button onClick={saveEmployee} className="px-8 py-3 rounded-full bg-blue-500 text-white hover:bg-blue-600 font-medium transition-colors" tabIndex={11}>Save →</button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {editing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/20" onClick={closeEdit} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-[600px] max-w-[95vw] max-h-[70vh] overflow-y-auto p-6 border border-gray-200" style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}}>
              <button onClick={closeEdit} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 text-xl">✕</button>
              <h3 className="text-xl font-semibold text-blue-500 text-center mb-8">Edit employee</h3>
              <div className="grid grid-cols-2 gap-6">
                {/* LEFT SIDE - Z-pattern: 1, 3, 5, 7, 9 */}
                <div className="space-y-6">
                  <ValidatedInput 
                    label="First Name" 
                    value={form.firstName}
                    onChange={(val) => handleInputChange('firstName', val)}
                    placeholder="Enter first name" 
                    required={true}
                    error={errors.firstName}
                    tabIndex={1}
                  />
                  <ValidatedInput 
                    label="Email" 
                    value={form.email}
                    onChange={(val) => handleInputChange('email', val)}
                    type="email" 
                    placeholder="Enter email address" 
                    required={true}
                    error={errors.email}
                    tabIndex={3}
                  />
                  <ValidatedInput 
                    label="Contact Number" 
                    value={form.contact}
                    onChange={(val) => handleInputChange('contact', val)}
                    type="tel" 
                    placeholder="Enter phone number" 
                    required={true}
                    error={errors.contact}
                    tabIndex={5}
                  />
                  <ValidatedSelect
                    label="Client"
                    value={form.client}
                    onChange={(val) => handleInputChange('client', val)}
                    options={[
                      { value: '', label: 'Select client' },
                      ...dropdownOptions.clients
                    ]}
                    error={errors.client}
                    tabIndex={7}
                  />
                  <ValidatedSelect
                    label="Department"
                    value={form.department}
                    onChange={(val) => handleInputChange('department', val)}
                    options={[
                      { value: '', label: 'Select department' },
                      ...dropdownOptions.departments
                    ]}
                    error={errors.department}
                    tabIndex={9}
                  />
                </div>
                
                {/* RIGHT SIDE - Z-pattern: 2, 4, 6, 8, 10 */}
                <div className="space-y-6">
                  <ValidatedInput 
                    label="Last Name" 
                    value={form.lastName}
                    onChange={(val) => handleInputChange('lastName', val)}
                    placeholder="Enter last name" 
                    required={true}
                    error={errors.lastName}
                    tabIndex={2}
                  />
                  <ValidatedInput 
                    label="Address" 
                    value={form.address}
                    onChange={(val) => handleInputChange('address', val)}
                    placeholder="Enter complete address" 
                    required={true}
                    error={errors.address}
                    tabIndex={4}
                  />
                  <ValidatedSelect
                    label="Employee Type"
                    value={form.employeeType}
                    onChange={(val) => handleInputChange('employeeType', val)}
                    required={true}
                    options={[
                      { value: '', label: 'Select employee type' },
                      ...dropdownOptions.employeeTypes
                    ]}
                    error={errors.employeeType}
                    tabIndex={6}
                  />
                  <ValidatedSelect
                    label="Position"
                    value={form.position}
                    onChange={(val) => handleInputChange('position', val)}
                    options={[
                      { value: '', label: 'Select position' },
                      ...dropdownOptions.positions
                    ]}
                    error={errors.position}
                    tabIndex={8}
                  />
                </div>
              </div>

              {/* Issued Item Section - Full Width */}
              <div className="mt-6">
                <div className="space-y-4">
                  <label className="block text-sm text-gray-700 font-medium mb-2">
                    Issued Item
                  </label>
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-100 px-4 py-3 border-b border-gray-300">
                      <div className="grid grid-cols-3 gap-4 text-sm font-bold text-gray-800">
                        <div>Items</div>
                        <div>Specs</div>
                        <div>Serial no.</div>
                      </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      <div className="divide-y divide-gray-200">
                        {issuedEquipment.length === 0 ? (
                          <div className="px-4 py-6 text-center text-gray-400 text-sm">
                            No equipment issued yet. Click "Add New" to assign equipment.
                          </div>
                        ) : (
                          issuedEquipment.map((equipment) => (
                            <div key={equipment.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                              <div className="flex items-start space-x-3">
                                {/* Equipment Image */}
                                {equipment.item_image ? (
                                  <img 
                                    src={`/storage/${equipment.item_image}`} 
                                    alt={equipment.name}
                                    className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                                    <span className="text-gray-400 text-xs">No img</span>
                                  </div>
                                )}
                                
                                {/* Equipment Details */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                      <h5 className="text-blue-600 font-medium text-sm truncate">
                                        {equipment.name || equipment.brand}
                                      </h5>
                                      <p className="text-gray-600 text-xs mt-0.5 line-clamp-1">
                                        {equipment.specifications || equipment.brand || 'No specifications'}
                                      </p>
                                      <p className="text-gray-500 text-xs mt-0.5">
                                        Serial: {equipment.serial_number || 'N/A'}
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => removeEquipmentFromIssued(equipment.id)}
                                      className="ml-2 text-red-500 hover:text-red-700 text-xs font-medium flex-shrink-0"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                      <button
                        type="button"
                        onClick={openEquipmentModal}
                        className="px-4 py-2 bg-blue-500 border border-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                        tabIndex={10}
                      >
                        Add New
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between">
                <button onClick={resetAll} className="text-blue-500 hover:text-blue-600 font-medium" tabIndex={12}>Reset</button>
                <button onClick={updateEmployee} className="px-8 py-3 rounded-full bg-blue-500 text-white hover:bg-blue-600 font-medium transition-colors" tabIndex={11}>Update →</button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Modal */}
        {deleting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={closeDelete} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-[400px] max-w-[95vw] p-6 border border-gray-200">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                  <Trash2 className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Employee</h3>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete <span className="font-medium text-gray-900">{deleting.name}</span>? 
                  This action cannot be undone.
                </p>
                <div className="flex space-x-3 justify-center">
                  <button 
                    onClick={closeDelete}
                    className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 font-medium transition-colors"
                    tabIndex={1}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={confirmDelete}
                    className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 font-medium transition-colors"
                    tabIndex={2}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Equipment Selection Modal */}
        {isEquipmentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/30" onClick={closeEquipmentModal} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-[700px] max-w-[95vw] max-h-[80vh] overflow-hidden border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-blue-600">Select Equipment</h3>
                  <button onClick={closeEquipmentModal} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                </div>
                <div className="mt-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Search equipment..."
                      value={equipmentSearchTerm}
                      onChange={(e) => setEquipmentSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      tabIndex={1}
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 200px)' }}>
                <div className="space-y-3">
                  {availableEquipment
                    .filter(eq => 
                      eq.name?.toLowerCase().includes(equipmentSearchTerm.toLowerCase()) ||
                      eq.brand?.toLowerCase().includes(equipmentSearchTerm.toLowerCase()) ||
                      (eq.specifications && eq.specifications.toLowerCase().includes(equipmentSearchTerm.toLowerCase())) ||
                      (eq.serial_number && eq.serial_number.toLowerCase().includes(equipmentSearchTerm.toLowerCase())) ||
                      eq.category?.name?.toLowerCase().includes(equipmentSearchTerm.toLowerCase())
                    )
                    .map((equipment) => {
                      const isAdded = issuedEquipment.find(eq => eq.id === equipment.id);
                      return (
                        <div 
                          key={equipment.id} 
                          className={`p-4 border rounded-lg transition-all ${
                            isAdded ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-start justify-between space-x-4">
                            <div className="flex items-start space-x-4 flex-1">
                              {/* Equipment Image */}
                              {equipment.item_image ? (
                                <img 
                                  src={`/storage/${equipment.item_image}`} 
                                  alt={equipment.name}
                                  className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                                />
                              ) : (
                                <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                                  <span className="text-gray-400 text-xs">No img</span>
                                </div>
                              )}
                              
                              {/* Equipment Details */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-1">
                                  <h4 className="font-semibold text-gray-900 truncate">{equipment.name || equipment.brand}</h4>
                                  <span className={`px-2 py-0.5 text-xs rounded-full flex-shrink-0 ${
                                    equipment.status === 'available' || equipment.status === 'Available'
                                      ? 'bg-green-100 text-green-700' 
                                      : 'bg-gray-100 text-gray-700'
                                  }`}>
                                    {equipment.status}
                                  </span>
                                </div>
                                
                                {equipment.brand && equipment.name !== equipment.brand && (
                                  <p className="text-sm text-gray-600 mb-1">{equipment.brand}</p>
                                )}
                                
                                <p className="text-sm text-gray-600 mb-1">
                                  {equipment.specifications || 'No specifications'}
                                </p>
                                
                                <div className="flex items-center space-x-4 text-xs text-gray-500 mt-2">
                                  <span>
                                    <span className="font-medium">Category:</span> {equipment.category?.name || 'Uncategorized'}
                                  </span>
                                  <span>
                                    <span className="font-medium">Serial:</span> {equipment.serial_number || 'N/A'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Add/Remove Button */}
                            <button
                              onClick={() => isAdded ? removeEquipmentFromIssued(equipment.id) : addEquipmentToIssued(equipment)}
                              className={`px-4 py-2 rounded-lg font-medium transition-colors flex-shrink-0 ${
                                isAdded 
                                  ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                                  : 'bg-blue-500 text-white hover:bg-blue-600'
                              }`}
                            >
                              {isAdded ? 'Remove' : 'Add'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  {availableEquipment.filter(eq => 
                    eq.name?.toLowerCase().includes(equipmentSearchTerm.toLowerCase()) ||
                    eq.brand?.toLowerCase().includes(equipmentSearchTerm.toLowerCase()) ||
                    (eq.specifications && eq.specifications.toLowerCase().includes(equipmentSearchTerm.toLowerCase())) ||
                    (eq.serial_number && eq.serial_number.toLowerCase().includes(equipmentSearchTerm.toLowerCase())) ||
                    eq.category?.name?.toLowerCase().includes(equipmentSearchTerm.toLowerCase())
                  ).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      {equipmentSearchTerm ? 'No equipment found matching your search.' : 'No available equipment at the moment.'}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {issuedEquipment.length} equipment selected
                  </span>
                  <button
                    onClick={closeEquipmentModal}
                    className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium transition-colors"
                    tabIndex={2}
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeePage;