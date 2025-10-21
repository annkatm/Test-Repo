import React, { useEffect, useState } from "react";
import { Search, Eye, EyeOff, Edit, Trash2, Plus, Bell, Settings, ArrowRight, X, AlertCircle, ChevronDown } from "lucide-react";
import HomeSidebar from "./HomeSidebar";
import GlobalHeader from "./components/GlobalHeader";

const UsersPage = () => {
  const [admins, setAdmins] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [employeesList, setEmployeesList] = useState([]); // For dropdown
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [activeFilter, setActiveFilter] = useState("ADMIN");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState("");
  
  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [newUser, setNewUser] = useState({ 
    name: "", 
    username: "", 
    email: "", 
    password: "",
    confirmPassword: "",
    accountType: "",
    position: ""
  });

  const [errors, setErrors] = useState({});

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password) => {
    return password.length >= 8;
  };

  const validateForm = (isEdit = false) => {
    const newErrors = {};

    // Name validation (required)
    if (!newUser.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (newUser.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    // Email validation
    if (!newUser.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(newUser.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!isEdit && !newUser.password) {
      newErrors.password = 'Password is required';
    } else if (newUser.password && !validatePassword(newUser.password)) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    // Confirm password validation
    if (!isEdit && !newUser.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (newUser.password && newUser.password !== newUser.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Position validation (ADMIN only)
    if (activeFilter === "ADMIN" && !newUser.position.trim()) {
      newErrors.position = 'Position is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Load users from API
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoadingUsers(true);
        setUsersError("");
        const res = await fetch('/api/users');
        const json = await res.json();
        if (json.success && json.data) {
          const adminUsers = json.data.admins
            .filter(user => user.role?.name !== 'super_admin' && user.role?.display_name !== 'Super Admin')
            .map(user => ({
              id: user.id,
              name: user.name,
              username: user.employee_id || user.email.split('@')[0],
              email: user.email,
              accountType: user.role ? user.role.display_name : 'Admin',
              employeeType: user.employee_type || 'Regular',
              role: user.role,
              position: user.position,
              department: user.department,
              phone: user.phone,
              is_active: user.is_active
            }));
          
          const employeeUsers = json.data.employees.map(user => ({
            id: user.id,
            name: user.name,
            username: user.employee_id || user.email.split('@')[0],
            email: user.email,
            accountType: user.role ? user.role.display_name : 'Employee',
            employeeType: user.employee_type || 'Regular',
            role: user.role,
            position: user.position,
            department: user.department,
            phone: user.phone,
            is_active: user.is_active
          }));
          
          setAdmins(adminUsers);
          setEmployees(employeeUsers);
        } else {
          setUsersError(json.message || 'Failed to load users');
        }
      } catch (err) {
        setUsersError(err?.message || 'Failed to load users');
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchUsers();
  }, []);

  // Load employees list for dropdown
  useEffect(() => {
    const fetchEmployeesList = async () => {
      try {
        setLoadingEmployees(true);
        const res = await fetch('/api/employees');
        const json = await res.json();
        if (json.success && json.data) {
          // Filter out employees who already have user accounts connected
          const employeesData = json.data
            .filter(emp => !emp.user_id) // Only show employees without user connections
            .map(emp => ({
              id: emp.id,
              name: `${emp.first_name} ${emp.last_name}`.trim(),
              email: emp.email,
              employeeType: emp.employee_type || 'Regular',
              position: emp.position,
              department: emp.department
            }));
          setEmployeesList(employeesData);
        }
      } catch (err) {
        console.error('Failed to load employees list:', err);
      } finally {
        setLoadingEmployees(false);
      }
    };
    fetchEmployeesList();
  }, []);

  const handleEmployeeSelect = (employee) => {
    setSelectedEmployee(employee);
    setNewUser(prev => ({
      ...prev,
      name: employee.name,
      email: employee.email,
      position: employee.position || '', // Use position from employee data
      username: employee.email.split('@')[0] // Auto-generate username from email
    }));
    setShowEmployeeDropdown(false);
    setEmployeeSearchTerm(employee.name);
    
    // Clear errors when employee is selected
    setErrors({});
  };

  const filteredEmployees = employeesList.filter(emp =>
    emp.name.toLowerCase().includes(employeeSearchTerm.toLowerCase())
  );

  const handleAddUser = async () => {
    if (!validateForm()) {
      return;
    }
    
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
        body: JSON.stringify({
          name: newUser.name.trim(),
          email: newUser.email.trim(),
          password: newUser.password,
          accountType: activeFilter === "ADMIN" ? "admin" : "employee",
          username: newUser.username.trim() || newUser.email.split('@')[0], // Auto-generate if not provided
          position: newUser.position.trim() || selectedEmployee?.position || "Employee",
          department: selectedEmployee?.department || null,
          phone: null,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        // If an employee was selected, automatically connect the employee to the user
        if (selectedEmployee) {
          try {
            const connectResponse = await fetch(`/api/employees/${selectedEmployee.id}/connect-user`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
              },
              body: JSON.stringify({
                user_id: result.data.id
              }),
            });

            const connectResult = await connectResponse.json();
            
            if (!connectResult.success) {
              console.warn('User created but failed to connect to employee:', connectResult.message);
              // Still reload the page since user was created successfully
            } else {
              // Show success message for automatic connection
              console.log(`User account created and automatically connected to employee: ${selectedEmployee.name}`);
            }
          } catch (connectError) {
            console.error('Error connecting employee to user:', connectError);
            // Still reload the page since user was created successfully
          }
        }
        
        window.location.reload();
      } else {
        alert(result.message || 'Failed to create user');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Failed to create user. Please try again.');
    }
  };

  const handleEditUser = async () => {
    if (!validateForm(true)) {
      return;
    }

    if (selectedUser) {
      try {
        const response = await fetch(`/api/users/${selectedUser.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
          },
          body: JSON.stringify({
            name: newUser.name.trim(),
            email: newUser.email.trim(),
            password: newUser.password || null,
            accountType: selectedUser?.accountType === "IT Admin" ? "admin" : "employee",
            username: newUser.username.trim() || newUser.email.split('@')[0],
            position: newUser.position.trim() || selectedUser.position || "Employee",
            department: selectedUser.department || null,
            phone: selectedUser.phone || null,
          }),
        });

        const result = await response.json();
        
        if (result.success) {
          // If an employee was selected, automatically connect the employee to the user
          if (selectedEmployee) {
            try {
              const connectResponse = await fetch(`/api/employees/${selectedEmployee.id}/connect-user`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                  'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({
                  user_id: selectedUser.id
                }),
              });

              const connectResult = await connectResponse.json();
              
              if (!connectResult.success) {
                console.warn('User updated but failed to connect to employee:', connectResult.message);
                // Still reload the page since user was updated successfully
              } else {
                // Show success message for automatic connection
                console.log(`User account updated and automatically connected to employee: ${selectedEmployee.name}`);
              }
            } catch (connectError) {
              console.error('Error connecting employee to user:', connectError);
              // Still reload the page since user was updated successfully
            }
          }
          
          window.location.reload();
        } else {
          alert(result.message || 'Failed to update user');
        }
      } catch (error) {
        console.error('Error updating user:', error);
        alert('Failed to update user. Please try again.');
      }
    }
  };

  const handleDeleteUser = async () => {
    if (selectedUser) {
      try {
        const response = await fetch(`/api/users/${selectedUser.id}`, {
          method: 'DELETE',
          headers: {
            'Accept': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
          },
        });

        const result = await response.json();
        
        if (result.success) {
          window.location.reload();
        } else {
          alert(result.message || 'Failed to delete user');
        }
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('Failed to delete user. Please try again.');
      }
      
      setSelectedUser(null);
      setShowDeleteModal(false);
    }
  };

  const resetForm = () => {
    setNewUser({ 
      name: "", 
      username: "", 
      email: "", 
      password: "",
      confirmPassword: "",
      accountType: "",
      position: ""
    });
    setSelectedEmployee(null);
    setEmployeeSearchTerm("");
    setErrors({});
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setNewUser({
      name: user.name,
      username: user.username,
      email: user.email,
      password: "",
      confirmPassword: "",
      accountType: user.accountType,
      position: user.position || ""
    });
    setErrors({});
    setShowPassword(false);
    setShowConfirmPassword(false);
    setShowEditModal(true);
  };

  const openDeleteModal = (user) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const openViewModal = (user) => {
    setSelectedUser(user);
    setShowViewModal(true);
  };

  const viewAsEmployee = (user) => {
    try {
      const email = encodeURIComponent(user.email || '');
      const employeeId = encodeURIComponent(user.username || '');
      const query = email ? `email=${email}` : (employeeId ? `employee_id=${employeeId}` : '');
      const url = query ? `/employee?${query}` : '/employee';
      window.location.href = url;
    } catch (e) {
      console.error('Failed to redirect to employee page:', e);
      window.location.href = '/employee';
    }
  };

  // Handle input changes
  const handleInputChange = (field, value) => {
    setNewUser(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-white flex">
      {/* Add CSS to hide browser's default password reveal button */}
      <style>
        {`
          input[type="password"]::-ms-reveal,
          input[type="password"]::-ms-clear {
            display: none;
          }
          input[type="password"]::-webkit-credentials-auto-fill-button,
          input[type="password"]::-webkit-strong-password-auto-fill-button {
            display: none !important;
          }
        `}
      </style>
      
      <HomeSidebar />
      
      <div className="flex-1 flex flex-col">
        <GlobalHeader title="Users" />

        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-blue-600">Users</h1>
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex space-x-4">
                <button
                  onClick={() => setActiveFilter("ADMIN")}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors duration-200 ${
                    activeFilter === "ADMIN"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  ADMIN
                </button>
                <button
                  onClick={() => setActiveFilter("EMPLOYEE")}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors duration-200 ${
                    activeFilter === "EMPLOYEE"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  EMPLOYEE
                </button>
              </div>
              <button
                onClick={openAddModal}
                className="inline-flex items-center px-4 py-2 border border-blue-600 text-blue-600 bg-white rounded-lg hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </button>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">{activeFilter === "ADMIN" ? "Admin" : "Employees"}</h2>
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {activeFilter === "ADMIN" ? "Account type" : "Employee Type"}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loadingUsers && (
                    <tr>
                      <td colSpan="4" className="px-6 py-4 text-sm text-gray-500 text-center">Loading...</td>
                    </tr>
                  )}
                  {usersError && !loadingUsers && (
                    <tr>
                      <td colSpan="4" className="px-6 py-4 text-sm text-red-600 text-center">{usersError}</td>
                    </tr>
                  )}
                  {!loadingUsers && !usersError && (activeFilter === "ADMIN" ? admins : employees).map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {user.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {activeFilter === "ADMIN" ? user.accountType : user.employeeType}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button onClick={() => openViewModal(user)} className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-100" title="View User">
                            <Eye className="h-4 w-4" />
                          </button>
                          {activeFilter === 'EMPLOYEE' && (
                            <button onClick={() => viewAsEmployee(user)} className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50" title="View Employee Profile">
                              <ArrowRight className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => openEditModal(user)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50" 
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(user)}
                            className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50" 
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white backdrop-blur-md rounded-xl shadow-2xl w-full max-w-3xl p-6 border border-white/20">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-8 py-6 rounded-t-xl border-b border-blue-200">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-blue-700">Add User</h3>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-white hover:shadow-md transition-all duration-200"
                  title="Close"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="p-8 bg-white">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  {/* Name Field - Searchable dropdown for both ADMIN and EMPLOYEE */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name<span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={employeeSearchTerm}
                        onChange={(e) => {
                          setEmployeeSearchTerm(e.target.value);
                          setShowEmployeeDropdown(true);
                        }}
                        onFocus={() => setShowEmployeeDropdown(true)}
                        className={`w-full border rounded-md px-3 py-2 pr-8 focus:outline-none focus:ring-2 ${
                          errors.name 
                            ? 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50' 
                            : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                        }`}
                        placeholder="Search and select employee..."
                      />
                      <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      
                      {showEmployeeDropdown && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {loadingEmployees ? (
                            <div className="px-3 py-2 text-gray-500">Loading employees...</div>
                          ) : filteredEmployees.length > 0 ? (
                            filteredEmployees.map((employee) => (
                              <button
                                key={employee.id}
                                onClick={() => handleEmployeeSelect(employee)}
                                className="w-full text-left px-3 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                              >
                                <div className="font-medium">{employee.name}</div>
                                <div className="text-xs text-gray-500">{employee.email} • {employee.position || employee.employeeType}</div>
                              </button>
                            ))
                          ) : (
                            <div className="px-3 py-2 text-gray-500">No employees found</div>
                          )}
                        </div>
                      )}
                    </div>
                    {errors.name && (
                      <div className="flex items-center mt-1 text-red-500 text-xs">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {errors.name}
                      </div>
                    )}
                  </div>

                  {/* Email Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email<span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                      className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 ${
                        errors.email 
                          ? 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50' 
                          : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                      }`}
                      placeholder="Enter email address"
                    />
                    {errors.email && (
                      <div className="flex items-center mt-1 text-red-500 text-xs">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {errors.email}
                      </div>
                    )}
                  </div>
                  
                  {/* Password Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password<span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={newUser.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        className={`w-full border rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 ${
                          errors.password 
                            ? 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50' 
                            : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                        }`}
                        placeholder="Enter password"
                        style={{
                          WebkitTextSecurity: showPassword ? 'none' : 'disc',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 z-10"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <div className="flex items-center mt-1 text-red-500 text-xs">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {errors.password}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="space-y-4">
                  {/* ADMIN: Position (read-only, tab skipped). EMPLOYEE: Employee Type (read-only, tab skipped) */}
                  {activeFilter === 'ADMIN' ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                      <input
                        type="text"
                        value={newUser.position || (selectedEmployee ? selectedEmployee.position : '')}
                        readOnly
                        tabIndex={-1}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-gray-600"
                        placeholder="Select employee first"
                      />
                      {errors.position && (
                        <div className="flex items-center mt-1 text-red-500 text-xs">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          {errors.position}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Employee Type</label>
                      <input
                        type="text"
                        value={selectedEmployee ? (selectedEmployee.employeeType || selectedEmployee.position || '') : ''}
                        readOnly
                        tabIndex={-1}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-gray-600"
                        placeholder="Select employee first"
                      />
                    </div>
                  )}

                  {/* Account Type Field - Auto-filled based on filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Account type
                    </label>
                    <div className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-gray-600">
                      {activeFilter === "ADMIN" ? "ADMIN" : "Employee"}
                    </div>
                  </div>
                  
                  {/* Confirm Password Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm Password<span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={newUser.confirmPassword}
                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                        className={`w-full border rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 ${
                          errors.confirmPassword 
                            ? 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50' 
                            : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                        }`}
                        placeholder="Confirm password"
                        style={{
                          WebkitTextSecurity: showConfirmPassword ? 'none' : 'disc',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 z-10"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <div className="flex items-center mt-1 text-red-500 text-xs">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {errors.confirmPassword}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="inline-flex items-center px-6 py-3 border-2 border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                >
                  <X className="h-4 w-4 mr-2" />
                  Back
                </button>
                <button
                  onClick={handleAddUser}
                  className="inline-flex items-center px-8 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Submit
                  <ArrowRight className="h-4 w-4 ml-2" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="relative bg-white backdrop-blur-md rounded-lg shadow-xl w-full max-w-2xl mx-4 border border-white/20">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-blue-600">Edit User</h3>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedUser(null);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                  title="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name<span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newUser.name}
                      onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                      className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 ${
                        errors.name 
                          ? 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50' 
                          : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                      }`}
                      placeholder="Enter full name"
                    />
                    {errors.name && (
                      <div className="flex items-center mt-1 text-red-500 text-xs">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {errors.name}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email<span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                      className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 ${
                        errors.email 
                          ? 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50' 
                          : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                      }`}
                      placeholder="Enter email address"
                    />
                    {errors.email && (
                      <div className="flex items-center mt-1 text-red-500 text-xs">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {errors.email}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={newUser.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        className={`w-full border rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 ${
                          errors.password 
                            ? 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50' 
                            : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                        }`}
                        placeholder="Leave blank to keep current password"
                        style={{
                          WebkitTextSecurity: showPassword ? 'none' : 'disc',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 z-10"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <div className="flex items-center mt-1 text-red-500 text-xs">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {errors.password}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Position
                    </label>
                    <input
                      type="text"
                      value={newUser.position || ''}
                      onChange={(e) => setNewUser(prev => ({ ...prev, position: e.target.value }))}
                      className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 ${
                        errors.position ? 'border-red-500 focus:ring-red-500 bg-red-50' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                      }`}
                      placeholder="Enter position"
                    />
                    {errors.position && (
                      <div className="flex items-center mt-1 text-red-500 text-xs">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {errors.position}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Account type
                    </label>
                    <div className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-gray-600">
                      {selectedUser?.accountType || "Employee"}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={newUser.confirmPassword}
                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                        className={`w-full border rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 ${
                          errors.confirmPassword 
                            ? 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50' 
                            : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                        }`}
                        placeholder="Confirm new password"
                        style={{
                          WebkitTextSecurity: showConfirmPassword ? 'none' : 'disc',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 z-10"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <div className="flex items-center mt-1 text-red-500 text-xs">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {errors.confirmPassword}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between mt-6">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedUser(null);
                    resetForm();
                  }}
                  className="inline-flex items-center px-6 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <X className="h-4 w-4 mr-2" />
                  Back
                </button>
                <button
                  onClick={handleEditUser}
                  className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Update User
                  <ArrowRight className="h-4 w-4 ml-2" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="relative p-5 border border-gray-200 w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Delete User</h3>
              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to delete the user "{selectedUser?.name}"? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedUser(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteUser}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View User Modal */}
      {showViewModal && (
        <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="relative bg-white backdrop-blur-md rounded-lg shadow-xl w-full max-w-md mx-4 border border-white/20">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-blue-600">User Details</h3>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedUser(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                  title="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-3 text-sm">
                <div><span className="text-gray-500">Name:</span> <span className="text-gray-900">{selectedUser?.name}</span></div>
                <div><span className="text-gray-500">Email:</span> <span className="text-gray-900">{selectedUser?.email}</span></div>
                <div><span className="text-gray-500">Position:</span> <span className="text-gray-900">{selectedUser?.position || 'N/A'}</span></div>
                <div><span className="text-gray-500">Account type:</span> <span className="text-gray-900">{selectedUser?.accountType}</span></div>
              </div>
              <div className="mt-6 text-right">
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedUser(null);
                  }}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default UsersPage;