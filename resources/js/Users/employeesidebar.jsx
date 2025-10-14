import React from 'react';
import { Home, ArrowLeftRight, Package } from 'lucide-react';

const EmployeeSidebar = ({ activeMenu, onMenuClick }) => {
  const menuItems = [
    {
      label: 'Home',
      icon: Home,
      path: 'Home'
    },
    {
      label: 'Transaction',
      icon: ArrowLeftRight,
      path: 'Transaction'
    },
    {
      label: 'Returned Items',
      icon: Package,
      path: 'Returned Items'
    }
  ];

  const isActive = (path) => activeMenu === path;

  const linkClass = (path) =>
    `inline-flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 ease-out text-base font-semibold min-w-[140px] transform hover:scale-105 active:scale-95 ${
      isActive(path)
        ? "bg-white text-[#2262C6] shadow-sm scale-105"
        : "text-white hover:bg-white hover:text-[#2262C6] hover:shadow-sm"
    }`;

  return (
    <div className="flex flex-col">
      {/* Logo */}
      <div className="flex items-center space-x-3 p-3">
        <img
          src="/images/Frame_89-removebg-preview.png"
          alt="iREPLY Logo"
          className="h-16 w-auto"
        />
      </div>

      {/* Sidebar */}
      <aside className="w-57 bg-gradient-to-b from-[#0064FF] to-[#053786] text-white flex flex-col h-screen overflow-hidden rounded-tr-[72px]">
        {/* Navigation */}
        <nav className="flex-1 min-h-0 px-3 py-4 mt-4 space-y-2 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <button
                key={item.path}
                className={linkClass(item.path)}
                onClick={() => onMenuClick(item.path)}
              >
                <IconComponent className="h-5 w-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>
    </div>
  );
};

export default EmployeeSidebar;
