import React from 'react';
import { Home, History, Package } from 'lucide-react';

const EmployeeSidebar = ({ activeMenu, onMenuClick }) => {
  const menuItems = [
    { icon: Home, label: 'Home', active: true },
    { icon: History, label: 'Transaction', active: false },
    { icon: Package, label: 'Returned Items', active: false },
  ];

  return (
    <>
      {/* Logo Header */}
      <header className="fixed top-0 left-0 w-60 bg-white flex items-center justify-center py-4 z-40 border-r border-gray-200">
        <div className="flex items-center space-x-3 p-3">
          <img 
            src="/images/Frame_89-removebg-preview.png"
            alt="iREPLY Logo" 
            className="h-12 w-auto"
            onError={(e) => {
              console.error('Logo failed to load:', e.target.src);
              e.target.style.display = 'none';
              e.target.nextElementSibling.style.display = 'block';
            }}
          />
        </div>
      </header>
  
      {/* Sidebar Navigation */}
      <aside className="w-57 bg-gradient-to-b from-[#0064FF] to-[#053786] text-white fixed top-20 inset-y-0 left-0 bg-blue-600 overflow-hidden rounded-tr-[72px] flex flex-col">
        <nav className="mt-8 space-y-2">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={index}>
                <button
                  onClick={() => onMenuClick(item.label)}
                  className={`w-50 flex items-center space-x-5 px-7 py-3 rounded-r-full transition-all duration-200 ${
                    activeMenu === item.label
                      ? "bg-white text-[#2262C6] shadow-sm scale-105"
                      : "text-white/90 hover:bg-white hover:text-[#2262C6]"
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
    </>
  );
};

export default EmployeeSidebar;
