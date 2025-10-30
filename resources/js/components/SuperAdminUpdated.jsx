import React, { useState, useEffect } from 'react';
import { Search, Printer, Eye, Folder, User, Clock, ChevronDown, ChevronUp, FileText, Home, Check, X, Pencil } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { requestService, equipmentService } from '../services/api';
import { usePagination, useRequest } from '../hooks/useApi';
import Loading from './Loading';
import NotificationContainer from './NotificationContainer';

const SuperAdminUpdated = () => {
  const { user, notifications, removeNotification, addNotification } = useApp();
  const [activeMenu, setActiveMenu] = useState('Home');
  const [openDropdown, setOpenDropdown] = useState(false);
  const [openTransactionDropdown, setOpenTransactionDropdown] = useState(false);
  const [transactionView, setTransactionView] = useState('viewRequest');
  const [searchTerm, setSearchTerm] = useState('');

  // API hooks
  const { execute: approveRequest } = useRequest();
  const { execute: rejectRequest } = useRequest();
  
  // Pagination hooks for different views
  const pendingRequests = usePagination(requestService.getAll, { status: 'pending' });
  const approvedRequests = usePagination(requestService.getAll, { status: 'approved' });
  const equipmentStats = usePagination(equipmentService.getStatistics);

  const menuItems = [
    { icon: Home, label: 'Home' },
    { icon: FileText, label: 'Transaction', hasDropdown: true, dropdownType: 'transaction' },
    { icon: Folder, label: 'Equipment', hasDropdown: true, dropdownType: 'equipment' },
    { icon: User, label: 'Employee' },
    { icon: Clock, label: 'Reports' },
    { icon: User, label: 'Role Management' },
    { icon: User, label: 'Control Panel' },
    { icon: Clock, label: 'Activity Logs' },
    { icon: User, label: 'Users' },
  ];

  // Handler functions for approve and reject actions
  const handleApprove = async (requestId) => {
    try {
      await approveRequest(requestService.approve, requestId, {});
      addNotification({
        type: 'success',
        message: 'Request approved successfully!',
      });
      pendingRequests.refresh();
      approvedRequests.refresh();
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Failed to approve request',
      });
    }
  };

  const handleReject = async (requestId) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    try {
      await rejectRequest(requestService.reject, requestId, { rejection_reason: reason });
      addNotification({
        type: 'success',
        message: 'Request rejected successfully!',
      });
      pendingRequests.refresh();
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Failed to reject request',
      });
    }
  };

  const handleSearch = (term) => {
    setSearchTerm(term);
    const searchParams = term ? { search: term } : {};
    
    if (transactionView === 'viewRequest') {
      pendingRequests.updateParams({ ...searchParams, status: 'pending' });
    } else if (transactionView === 'viewApproved') {
      approvedRequests.updateParams({ ...searchParams, status: 'approved' });
    }
  };

  const getCurrentData = () => {
    switch (transactionView) {
      case 'viewRequest':
        return pendingRequests;
      case 'viewApproved':
        return approvedRequests;
      default:
        return { data: [], loading: false, error: null };
    }
  };

  const currentData = getCurrentData();

  return (
    <div className="min-h-screen bg-white-100 flex">
      {/* Notification Container */}
      <NotificationContainer 
        notifications={notifications} 
        onRemove={removeNotification} 
      />

      {/* Sidebar Wrapper */}
      <div className="flex flex-col">
        {/* Logo */}
        <div className="flex items-center space-x-3">
          <img
            src="/images/Frame_89-removebg-preview.png"
            alt="iREPLY Logo"
            className="h-20 ml-4 w-auto object-contain"
            onError={(e) => {
              console.log('Image failed to load, trying fallback path');
              e.target.onerror = null;
              e.target.src = '/images/Frame 35.jpg';
              e.target.onerror = () => {
                console.log('Fallback image also failed, using text fallback');
                e.target.onerror = null;
                const parent = e.target.parentNode;
                if (parent) {
                  const textNode = document.createElement('div');
                  textNode.className = 'h-20 ml-4 flex items-center justify-center';
                  textNode.innerHTML = '<span class="text-white font-bold text-xl">iREPLY</span>';
                  parent.replaceChild(textNode, e.target);
                }
              };
            }}
          />
        </div>

        {/* Sidebar */}
        <aside className="w-60 bg-blue-600 min-h-full relative overflow-hidden rounded-tr-[60px] flex flex-col">
          <nav className="mt-8 space-y-2">
            {menuItems.map((item, index) => (
              <div key={index}>
                {/* Main Menu Button */}
                <button
                  onClick={() => {
                    setActiveMenu(item.label);
                    if (item.hasDropdown) {
                      if (item.dropdownType === 'transaction') {
                        setOpenTransactionDropdown(!openTransactionDropdown);
                        setOpenDropdown(false);
                      } else if (item.dropdownType === 'equipment') {
                        setOpenDropdown(!openDropdown);
                        setOpenTransactionDropdown(false);
                      }
                    } else {
                      // Handle navigation for non-dropdown items
                      if (item.label === 'Employee') {
                        window.location.href = '/employee';
                      } else if (item.label === 'Role Management') {
                        window.location.href = '/role-management';
                      } else if (item.label === 'Users') {
                        window.location.href = '/users';
                      }
                    }
                  }}
                  className={`w-50 flex items-center justify-between px-7 py-2 rounded-r-full transition-colors ${
                    activeMenu === item.label
                      ? 'bg-white text-blue-600'
                      : 'text-white hover:bg-blue-700'
                  }`}
                >
                  <div className="flex items-center space-x-5">
                    <item.icon className="h-6 w-6" />
                    <span className="font-normal">{item.label}</span>
                  </div>

                  {/* Dropdown Arrow if needed */}
                  {item.hasDropdown && (
                    (item.dropdownType === 'equipment' && openDropdown) || 
                    (item.dropdownType === 'transaction' && openTransactionDropdown) ? 
                      <ChevronUp className="h-4 w-4" />
                    : 
                      <ChevronDown className="h-4 w-4" />
                  )}
                </button>

                {/* Equipment Dropdown Content */}
                {item.hasDropdown && item.dropdownType === 'equipment' && openDropdown && (
                  <div className="ml-12 mt-2 space-y-2 text-sm text-white">
                    <p 
                      className="cursor-pointer hover:underline"
                      onClick={() => {
                        window.location.href = '/addstocks';
                        setActiveMenu('Equipment');
                      }}
                    >
                      • Add Stocks
                    </p>
                    <p 
                      className="cursor-pointer hover:underline"
                      onClick={() => {
                        window.location.href = '/equipment';
                        setActiveMenu('Equipment');
                      }}
                    >
                      • View Stocks
                    </p>
                  </div>
                )}
                
                {/* Transaction Dropdown Content */}
                {item.hasDropdown && item.dropdownType === 'transaction' && openTransactionDropdown && (
                  <div className="ml-12 mt-2 space-y-2 text-sm text-white">
                    <p 
                      className="cursor-pointer hover:underline"
                      onClick={() => {
                        setTransactionView('viewRequest');
                        setActiveMenu('Transaction');
                      }}
                    >
                      • View Request
                    </p>
                    <p 
                      className="cursor-pointer hover:underline"
                      onClick={() => {
                        setTransactionView('viewApproved');
                        setActiveMenu('Transaction');
                      }}
                    >
                      • View Approved
                    </p>
                    <p 
                      className="cursor-pointer hover:underline"
                      onClick={() => {
                        setTransactionView('currentHolder');
                        setActiveMenu('Transaction');
                      }}
                    >
                      • Current Holder
                    </p>
                    <p 
                      className="cursor-pointer hover:underline"
                      onClick={() => {
                        setTransactionView('verifyReturn');
                        setActiveMenu('Transaction');
                      }}
                    >
                      • Verify Return
                    </p>
                   </div>
                )}
              </div>
            ))}
          </nav>
        </aside>
      </div>

      {/* Main Section */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 bg-white-100">
          {/* Search */}
          <div className="flex-1 max-w-lg ml-9 mt-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              />
            </div>
          </div>

          {/* Profile */}
          <div className="flex items-center space-x-3 ml-8 mt-2">
            <div className="w-8 h-8 bg-gray-300 rounded-lg"></div>
            <div className="w-8 h-8 bg-gray-300 rounded-lg"></div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">{user?.name || 'User'}</span>
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user?.name?.charAt(0) || 'U'}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 p-6 -ml-6 pl-12">
          {/* Dashboard Title */}
          <h2 className="text-4xl font-bold text-blue-600">Transaction</h2>
          <h3 className="text-base font-semibold text-gray-700 mt-3 tracking-wide">QUICK ACCESS</h3>

          {/* Quick Access Cards */}
          <div className="grid grid-cols-3 gap-6 mt-4">
            <div className="bg-blue-600 text-white rounded-2xl p-6 shadow flex flex-col">
              <h4 className="text-sm uppercase tracking-wider opacity-80">New Requests</h4>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-5xl font-bold">{pendingRequests.pagination?.total || 0}</p>
                <div className="w-10 h-10 rounded-full bg-white/30"></div>
              </div>
            </div>
            <div className="bg-gray-100 rounded-2xl p-6 shadow flex flex-col">
              <h4 className="text-sm font-semibold text-gray-600">Current holder</h4>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-4xl font-bold text-gray-900">22</p>
                <div className="w-10 h-10 rounded-full bg-gray-300"></div>
              </div>
            </div>
            <div className="bg-gray-100 rounded-2xl p-6 shadow flex flex-col">
              <h4 className="text-sm font-semibold text-gray-600">Verify Return</h4>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-4xl font-bold text-gray-900">6</p>
                <div className="w-10 h-10 rounded-full bg-gray-300"></div>
              </div>
            </div>
          </div>

          {/* Mode dropdown - only show for Transaction menu */}
          {activeMenu === 'Transaction' && (
            <div className="mt-6 flex justify-center">
              <div className="relative">
                <button
                  type="button"
                  className="w-44 h-10 bg-gray-300 rounded-md flex items-center justify-between px-4 text-gray-700"
                >
                  <span className="text-sm font-medium">
                    {transactionView === 'viewRequest' ? 'View Request' : 
                     transactionView === 'viewApproved' ? 'View Approved' :
                     transactionView === 'currentHolder' ? 'Current holder' : 'Verify return'}
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Home Section */}
          {activeMenu === 'Home' && (
            <>
              <h3 className="mt-10 text-3xl font-semibold text-gray-700">Super Admin Dashboard</h3>
              <div className="mt-6 grid grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow p-6">
                  <h4 className="text-lg font-semibold mb-4">System Overview</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Users:</span>
                      <span className="font-semibold">150</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Active Equipment:</span>
                      <span className="font-semibold">89</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Pending Requests:</span>
                      <span className="font-semibold text-orange-600">{pendingRequests.pagination?.total || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Approved Requests:</span>
                      <span className="font-semibold text-green-600">{approvedRequests.pagination?.total || 0}</span>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow p-6">
                  <h4 className="text-lg font-semibold mb-4">Quick Actions</h4>
                  <div className="space-y-3">
                    <button 
                      className="w-full text-left px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                      onClick={() => {
                        setActiveMenu('Transaction');
                        setTransactionView('viewRequest');
                      }}
                    >
                      Review Pending Requests
                    </button>
                    <button 
                      className="w-full text-left px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100"
                      onClick={() => {
                        setActiveMenu('Transaction');
                        setTransactionView('viewApproved');
                      }}
                    >
                      View Approved Requests
                    </button>
                    <button 
                      className="w-full text-left px-4 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100"
                      onClick={() => window.location.href = '/users'}
                    >
                      Manage Users
                    </button>
                    <button 
                      className="w-full text-left px-4 py-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100"
                      onClick={() => window.location.href = '/role-management'}
                    >
                      Role Management
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Transaction Views */}
          {activeMenu === 'Transaction' && (
            <>
              <h3 className="mt-10 text-3xl font-semibold text-gray-700">
                {transactionView === 'viewRequest' ? 'View Request' :
                 transactionView === 'viewApproved' ? 'View Approved' :
                 transactionView === 'currentHolder' ? 'Current holder' : 'Verify return'}
              </h3>
              
              {currentData.loading ? (
                <div className="flex justify-center items-center h-64">
                  <Loading size="large" text="Loading requests..." />
                </div>
              ) : currentData.error ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                  <p className="text-red-800">Error: {currentData.error}</p>
                </div>
              ) : (
                <div className="mt-4 bg-white rounded-xl shadow p-6">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="border-b text-gray-600">
                        <th className="pb-2">Name</th>
                        <th className="pb-2">Position</th>
                        <th className="pb-2">Item</th>
                        {transactionView === 'viewApproved' && <th className="pb-2">Status</th>}
                        {transactionView === 'viewApproved' && <th className="pb-2">Approved by</th>}
                        <th className="pb-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentData.data?.map((req) => (
                        <tr key={req.id} className="border-b last:border-0">
                          <td className="py-4">
                            <div className="font-medium text-gray-900">{req.user?.name}</div>
                            <div className="text-gray-500 text-xs">{req.user?.position}</div>
                          </td>
                          <td className="py-4 text-gray-700">{req.user?.position}</td>
                          <td className="py-4 text-gray-700">{req.equipment?.name}</td>
                          {transactionView === 'viewApproved' && (
                            <td className="py-4 text-green-600">{req.status}</td>
                          )}
                          {transactionView === 'viewApproved' && (
                            <td className="py-4 text-gray-700">{req.approved_by_name || '-'}</td>
                          )}
                          <td className="py-4">
                            <div className="flex items-center justify-end space-x-3">
                              {transactionView === 'viewRequest' && (
                                <>
                                  <button 
                                    onClick={() => handleApprove(req.id)}
                                    className="h-10 w-10 flex items-center justify-center rounded-lg bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors border border-green-200 hover:border-green-300 cursor-pointer"
                                    title="Approve Request"
                                  >
                                    <Check className="h-5 w-5" />
                                  </button>
                                  <button 
                                    onClick={() => handleReject(req.id)}
                                    className="h-10 w-10 flex items-center justify-center rounded-lg bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors border border-red-200 hover:border-red-300 cursor-pointer"
                                    title="Reject Request"
                                  >
                                    <X className="h-5 w-5" />
                                  </button>
                                </>
                              )}
                              <Printer className="h-5 w-5 text-gray-500 cursor-pointer hover:text-gray-700" title="Print Request" />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {/* Pagination */}
                  {currentData.pagination && currentData.pagination.last_page > 1 && (
                    <div className="mt-4 flex justify-center space-x-2">
                      <button
                        onClick={currentData.prevPage}
                        disabled={currentData.pagination.current_page === 1}
                        className="px-3 py-1 bg-gray-200 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded">
                        {currentData.pagination.current_page} of {currentData.pagination.last_page}
                      </span>
                      <button
                        onClick={currentData.nextPage}
                        disabled={currentData.pagination.current_page === currentData.pagination.last_page}
                        className="px-3 py-1 bg-gray-200 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SuperAdminUpdated;
