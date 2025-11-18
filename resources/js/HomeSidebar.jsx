import React, { useState, useEffect, useRef } from "react";
import {
  Home,
  ArrowLeftRight,
  Folder,
  User,
  FileText,
  Users,
  Settings,
  Clock,
} from "lucide-react";
import { apiUtils } from "./services/api";

const HomeSidebar = ({ onSelect }) => {
  const [openTransaction, setOpenTransaction] = useState(false);
  const [openEquipment, setOpenEquipment] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [permissions, setPermissions] = useState([]);

  const transactionRef = useRef(null);
  const equipmentRef = useRef(null);

  const isActive = (path) =>
    typeof window !== "undefined" &&
    window.location &&
    window.location.pathname === path;

  const isInTransactionSection = () => {
    return isActive("/viewrequest") || isActive("/viewapproved") || isActive("/exchangerequests");
  };

  const isInEquipmentSection = () => {
    return isActive("/equipment") || isActive("/addstocks");
  };

  useEffect(() => {
    if (isInTransactionSection()) {
      setOpenTransaction(true);
      setOpenEquipment(false);
    } else if (isInEquipmentSection()) {
      setOpenEquipment(true);
      setOpenTransaction(false);
    }
  }, []);


  const navigateToPage = (path) => {
    if (typeof window !== "undefined") {
      window.location.href = path;
    }
  };

  const handleMainMenuClick = (path) => {
    setOpenTransaction(false);
    setOpenEquipment(false);
    navigateToPage(path);
  };

  const handleDropdownItemClick = (path) => {
    navigateToPage(path);
  };

  const toggleTransaction = () => {
    setOpenEquipment(false);
    setOpenTransaction(!openTransaction);
    navigateToPage("/viewrequest");
  };

  const toggleEquipment = () => {
    setOpenTransaction(false);
    setOpenEquipment(!openEquipment);
    navigateToPage("/equipment");
  };

  const linkClass = (path) =>
    `inline-flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 ease-out text-base font-semibold min-w-[140px] transform hover:scale-105 active:scale-95 cursor-pointer ${isActive(path)
      ? "bg-white text-[#2262C6] shadow-sm scale-105"
      : "text-white hover:bg-white hover:text-[#2262C6] hover:shadow-sm"
    }`;

  const sectionButtonClass = (active) =>
    `inline-flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 ease-out text-base font-semibold min-w-[140px] transform hover:scale-105 active:scale-95 cursor-pointer ${active
      ? "bg-white text-[#2262C6] shadow-sm scale-105"
      : "text-white hover:bg-white hover:text-[#2262C6] hover:shadow-sm"
    }`;

  const normalizePermissions = (user) => {
    if (!user) return [];

    if (user.user_permissions?.use_custom_permissions) {
      const customPerms = user.user_permissions.permissions;
      if (Array.isArray(customPerms)) return customPerms;
      if (typeof customPerms === 'string') {
        try { return JSON.parse(customPerms); } catch { return []; }
      }
      return [];
    }

    if (typeof user.role === 'object' && user.role) {
      if (Array.isArray(user.role.permissions)) return user.role.permissions;
      if (typeof user.role.permissions === 'string') {
        try { return JSON.parse(user.role.permissions); } catch { return []; }
      }
    }
    return [];
  };

  const computeIsSuperAdmin = (user) => {
    if (!user) return false;
    const roleName = typeof user.role === 'string' ? user.role : user.role?.name;
    const perms = normalizePermissions(user);
    return roleName === 'super_admin' || (Array.isArray(perms) && perms.includes('*'));
  };

  const checkUserRole = async () => {
    try {
      const response = await fetch('/check-auth', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        if (data?.authenticated && data.user) {
          const normalized = {
            ...data.user,
            role: {
              name: data.user.role,
              display_name: data.user.role_display,
              permissions: data.user.permissions
            },
            user_permissions: data.user.user_permissions
          };
          localStorage.setItem('user', JSON.stringify(normalized));
          const isSA = computeIsSuperAdmin(normalized);
          const perms = normalizePermissions(normalized);
          setIsSuperAdmin(isSA);
          setPermissions(perms);
        } else {
          // If not authenticated, clear local user data
          localStorage.removeItem('user');
          setIsSuperAdmin(false);
          setPermissions([]);
        }
      } else {
        // If check-auth fails, try to use local user as fallback
        const localUser = apiUtils.getCurrentUser();
        if (localUser && localUser.role) {
          const isSA = computeIsSuperAdmin(localUser);
          const perms = normalizePermissions(localUser);
          setIsSuperAdmin(isSA);
          setPermissions(perms || []);
        } else {
          setIsSuperAdmin(false);
          setPermissions([]);
        }
      }
    } catch (error) {
      console.error('Error checking user role:', error);
      // On error, try to use local user as fallback
      const localUser = apiUtils.getCurrentUser();
      if (localUser && localUser.role) {
        const isSA = computeIsSuperAdmin(localUser);
        const perms = normalizePermissions(localUser);
        setIsSuperAdmin(isSA);
        setPermissions(perms || []);
      } else {
        setIsSuperAdmin(false);
        setPermissions([]);
      }
    }
  };

  useEffect(() => {
    let lastPathname = window.location.pathname;

    // Check user role immediately on mount
    checkUserRole();

    // Also check on route changes (when pathname changes)
    const handleLocationChange = () => {
      checkUserRole();
    };

    const handleStorageChange = (e) => {
      if (e.key === 'user') {
        checkUserRole();
      }
    };

    const handleUserUpdate = () => {
      checkUserRole();
    };

    // Listen for custom event when user data is updated in same tab
    const handleUserDataUpdate = () => {
      checkUserRole();
    };

    // Monitor pathname changes (for when user navigates after login)
    const checkPathnameChange = () => {
      const currentPathname = window.location.pathname;
      if (currentPathname !== lastPathname) {
        lastPathname = currentPathname;
        checkUserRole();
      }
    };

    // Check user role periodically to catch login changes (less aggressive)
    const intervalId = setInterval(() => {
      checkPathnameChange();
      checkUserRole();
    }, 3000); // Check every 3 seconds

    // Listen for popstate (back/forward navigation)
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('userUpdated', handleUserUpdate);
    window.addEventListener('userDataUpdated', handleUserDataUpdate);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userUpdated', handleUserUpdate);
      window.removeEventListener('userDataUpdated', handleUserDataUpdate);
    };
  }, []);

  const can = (perm) => {
    if (isSuperAdmin) return true;
    if (!perm) return false;
    if (!permissions || permissions.length === 0) return false;
    return permissions.includes('*') || permissions.includes(perm);
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center space-x-3 p-3">
        <img
          src="/images/Frame_89-removebg-preview.png"
          alt="iREPLY Logo"
          className="h-16 w-auto"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = '/images/placeholder-equipment.png';
          }}
        />
      </div>

      <aside className="w-57 bg-gradient-to-b from-[#0064FF] to-[#053786] text-white flex flex-col h-screen overflow-hidden rounded-tr-[72px]">
        <nav className="flex-1 min-h-0 px-3 py-4 mt-4 space-y-2 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {can('dashboard') && (
            <div className={linkClass("/dashboard")} onClick={() => handleMainMenuClick("/dashboard")}>
              <Home className="h-5 w-5" />
              <span>Home</span>
            </div>
          )}

          {(can('view_request') || can('view_approve')) && (
            <div ref={transactionRef}>
              <div
                className={sectionButtonClass(
                  isActive("/viewrequest") || isActive("/viewapproved") || openTransaction
                )}
                onClick={toggleTransaction}
              >
                <ArrowLeftRight className="h-5 w-5" />
                <span>Transaction</span>
                <span className="ml-auto text-xs">
                  {openTransaction ? "▾" : "▸"}
                </span>
              </div>
              {openTransaction && (
                <ul className="ml-6 mt-1 space-y-1 animate-in slide-in-from-top-2 duration-200">
                  {can('view_request') && (
                    <li>
                      <div
                        onClick={() => handleDropdownItemClick("/viewrequest")}
                        className={`inline-block px-3 py-1 rounded-full text-sm w-fit transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ${isActive("/viewrequest")
                          ? "bg-white text-[#2262C6] shadow-sm scale-105"
                          : "text-white/90 hover:bg-white hover:text-[#2262C6]"
                          }`}
                      >
                        View Request
                      </div>
                    </li>
                  )}
                  {can('view_approve') && (
                    <li>
                      <div
                        onClick={() => handleDropdownItemClick("/viewapproved")}
                        className={`inline-block px-3 py-1 rounded-full text-sm w-fit transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ${isActive("/viewapproved")
                          ? "bg-white text-[#2262C6] shadow-sm scale-105"
                          : "text-white/90 hover:bg-white hover:text-[#2262C6]"
                          }`}
                      >
                        View Approved
                      </div>
                    </li>
                  )}
                  {(can('view_request') || can('view_approve')) && (
                    <li>
                      <div
                        onClick={() => handleDropdownItemClick("/exchangerequests")}
                        className={`inline-block px-3 py-1 rounded-full text-sm w-fit transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ${isActive("/exchangerequests")
                          ? "bg-white text-[#2262C6] shadow-sm scale-105"
                          : "text-white/90 hover:bg-white hover:text-[#2262C6]"
                          }`}
                      >
                        Exchange Requests
                      </div>
                    </li>
                  )}
                </ul>
              )}
            </div>
          )}

          {(can('equipment_inventory') || can('add_stocks')) && (
            <div ref={equipmentRef}>
              <div
                className={sectionButtonClass(
                  isActive("/equipment") || isActive("/addstocks") || openEquipment
                )}
                onClick={toggleEquipment}
              >
                <Folder className="h-5 w-5" />
                <span>Equipment</span>
                <span className="ml-auto text-xs">
                  {openEquipment ? "▾" : "▸"}
                </span>
              </div>
              {openEquipment && (
                <ul className="ml-6 mt-1 space-y-1 animate-in slide-in-from-top-2 duration-200">
                  {can('equipment_inventory') && (
                    <li>
                      <div
                        onClick={() => handleDropdownItemClick("/equipment")}
                        className={`inline-block px-3 py-1 rounded-full text-sm w-fit transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ${isActive("/equipment")
                          ? "bg-white text-[#2262C6] shadow-sm scale-105"
                          : "text-white/90 hover:bg-white hover:text-[#2262C6]"
                          }`}
                      >
                        Inventory
                      </div>
                    </li>
                  )}
                  {can('add_stocks') && (
                    <li>
                      <div
                        onClick={() => handleDropdownItemClick("/addstocks")}
                        className={`inline-block px-3 py-1 rounded-full text-sm w-fit transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ${isActive("/addstocks")
                          ? "bg-white text-[#2262C6] shadow-sm scale-105"
                          : "text-white/90 hover:bg-white hover:text-[#2262C6]"
                          }`}
                      >
                        Add Stocks
                      </div>
                    </li>
                  )}
                </ul>
              )}
            </div>
          )}

          {can('employee') && (
            <div className={linkClass("/employee")} onClick={() => handleMainMenuClick("/employee")}>
              <User className="h-5 w-5" />
              <span>Employee</span>
            </div>
          )}

          {can('reports') && (
            <div className={linkClass("/reports")} onClick={() => handleMainMenuClick("/reports")}>
              <FileText className="h-5 w-5" />
              <span>Reports</span>
            </div>
          )}

          {isSuperAdmin && (
            <div className={linkClass("/role-management")} onClick={() => handleMainMenuClick("/role-management")}>
              <Users className="h-5 w-5" />
              <span>Role Management</span>
            </div>
          )}

          {can('control_panel') && (
            <div className={linkClass("/control-panel")} onClick={() => handleMainMenuClick("/control-panel")}>
              <Settings className="h-5 w-5" />
              <span>Control Panel</span>
            </div>
          )}

          {can('activity_logs') && (
            <div className={linkClass("/activitylogs")} onClick={() => handleMainMenuClick("/activitylogs")}>
              <Clock className="h-5 w-5" />
              <span>Activity Logs</span>
            </div>
          )}

          {can('users') && (
            <div className={linkClass("/users")} onClick={() => handleMainMenuClick("/users")}>
              <User className="h-5 w-5" />
              <span>Users</span>
            </div>
          )}
        </nav>
      </aside>
    </div>
  );
};

export default HomeSidebar;