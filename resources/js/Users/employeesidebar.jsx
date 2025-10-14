import React from 'react';
import { Home, History, Package } from 'lucide-react';

const EmployeeSidebar = ({ activeMenu, onMenuClick }) => {
  const isActive = (menu) => activeMenu === menu;

  // Link class matching admin sidebar style
  const linkClass = (menu) =>
    `inline-flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 ease-out text-base font-semibold min-w-[140px] transform hover:scale-105 active:scale-95 ${
      isActive(menu)
        ? "bg-white text-[#2262C6] shadow-sm scale-105"
        : "text-white hover:bg-white hover:text-[#2262C6] hover:shadow-sm"
    }`;

  const handleMenuClick = (menu, event) => {
    if (event) {
      event.preventDefault();
    }
    onMenuClick(menu);
  };

  return (
    <>
      {/* Logo Header - Fixed at top */}
      <header className="fixed top-0 left-0 w-60flex items-center justify-start px-6 py-4 z-40 border-gray-200">
        <div className="flex items-center space-x-3">
          <img
            src="/images/Frame_89-removebg-preview.png"
            alt="iREPLY Logo"
            className="h-16 w-auto"
            onError={(e) => {
              console.error('Logo failed to load:', e.target.src);
              e.target.style.display = 'none';
            }}
          />
        </div>
      </header>

      {/* Sidebar Navigation - Fixed, starts below logo */}
      <aside className="fixed top-28 left-0 w-60 bg-gradient-to-b from-[#0064FF] to-[#053786] text-white h-[calc(100vh-7rem)] overflow-hidden rounded-tr-[72px] flex flex-col">
        {/* Navigation */}
        <nav className="flex-1 min-h-0 px-3 py-4 mt-4 space-y-2 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {/* Home */}
          <button
            onClick={(e) => handleMenuClick('Home', e)}
            className={linkClass('Home')}
          >
            <Home className="h-5 w-5" />
            <span>Home</span>
          </button>

          {/* Transaction */}
          <button
            onClick={(e) => handleMenuClick('Transaction', e)}
            className={linkClass('Transaction')}
          >
            <History className="h-5 w-5" />
            <span>Transaction</span>
          </button>

          {/* Returned Items */}
          <button
            onClick={(e) => handleMenuClick('Returned Items', e)}
            className={linkClass('Returned Items')}
          >
            <Package className="h-5 w-5" />
            <span>Returned Items</span>
          </button>
        </nav>
      </aside>
    </>
  );
};

export default EmployeeSidebar;