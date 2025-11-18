import React, { useState, useEffect } from 'react';
import { Search, X, Home, Eye, CheckCircle, Package, Plus, Users, FileText, Clock, Settings, Shield, RefreshCcw } from 'lucide-react';
import BubbleProfile from './BubbleProfile';

const GlobalHeader = ({ title = "", onSearch, hideSearch = false, showTitle = true }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  // Define all available pages with their details
  const availablePages = [
    {
      path: '/dashboard',
      name: 'Dashboard',
      description: 'Main dashboard and overview',
      icon: Home,
      permission: 'dashboard'
    },
    {
      path: '/viewrequest',
      name: 'View Request',
      description: 'View pending equipment requests',
      icon: Eye,
      permission: 'view_request'
    },
    {
      path: '/viewapproved',
      name: 'View Approved',
      description: 'View approved equipment requests',
      icon: CheckCircle,
      permission: 'view_approve'
    },
    {
      path: '/exchangerequests',
      name: 'Exchange Requests',
      description: 'View employee exchange requests',
      icon: RefreshCcw,
      permission: 'view_request'
    },
    {
      path: '/equipment',
      name: 'Equipment',
      description: 'Equipment inventory management',
      icon: Package,
      permission: 'equipment_inventory'
    },
    {
      path: '/addstocks',
      name: 'Add Stocks',
      description: 'Add new equipment to inventory',
      icon: Plus,
      permission: 'add_stocks'
    },
    {
      path: '/employee',
      name: 'Employee',
      description: 'Employee management',
      icon: Users,
      permission: 'employee'
    },
    {
      path: '/users',
      name: 'Users',
      description: 'User account management',
      icon: Users,
      permission: 'users'
    },
    {
      path: '/reports',
      name: 'Reports',
      description: 'Reports and analytics',
      icon: FileText,
      permission: 'reports'
    },
    {
      path: '/activitylogs',
      name: 'Activity Logs',
      description: 'System activity logs',
      icon: Clock,
      permission: 'activity_logs'
    },
    {
      path: '/control-panel',
      name: 'Control Panel',
      description: 'System control panel',
      icon: Settings,
      permission: 'control_panel'
    },
    {
      path: '/role-management',
      name: 'Role Management',
      description: 'Role and permission management',
      icon: Shield,
      permission: 'super_admin'
    }
  ];

  // Check if user has permission for a page
  const hasPermission = (permission) => {
    if (!user) return false;
    
    // Super admin has access to everything
    if (user.role?.name === 'super_admin' || user.role === 'super_admin') return true;
    
    // Check custom permissions
    if (user.user_permissions?.use_custom_permissions) {
      const customPerms = user.user_permissions.permissions;
      if (Array.isArray(customPerms)) {
        return customPerms.includes('*') || customPerms.includes(permission);
      }
    }
    
    // Check role permissions
    if (user.role?.permissions) {
      const rolePerms = Array.isArray(user.role.permissions) 
        ? user.role.permissions 
        : JSON.parse(user.role.permissions || '[]');
      return rolePerms.includes('*') || rolePerms.includes(permission);
    }
    
    return false;
  };

  // Filter pages based on search term and permissions
  const filterPages = (term) => {
    if (!term.trim()) return [];
    
    return availablePages.filter(page => {
      const hasAccess = hasPermission(page.permission);
      if (!hasAccess) return false;
      
      const searchLower = term.toLowerCase();
      return (
        page.name.toLowerCase().includes(searchLower) ||
        page.description.toLowerCase().includes(searchLower) ||
        page.path.toLowerCase().includes(searchLower)
      );
    });
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    if (value.trim()) {
      const results = filterPages(value);
      setSearchResults(results);
      setShowSearchResults(true);
    } else {
      setShowSearchResults(false);
      setSearchResults([]);
    }
    
    // Call parent onSearch if provided
    if (onSearch) {
      onSearch(value);
    }
  };

  // Handle page navigation
  const navigateToPage = (path) => {
    window.location.href = path;
    setShowSearchResults(false);
    setSearchTerm('');
  };

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.search-container')) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Fetch user data on component mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        // Add a small delay to ensure session is established
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // First try to get login data (in case we just logged in)
        let response;
        try {
          response = await fetch('/login-data', {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
            },
            credentials: 'same-origin',
          });
          
          if (response.ok) {
            const loginData = await response.json();
            if (loginData.success) {
              setUser(loginData.user);
              try { localStorage.setItem('user', JSON.stringify(loginData.user)); } catch (e) {}
              setLoading(false);
              return;
            }
          }
        } catch (error) {
          console.log('Login-data endpoint failed, trying profile endpoint:', error);
        }
        
        // Next, try session-based check-auth which returns the authenticated user
        try {
          const checkAuthRes = await fetch('/check-auth', {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
            },
            credentials: 'same-origin',
          });
          if (checkAuthRes.ok) {
            const checkData = await checkAuthRes.json();
            if (checkData?.authenticated && checkData?.user) {
              setUser(checkData.user);
              try { localStorage.setItem('user', JSON.stringify(checkData.user)); } catch (e) {}
              setLoading(false);
              return;
            }
          }
        } catch (e) {
          console.log('check-auth endpoint failed, trying profile endpoint:', e);
        }

        // If both above did not return user, try the profile endpoint
        response = await fetch('/api/profile', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
          },
          credentials: 'same-origin',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setUser(data.data);
            try { localStorage.setItem('user', JSON.stringify(data.data)); } catch (e) {}
          } else {
            // Try to get user from localStorage
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
              try {
                const parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);
              } catch (e) {
                console.error('Failed to parse stored user data:', e);
                setUser({
                  name: "Not Authenticated",
                  role: "Please login",
                  email: "No user data available",
                });
              }
            } else {
              setUser({
                name: "Not Authenticated",
                role: "Please login",
                email: "No user data available",
              });
            }
          }
        } else {
          // Try to get user from localStorage
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            try {
              const parsedUser = JSON.parse(storedUser);
              setUser(parsedUser);
            } catch (e) {
              console.error('Failed to p890798arse stored user data:', e);
              setUser({
                name: "Not Authenticated",
                role: "Please login",
                email: "No user data available",
              });
            }
          } else {
            setUser({
              name: "Not Authenticated",
              role: "Please login",
              email: "No user data available",
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
        // Try to get user from localStorage
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
          } catch (e) {
            console.error('Failed to parse stored user data:', e);
            setUser({
              name: "Not Authenticated",
              role: "Please login",
              email: "No user data available",
            });
          }
        } else {
          setUser({
            name: "Not Authenticated",
            role: "Please login",
            email: "No user data available",
          });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  const handleEditProfile = () => {
    console.log('Edit profile clicked');
    // The profile modal will be opened by the BubbleProfile component
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/logout', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
      });

      if (response.ok) {
        // Clear any stored user data
        localStorage.removeItem('user');
        // Clear any cached employee profile state and avatar blob refs
        try { localStorage.removeItem('employee_profile_v1'); } catch (_) {}
        // Redirect to login page
        window.location.href = '/';
      } else {
        console.error('Logout failed');
        // Still redirect to login page
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Still redirect to login page
      window.location.href = '/';
    }
  };

  // Show loading state while fetching user data
  if (loading) {
    return (
      <header className="flex items-center justify-between px-10 py-6 bg-white">
        {!hideSearch && (
        <div className="flex-1" style={{ maxWidth: "644px" }}>
          <div className="relative">
            <input
              id="global_search"
              name="global_search"
              type="text"
              placeholder="Search"
              className="w-full pl-10 pr-4 py-3 rounded-full bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-5 text-gray-400" />
          </div>
        </div>
        )}
        <div className="flex items-center space-x-6 ml-auto">
          {showTitle && <span className="text-gray-700 font-medium hidden sm:block">{user?.name || "User"}</span>}
          <div className="w-9 h-9 bg-gray-200 rounded-full animate-pulse"></div>
        </div>
      </header>
    );
  }

  return (
    <header className="flex items-center justify-between px-10 py-6 bg-white">
      {!hideSearch && (
        <div className="flex-1 search-container relative" style={{ maxWidth: "644px" }}>
          <div className="relative">
            <input
              id="global_search"
              name="global_search"
              type="text"
              placeholder="Search pages..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-3 rounded-full bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-5 text-gray-400" />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setShowSearchResults(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          
          {/* Search Results Dropdown */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
              {searchResults.map((page, index) => {
                const IconComponent = page.icon;
                return (
                  <button
                    key={index}
                    onClick={() => navigateToPage(page.path)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-center space-x-3"
                  >
                    <IconComponent className="h-5 w-5 text-blue-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{page.name}</div>
                      <div className="text-sm text-gray-500 truncate">{page.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          
          {/* No Results */}
          {showSearchResults && searchResults.length === 0 && searchTerm.trim() && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              <div className="px-4 py-3 text-center text-gray-500">
                No pages found matching "{searchTerm}"
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center space-x-6 ml-auto">
        {showTitle && <span className="text-gray-700 font-medium hidden sm:block">{user?.name || "User"}</span>}
        <BubbleProfile 
          name={user?.name || "User"}
          image={user?.avatar_url || user?.image || user?.profile_photo_url}
          size={36}
          user={user}
          onEditProfile={handleEditProfile}
          onLogout={handleLogout}
        />
      </div>
    </header>
  );
};

export default GlobalHeader;
