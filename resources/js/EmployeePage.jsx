import React, { useState, useEffect } from 'react';
import HomeSidebar from './HomeSidebar';
import GlobalHeader from './components/GlobalHeader';
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

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone) => {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
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

    // Password validation (required for new employees, optional for edit)
    if (!isEdit && !form.password) {
      newErrors.password = 'Password is required';
    } else if (form.password && !validatePassword(form.password)) {
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

  useEffect(() => {
    // Load dropdown options first
    loadDropdownOptions();

    // Support deep-linking via /employee?email=... or ?employee_id=...
    const params = new URLSearchParams(window.location.search);
    const filterEmail = params.get('email');
    const filterEmpId = params.get('employee_id');

    fetch('/api/employees')
      .then(res => res.json())
      .then(data => {
        console.log('API Response:', data);

        let list = [];
        if (data.success && Array.isArray(data.data)) {
          list = data.data.map(e => ({
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
            badge: (e.first_name?.[0] || '').toUpperCase(),
            color: getBadgeColor(e.first_name)
          }));
        }

        if (filterEmail || filterEmpId) {
          const match = list.find(e => (filterEmail && e.email?.toLowerCase() === filterEmail.toLowerCase()) || (filterEmpId && (e.employeeId === filterEmpId || e.name?.toLowerCase().includes(filterEmpId.toLowerCase()))));
          if (match) {
            setViewing(match);
          }
        }

        setEmployees(list);
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
  };

  const closeModal = () => {
    setIsAddOpen(false);
    setErrors({});
  };

  const refreshEmployees = () => {
    fetch('/api/employees')
      .then(res => res.json())
      .then(data => {
        console.log('API Response:', data);
        if (data.success && Array.isArray(data.data)) {
          setEmployees(data.data.map(e => ({
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
            badge: (e.first_name?.[0] || '').toUpperCase(),
            color: getBadgeColor(e.first_name)
          })));
        }
      });
  };

  const saveEmployee = () => {
    if (!validateForm()) {
      return;
    }

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
        password: form.password,
        phone: form.contact.trim(),
        address: form.address.trim(),
        employee_type: form.employeeType,
        client: form.client.trim(),
        position: form.position.trim(),
        department: form.department.trim(),
        issued_item: form.issuedItem.trim(),
        status: 'active',
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          closeModal();
          resetAll();
          refreshEmployees();
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
        issued_item: form.issuedItem.trim(),
        status: 'active'
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          closeEdit();
          refreshEmployees();
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
        } else {
          alert(data.message || 'Failed to delete employee');
        }
      })
      .catch(() => alert('Failed to delete employee'));
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (emp.position || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (emp.department || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (emp.client || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-80"
                />
              </div>
              <button className="px-4 py-2 bg-gray-200 text-gray-600 rounded-lg">
                Filter
              </button>
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
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Employees</h2>
          
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
                        <span className="text-gray-900 font-medium">{e.name}</span>
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
            <div className="relative bg-white rounded-3xl shadow-2xl w-[700px] max-w-[95vw] p-8 border border-gray-200">
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
                  <label className="block text-xs font-medium text-gray-500 mb-2">Password</label>
                  <div className="bg-gray-100 rounded-lg p-3 flex items-center justify-end w-full">
                    <button className="text-gray-400 hover:text-gray-600">
                      <Eye className="h-4 w-4" />
                    </button>
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

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">Issued Item</label>
                  <div className="bg-gray-100 rounded-lg p-3 text-gray-900 w-full">
                    {viewing.issuedItem}
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
            <div className="relative bg-white rounded-2xl shadow-2xl w-[700px] max-w-[95vw] p-8 border border-gray-200">
              <button onClick={closeModal} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 text-xl">✕</button>
              <h3 className="text-xl font-semibold text-blue-500 text-center mb-8">Add employee</h3>

              <div className="grid grid-cols-2 gap-6">
                {/* LEFT SIDE */}
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
                  <ValidatedInput 
                    label="Issued Item" 
                    value={form.issuedItem}
                    onChange={(val) => handleInputChange('issuedItem', val)}
                    placeholder="Enter issued item" 
                    error={errors.issuedItem}
                    tabIndex={11}
                  />
                </div>

                {/* RIGHT SIDE */}
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
                    label="Password" 
                    value={form.password}
                    onChange={(val) => handleInputChange('password', val)}
                    type="password" 
                    placeholder="Enter password" 
                    required={true}
                    error={errors.password}
                    tabIndex={4}
                  />
                  <ValidatedInput 
                    label="Address" 
                    value={form.address}
                    onChange={(val) => handleInputChange('address', val)}
                    placeholder="Enter complete address" 
                    required={true}
                    error={errors.address}
                    tabIndex={6}
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
                    tabIndex={8}
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
                    tabIndex={10}
                  />
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between">
                <button onClick={resetAll} className="text-blue-500 hover:text-blue-600 font-medium">Reset all</button>
                <button onClick={saveEmployee} className="px-8 py-3 rounded-full bg-blue-500 text-white hover:bg-blue-600 font-medium transition-colors">Save →</button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {editing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/20" onClick={closeEdit} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-[700px] max-w-[95vw] p-8 border border-gray-200">
              <button onClick={closeEdit} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 text-xl">✕</button>
              <h3 className="text-xl font-semibold text-blue-500 text-center mb-8">Edit employee</h3>
              <div className="grid grid-cols-2 gap-6">
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
                  <ValidatedInput 
                    label="Issued Item" 
                    value={form.issuedItem}
                    onChange={(val) => handleInputChange('issuedItem', val)}
                    placeholder="Enter issued item" 
                    error={errors.issuedItem}
                    tabIndex={11}
                  />
                </div>
                
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
                    label="Password" 
                    value={form.password}
                    onChange={(val) => handleInputChange('password', val)}
                    type="password" 
                    placeholder="Leave blank to keep current password" 
                    tabIndex={4}
                  />
                  <ValidatedInput 
                    label="Address" 
                    value={form.address}
                    onChange={(val) => handleInputChange('address', val)}
                    placeholder="Enter complete address" 
                    required={true}
                    error={errors.address}
                    tabIndex={6}
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
                    tabIndex={8}
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
                    tabIndex={10}
                  />
                </div>
              </div>
              <div className="mt-8 flex items-center justify-between">
                <button onClick={resetAll} className="text-blue-500 hover:text-blue-600 font-medium">Reset</button>
                <button onClick={updateEmployee} className="px-8 py-3 rounded-full bg-blue-500 text-white hover:bg-blue-600 font-medium transition-colors">Update →</button>
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
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={confirmDelete}
                    className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 font-medium transition-colors"
                  >
                    Delete
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