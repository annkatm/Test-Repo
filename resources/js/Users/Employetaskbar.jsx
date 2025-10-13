import React, { useState } from "react";
import { Search, Bell, User, Settings, LogOut } from "lucide-react";

const EmployeeTaskbar = ({ 
  onSearch, 
  employeeName = "Employee",
  notifications = 0,
  onProfileClick,
  onSettingsClick,
  onLogoutClick 
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleProfileClick = () => {
    setShowProfileMenu(!showProfileMenu);
  };

  const handleMenuItemClick = (action) => {
    setShowProfileMenu(false);
    if (action === 'profile' && onProfileClick) {
      onProfileClick();
    } else if (action === 'settings' && onSettingsClick) {
      onSettingsClick();
    } else if (action === 'logout' && onLogoutClick) {
      onLogoutClick();
    }
  };

  return (
    <header className="flex items-center justify-between px-10 py-6 bg-white shadow-sm border-b border-gray-200">
      {/* Search Section */}
      <div className="flex-1" style={{ maxWidth: "644px" }}>
        <div className="relative">
          <input
            type="text"
            placeholder="Search equipment, requests, or transactions..."
            className="w-full pl-10 pr-4 py-3 rounded-full bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
            onChange={(e) => onSearch && onSearch(e.target.value)}
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center space-x-4">
        {/* Notifications */}
        <div className="relative">
          <button className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors">
            <Bell className="h-5 w-5" />
            {notifications > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {notifications > 9 ? '9+' : notifications}
              </span>
            )}
          </button>
        </div>

        {/* Profile Menu */}
        <div className="relative">
          <button
            onClick={handleProfileClick}
            className="flex items-center space-x-2 p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {employeeName.charAt(0).toUpperCase()}
            </div>
            <span className="hidden md:block text-sm font-medium text-gray-700">
              {employeeName}
            </span>
          </button>

         {/* Dropdown Menu */}
          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
              {/* Profile Header */}
              <div className="px-4 py-4 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-md">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400 opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
                    <span className="text-white font-bold text-lg relative z-10">{employeeName.charAt(0)}</span>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-900">{employeeName}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Admin</div>
                    <button className="text-xs text-blue-600 hover:text-blue-700 flex items-center mt-1 font-medium">
                      Personal Details
                      <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Menu Items Group 1 */}
              <div className="py-1 px-3">
                <div className="bg-gray-100 rounded-lg py-1">
                  <button
                    onClick={() => handleMenuItemClick('profile')}
                    className="flex items-center w-full px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    <svg className="w-4 h-4 mr-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Profile
                  </button>
                  
                  <button
                    onClick={() => handleMenuItemClick('archive')}
                    className="flex items-center w-full px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    <svg className="w-4 h-4 mr-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                    Archive
                  </button>
                  
                  <button
                    onClick={() => handleMenuItemClick('homescreen')}
                    className="flex items-center w-full px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    <svg className="w-4 h-4 mr-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add to Home Screen
                  </button>
                </div>
              </div>

              {/* Menu Items Group 2 */}
              <div className="py-1 px-3">
                <div className="bg-gray-100 rounded-lg py-1">
                  <button
                    onClick={() => handleMenuItemClick('support')}
                    className="flex items-center w-full px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    <svg className="w-4 h-4 mr-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Support
                  </button>
                  
                  <button
                    onClick={() => handleMenuItemClick('print')}
                    className="flex items-center w-full px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    <svg className="w-4 h-4 mr-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Print
                  </button>
                </div>
              </div>

              {/* Logout Button */}
              <div className="py-2 border-t border-gray-100">
                <button
                  onClick={() => handleMenuItemClick('logout')}
                  className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-center"
                >
                  Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Click outside to close menu */}
      {showProfileMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowProfileMenu(false)}
        />
      )}
    </header>
  );
};

export default EmployeeTaskbar;