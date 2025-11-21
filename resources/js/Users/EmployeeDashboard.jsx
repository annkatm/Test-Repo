import React, { useState, useEffect } from 'react';
import { Home, History, Package } from 'lucide-react';
import EmployeeTaskbar from './Employetaskbar.jsx';
import EmployeeSidebar from './employeesidebar.jsx';
import EmployeeHome from './EmployeeHome.jsx';
import EmployeeTransaction from './EmployeeTransaction.jsx';
import EmployeeReturnItems from './EmployeeReturnItems.jsx';
import { AppProvider } from '../contexts/AppContext.jsx';

const EmployeeDashboard = ({ 
  employeeName: propEmployeeName,
  notifications: propNotifications = 3
}) => {
  const [activeMenu, setActiveMenu] = useState(() => {
    try {
      return sessionStorage.getItem('employee_active_menu') || 'Home';
    } catch (_) { return 'Home'; }
  });
  const [userData, setUserData] = useState(null);
  const [employeeName, setEmployeeName] = useState(propEmployeeName || 'Employee User');
  const [userRole, setUserRole] = useState('employee');
  const [notifications, setNotifications] = useState(propNotifications);

  // Fetch authenticated user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch('/check-auth', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          },
          credentials: 'same-origin'
        });

        if (response.ok) {
          const data = await response.json();
          if (data.authenticated && data.user) {
            setUserData(data.user);
            setEmployeeName(data.user.name);
            setUserRole(data.user.role_display || data.user.role || 'employee');
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, []);
  useEffect(() => {
    try {
      let isReload = false;
      if (performance && typeof performance.getEntriesByType === 'function') {
        const entries = performance.getEntriesByType('navigation');
        if (entries && entries.length > 0) {
          isReload = entries[0].type === 'reload';
        }
      } else if (performance && performance.navigation) {
        isReload = performance.navigation.type === 1;
      }
      if (!isReload) {
        setActiveMenu('Home');
        try { sessionStorage.setItem('employee_active_menu', 'Home'); } catch (_) {}
      }
    } catch (_) {}
  }, []);

  // Listen for navigation events (e.g., from ApprovedTransactions after return)
  useEffect(() => {
    const onNavigate = (e) => {
      const target = e?.detail?.menu;
      if (typeof target === 'string') {
        setActiveMenu(target);
      }
    };
    window.addEventListener('ireply:navigate', onNavigate);
    return () => window.removeEventListener('ireply:navigate', onNavigate);
  }, []);

  useEffect(() => {
    try { sessionStorage.setItem('employee_active_menu', activeMenu); } catch (_) {}
  }, [activeMenu]);

  const handleMenuClick = (label) => {
    setActiveMenu(label);
  };

  const handleSearch = (searchTerm) => {
    // Handle search functionality specific to employee dashboard
    console.log('Employee searching for:', searchTerm);
    // You can implement search logic here that filters across all employee components
  };

  const handleProfileClick = () => {
    console.log('Profile clicked');
    // Navigate to employee profile page
  };

  const handleSettingsClick = () => {
    console.log('Settings clicked');
    // Navigate to employee settings page
  };

  const handleLogoutClick = async () => {
    console.log('Logout clicked');
    // Handle employee logout
    try {
      // Get CSRF token
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
      
      // Call logout endpoint
      const response = await fetch('/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': csrfToken,
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'same-origin'
      });

      // Redirect to login page after logout
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      // Still redirect on error
      window.location.href = '/';
    }
  };

  // Render different content based on active menu
  const renderContent = () => {
    switch (activeMenu) {
      case 'Home':
        return <EmployeeHome />;
      case 'Transaction':
        return <EmployeeTransaction />;
      case 'Return Items':
        return <EmployeeReturnItems />;
      default:
        return <EmployeeHome />;
    }
  };

  return (
    <AppProvider>
    <div className="min-h-screen overflow-x-hidden bg-white w-full pl-0 md:pl-60">
      <style jsx>{`
        .grid-background {
          background-color: #ffffff;
          background-image: 
            linear-gradient(rgba(0, 0, 0, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 0, 0, 0.03) 1px, transparent 1px);
          background-size: 20px 20px;
          background-position: -1px -1px;
        }
      `}</style>
      {/* Employee Sidebar Component */}
      <EmployeeSidebar 
        activeMenu={activeMenu}
        onMenuClick={handleMenuClick}
      />
  
      {/* Main Content Area with Employee Taskbar */}
      <div className="flex-1 flex flex-col min-h-0">
        <EmployeeTaskbar 
          onSearch={handleSearch}
          employeeName={employeeName}
          userRole={userRole}
          notifications={notifications}
          onProfileClick={handleProfileClick}
          onSettingsClick={handleSettingsClick}
          onLogoutClick={handleLogoutClick}
        />
  
        <div className={`flex-1 min-h-0 overflow-auto p-4 sm:p-6 bg-white ${activeMenu === 'Transaction' ? 'grid-background' : ''}`}>
          {renderContent()}
        </div>
      </div>
    </div>
    </AppProvider>
  );
};

export default EmployeeDashboard;
