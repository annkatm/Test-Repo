import React, { useState, useEffect } from 'react';
import { Home, History, Package } from 'lucide-react';
import EmployeeTaskbar from './Employetaskbar.jsx';
import EmployeeHome from './EmployeeHome.jsx';
import EmployeeTransaction from './EmployeeTransaction.jsx';
import EmployeeReturnItems from './EmployeeReturnItems.jsx';

const EmployeeDashboard = ({ 
  employeeName: propEmployeeName,
  notifications: propNotifications = 3
}) => {
  const [activeMenu, setActiveMenu] = useState('Home');
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
  
  const menuItems = [
    { icon: Home, label: 'Home', active: true },
    { icon: History, label: 'Transaction', active: false },
    { icon: Package, label: 'Returned Items', active: false },
  ];

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
      case 'Returned Items':
        return <EmployeeReturnItems />;
      default:
        return <EmployeeHome />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 w-full pl-60">
      {/* Logo Header */}
      <header className="fixed top-0 left-0 w-60 bg-white flex items-center justify-center py-4 z-40 border-r border-gray-200">
        <div className="flex items-center space-x-2">
          <img 
            src="/images/Frame_89-removebg-preview.png"
            alt="iREPLY Logo" 
            className="h-12 w-auto object-contain"
            onError={(e) => {
              console.error('Logo failed to load:', e.target.src);
              e.target.style.display = 'none';
              e.target.nextElementSibling.style.display = 'block';
            }}
          />
        </div>
      </header>
  
      {/* Sidebar Navigation */}
      <aside className="w-60 fixed top-20 inset-y-0 left-0 bg-blue-600 overflow-hidden rounded-tr-[60px] flex flex-col z-30 shadow-lg">
        <nav className="mt-8 space-y-2">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={index}>
                <button
                  onClick={() => handleMenuClick(item.label)}
                  className={`w-50 flex items-center space-x-5 px-7 py-3 rounded-r-full transition-all duration-200 ${
                    activeMenu === item.label
                      ? 'bg-white text-blue-600 shadow-md'
                      : 'text-white hover:bg-blue-700 hover:bg-opacity-80'
                  }`}
                >
                  <Icon className="h-6 w-6" />
                  <span className="font-medium">{item.label}</span>
                </button>
              </div>
            );
          })}
         </nav>
       </aside>
  
      {/* Main Content Area with Employee Taskbar */}
      <div className="flex-1 flex flex-col">
        <EmployeeTaskbar 
          onSearch={handleSearch}
          employeeName={employeeName}
          userRole={userRole}
          notifications={notifications}
          onProfileClick={handleProfileClick}
          onSettingsClick={handleSettingsClick}
          onLogoutClick={handleLogoutClick}
        />
  
        <div className="flex-1 p-6 bg-gray-50">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;