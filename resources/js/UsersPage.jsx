import React, { useEffect, useState } from "react";
import { Search, Eye, Edit, Trash2, Plus, Bell, Settings, ArrowRight, X } from "lucide-react";
import HomeSidebar from "./HomeSidebar";
import GlobalHeader from "./components/GlobalHeader";

const UsersPage = () => {
  const [admins, setAdmins] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [activeFilter, setActiveFilter] = useState("ADMIN"); // ADMIN or EMPLOYEE

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newUser, setNewUser] = useState({ 
    name: "", 
    username: "", 
    email: "", 
    password: "",
    confirmPassword: "",
    accountType: "" 
  });

  // Load users from API
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoadingUsers(true);
        setUsersError("");
        const res = await fetch('/api/users');
        const json = await res.json();
        if (json.success && json.data) {
          // Map admin users (excluding Super Admin)
          const adminUsers = json.data.admins
            .filter(user => user.role?.name !== 'super_admin' && user.role?.display_name !== 'Super Admin')
            .map(user => ({
              id: user.id,
              name: user.name,
              username: user.employee_id || user.email.split('@')[0],
              email: user.email,
              accountType: user.role ? user.role.display_name : 'Admin',
              role: user.role,
              position: user.position,
              department: user.department,
              phone: user.phone,
              is_active: user.is_active
            }));
          
          // Map employee users
          const employeeUsers = json.data.employees.map(user => ({
            id: user.id,
            name: user.name,
            username: user.employee_id || user.email.split('@')[0],
            email: user.email,
            accountType: user.role ? user.role.display_name : 'Employee',
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

  const handleAddUser = async () => {
    if (newUser.name && newUser.username && newUser.email && newUser.password && newUser.confirmPassword) {
      if (newUser.password !== newUser.confirmPassword) {
        alert("Passwords do not match!");
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
            name: newUser.name,
            email: newUser.email,
            password: newUser.password,
            accountType: activeFilter === "ADMIN" ? "admin" : "employee",
            username: newUser.username,
            position: "Employee",
            department: null,
            phone: null,
          }),
        });

        const result = await response.json();
        
        if (result.success) {
          window.location.reload();
        } else {
          alert(result.message || 'Failed to create user');
        }
      } catch (error) {
        console.error('Error creating user:', error);
        alert('Failed to create user. Please try again.');
      }
      
      setNewUser({ name: "", username: "", email: "", password: "", confirmPassword: "", accountType: "" });
      setShowAddModal(false);
    }
  };

  const handleEditUser = async () => {
    if (selectedUser && newUser.name && newUser.username && newUser.email) {
      try {
        const response = await fetch(`/api/users/${selectedUser.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
          },
          body: JSON.stringify({
            name: newUser.name,
            email: newUser.email,
            password: newUser.password || null,
            accountType: selectedUser?.accountType === "IT Admin" ? "admin" : "employee",
            username: newUser.username,
            position: selectedUser.position || "Employee",
            department: selectedUser.department || null,
            phone: selectedUser.phone || null,
          }),
        });

        const result = await response.json();
        
        if (result.success) {
          window.location.reload();
        } else {
          alert(result.message || 'Failed to update user');
        }
      } catch (error) {
        console.error('Error updating user:', error);
        alert('Failed to update user. Please try again.');
      }
      
      setSelectedUser(null);
      setNewUser({ name: "", username: "", email: "", password: "", confirmPassword: "", accountType: "" });
      setShowEditModal(false);
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

  const openEditModal = (user) => {
    setSelectedUser(user);
    setNewUser({
      name: user.name,
      username: user.username,
      email: user.email,
      password: "",
      confirmPassword: "",
      accountType: user.accountType
    });
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
      // Prefer email; fallback to employee_id/username
      const query = email ? `email=${email}` : (employeeId ? `employee_id=${employeeId}` : '');
      const url = query ? `/employee?${query}` : '/employee';
      window.location.href = url;
    } catch (e) {
      console.error('Failed to redirect to employee page:', e);
      window.location.href = '/employee';
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-white flex">
      {/* Sidebar */}
      <HomeSidebar />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <GlobalHeader title="Users" />

        {/* Page Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          {/* Page Title */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-blue-600">Users</h1>
          </div>

          {/* Filter Buttons */}
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
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center px-4 py-2 border border-blue-600 text-blue-600 bg-white rounded-lg hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">{activeFilter === "ADMIN" ? "Admin" : "Employees"}</h2>
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loadingUsers && (
                    <tr>
                      <td colSpan="5" className="px-6 py-4 text-sm text-gray-500 text-center">Loading...</td>
                    </tr>
                  )}
                  {usersError && !loadingUsers && (
                    <tr>
                      <td colSpan="5" className="px-6 py-4 text-sm text-red-600 text-center">{usersError}</td>
                    </tr>
                  )}
                  {!loadingUsers && !usersError && (activeFilter === "ADMIN" ? admins : employees).map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {user.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.username}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.accountType}
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
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-8 py-6 rounded-t-xl border-b border-blue-200">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-blue-700">Add User</h3>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setNewUser({ name: "", username: "", email: "", password: "", confirmPassword: "", accountType: "" });
                  }}
                  className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-white hover:shadow-md transition-all duration-200"
                  title="Close"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            {/* Form Content */}
            <div className="p-8 bg-white">
              <div className="grid grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name<span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email<span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password<span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                {/* Right Column */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Username<span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newUser.username}
                      onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Account type
                    </label>
                    <div className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-gray-600">
                      {activeFilter === "ADMIN" ? "IT Admin" : "Employee"}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm Password<span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={newUser.confirmPassword}
                      onChange={(e) => setNewUser({ ...newUser, confirmPassword: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setNewUser({ name: "", username: "", email: "", password: "", confirmPassword: "", accountType: "" });
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
              {/* Header with title and close button */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-blue-600">Edit User</h3>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedUser(null);
                    setNewUser({ name: "", username: "", email: "", password: "", confirmPassword: "", accountType: "" });
                  }}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                  title="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name<span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email<span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password<span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                {/* Right Column */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Username<span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newUser.username}
                      onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
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
                      Confirm Password<span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={newUser.confirmPassword}
                      onChange={(e) => setNewUser({ ...newUser, confirmPassword: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex justify-between mt-6">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedUser(null);
                    setNewUser({ name: "", username: "", email: "", password: "", confirmPassword: "", accountType: "" });
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
                <div><span className="text-gray-500">Username:</span> <span className="text-gray-900">{selectedUser?.username}</span></div>
                <div><span className="text-gray-500">Email:</span> <span className="text-gray-900">{selectedUser?.email}</span></div>
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