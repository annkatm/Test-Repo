import React, { useState, useEffect, useRef } from 'react';
import { Search, RefreshCcw, Eye, Calendar, Download } from 'lucide-react';
import GlobalHeader from './components/GlobalHeader';
import HomeSidebar from './HomeSidebar';
import api from './services/api';
import { showSuccess, showError } from './utils/toastUtils';

const ViewExchangeRequests = () => {
  const [exchangeRequests, setExchangeRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');
  const [viewModal, setViewModal] = useState({
    isOpen: false,
    requestData: null
  });

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: null, // 'approve' or 'reject'
    requestData: null,
    actionLoading: false
  });

  // Helper function to get avatar URL from employee/user data
  const getAvatarUrl = (data) => {
    const avatar = data.avatar_url || data.profile_photo_url || data.photo_url || data.employee_image || data.avatar || null;
    if (!avatar || (typeof avatar === 'string' && avatar.trim() === '')) return null;
    if (avatar.includes('http') || avatar.startsWith('/storage/')) return avatar;
    return `/storage/${avatar}`;
  };

  // Helper function to get initials from name
  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Fetch exchange requests
  const fetchExchangeRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch requests with request_type = 'exchange'
      const response = await api.get('/api/requests', {
        params: { request_type: 'exchange' }
      });

      if (response.data.success) {
        setExchangeRequests(response.data.data || []);
      } else {
        setError(response.data.message || 'Failed to fetch exchange requests');
      }
    } catch (err) {
      console.error('Error fetching exchange requests:', err);
      setError(err.response?.data?.message || 'Failed to fetch exchange requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExchangeRequests();
  }, []);

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'N/A';
    }
  };

  // Get status badge color
  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending' },
      approved: { bg: 'bg-green-100', text: 'text-green-700', label: 'Approved' },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' },
      fulfilled: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Fulfilled' }
    };

    const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-700', label: status };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  // Filter and sort exchange requests
  const filteredRequests = exchangeRequests
    .filter(request => {
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      const employeeName = (request.full_name || '').toLowerCase();
      const equipmentName = (request.equipment_name || '').toLowerCase();
      const reason = (request.reason || '').toLowerCase();
      return employeeName.includes(search) || equipmentName.includes(search) || reason.includes(search);
    })
    .sort((a, b) => {
      if (sortBy === 'date_desc') {
        return new Date(b.created_at) - new Date(a.created_at);
      } else if (sortBy === 'date_asc') {
        return new Date(a.created_at) - new Date(b.created_at);
      } else if (sortBy === 'name_asc') {
        return (a.full_name || '').localeCompare(b.full_name || '');
      } else if (sortBy === 'name_desc') {
        return (b.full_name || '').localeCompare(a.full_name || '');
      }
      return 0;
    });

  // Handle view details
  const handleViewDetails = (request) => {
    setViewModal({
      isOpen: true,
      requestData: request
    });
  };

  const handleCloseModal = () => {
    setViewModal({
      isOpen: false,
      requestData: null
    });
  };

  // Handle approve/reject confirmation
  const handleApproveRejectClick = (request, action) => {
    setConfirmModal({
      isOpen: true,
      type: action,
      requestData: request,
      actionLoading: false
    });
  };

  // Handle approve/reject
  const handleApproveReject = async () => {
    const { type, requestData } = confirmModal;
    if (!requestData || !type) return;

    try {
      setConfirmModal(prev => ({ ...prev, actionLoading: true }));
      
      const endpoint = type === 'approve' 
        ? `/api/requests/${requestData.id}/approve` 
        : `/api/requests/${requestData.id}/reject`;
      
      // Get rejection reason from textarea if rejecting
      let rejectionReason = null;
      if (type === 'reject') {
        const reasonTextarea = document.getElementById('rejection-reason');
        rejectionReason = reasonTextarea?.value?.trim() || 'Exchange request rejected by admin';
      }

      const response = await api.post(endpoint, {
        approval_notes: type === 'approve' ? 'Exchange request approved by admin' : null,
        rejection_reason: rejectionReason
      });

      if (response.data.success) {
        const actionText = type === 'approve' ? 'approved' : 'rejected';
        showSuccess(`Exchange request ${actionText} successfully! ${type === 'approve' ? 'Original equipment returned and new equipment assigned.' : ''}`);
        
        // Close modals
        setConfirmModal({ isOpen: false, type: null, requestData: null, actionLoading: false });
        handleCloseModal();
        
        // Refresh data
        await fetchExchangeRequests();
      } else {
        showError(response.data.message || `Failed to ${type} exchange request`);
        setConfirmModal(prev => ({ ...prev, actionLoading: false }));
      }
    } catch (err) {
      console.error(`Error ${type}ing exchange request:`, err);
      showError(err.response?.data?.message || `Failed to ${type} exchange request`);
      setConfirmModal(prev => ({ ...prev, actionLoading: false }));
    }
  };

  const handleCloseConfirmModal = () => {
    if (!confirmModal.actionLoading) {
      setConfirmModal({ isOpen: false, type: null, requestData: null, actionLoading: false });
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-white flex">
      <div className="flex-shrink-0">
        <HomeSidebar />
      </div>

      <div className="flex-1 flex flex-col">
        <GlobalHeader title="Exchange Requests" />

        <main className="px-10 py-6 mb-10 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto transaction-scrollbar" style={{ maxHeight: 'calc(100vh - 200px)' }}>
            <h2 className="text-4xl font-bold text-blue-600 mb-3">Exchange Requests</h2>
            <h3 className="text-base font-semibold text-gray-700 mb-6 tracking-wide">MANAGE EMPLOYEE EXCHANGE REQUESTS</h3>

            {/* Stats Card */}
            <div className="bg-gradient-to-b from-purple-500 to-purple-700 text-white rounded-2xl p-4 shadow mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm uppercase tracking-wider opacity-80 mb-2">Total Exchange Requests</h4>
                  <p className="text-5xl font-bold">{loading ? '...' : filteredRequests.length}</p>
                </div>
                <RefreshCcw className="w-12 h-12 text-white/70" />
              </div>
            </div>

            {/* Filters and Actions */}
            <div className="mb-6 flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[300px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    placeholder="Search by employee name, equipment, or reason..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="date_desc">Date (Newest)</option>
                <option value="date_asc">Date (Oldest)</option>
                <option value="name_asc">Name (A-Z)</option>
                <option value="name_desc">Name (Z-A)</option>
              </select>

              <button
                onClick={fetchExchangeRequests}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </button>
            </div>

            {/* Exchange Requests Table */}
            <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
              {loading ? (
                <div className="py-12 text-center text-gray-500">
                  Loading exchange requests...
                </div>
              ) : error ? (
                <div className="py-12 text-center text-red-500">
                  Error: {error}
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  {searchTerm ? 'No exchange requests found matching your search.' : 'No exchange requests found.'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-600 border-b">
                      <tr>
                        <th className="py-3 px-4 font-semibold">Employee</th>
                        <th className="py-3 px-4 font-semibold">Current Equipment</th>
                        <th className="py-3 px-4 font-semibold">Requested Equipment</th>
                        <th className="py-3 px-4 font-semibold">Reason</th>
                        <th className="py-3 px-4 font-semibold">Date Requested</th>
                        <th className="py-3 px-4 font-semibold">Status</th>
                        <th className="py-3 px-4 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredRequests.map((request) => (
                        <tr
                          key={request.id}
                          className="hover:bg-blue-50 transition-colors cursor-pointer"
                          onClick={() => handleViewDetails(request)}
                        >
                          <td className="py-4 px-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm font-semibold overflow-hidden flex-shrink-0">
                                {getAvatarUrl(request) ? (
                                  <img
                                    src={getAvatarUrl(request)}
                                    alt={request.full_name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      e.target.parentElement.textContent = getInitials(request.full_name);
                                    }}
                                  />
                                ) : (
                                  getInitials(request.full_name)
                                )}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{request.full_name || 'Unknown'}</div>
                                <div className="text-xs text-gray-500">{request.position || 'N/A'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-sm text-gray-900">
                              {request.original_equipment_name || 'N/A'}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-sm text-gray-900 font-medium">
                              {request.equipment_name || 'N/A'}
                            </div>
                            {request.brand && (
                              <div className="text-xs text-gray-500">{request.brand} {request.model || ''}</div>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-sm text-gray-700 max-w-xs truncate" title={request.reason || ''}>
                              {request.reason || 'N/A'}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center text-sm text-gray-600">
                              <Calendar className="h-4 w-4 mr-1" />
                              {formatDate(request.created_at)}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            {getStatusBadge(request.status)}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-end space-x-2" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleViewDetails(request)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                title="View Details"
                              >
                                <Eye className="h-5 w-5 text-gray-600" />
                              </button>
                              {request.status === 'pending' && (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleApproveRejectClick(request, 'approve');
                                    }}
                                    className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700 transition-colors"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleApproveRejectClick(request, 'reject');
                                    }}
                                    className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs hover:bg-red-700 transition-colors"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination Summary */}
              {!loading && filteredRequests.length > 0 && (
                <div className="px-4 py-3 bg-gray-50 border-t flex items-center justify-between text-sm text-gray-600">
                  <div>Total: {filteredRequests.length} exchange request{filteredRequests.length !== 1 ? 's' : ''}</div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* View Details Modal */}
      {viewModal.isOpen && viewModal.requestData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-gray-900">Exchange Request Details</h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <span className="text-2xl">&times;</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Employee Info */}
              <div className="flex items-center space-x-4 pb-4 border-b">
                <div className="w-16 h-16 rounded-full bg-purple-600 flex items-center justify-center text-white text-xl font-semibold overflow-hidden flex-shrink-0">
                  {getAvatarUrl(viewModal.requestData) ? (
                    <img
                      src={getAvatarUrl(viewModal.requestData)}
                      alt={viewModal.requestData.full_name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentElement.textContent = getInitials(viewModal.requestData.full_name);
                      }}
                    />
                  ) : (
                    getInitials(viewModal.requestData.full_name)
                  )}
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-gray-900">{viewModal.requestData.full_name || 'Unknown'}</h4>
                  <p className="text-sm text-gray-600">{viewModal.requestData.position || 'N/A'}</p>
                </div>
              </div>

              {/* Current Equipment */}
              <div>
                <h5 className="text-sm font-semibold text-gray-700 mb-2">CURRENT EQUIPMENT</h5>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-base text-gray-900">
                    {viewModal.requestData.original_equipment_name || 'N/A'}
                  </p>
                  {viewModal.requestData.original_brand && (
                    <p className="text-sm text-gray-600 mt-1">
                      {viewModal.requestData.original_brand} {viewModal.requestData.original_model || ''}
                    </p>
                  )}
                </div>
              </div>

              {/* Requested Equipment */}
              <div>
                <h5 className="text-sm font-semibold text-gray-700 mb-2">REQUESTED EQUIPMENT</h5>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-base text-gray-900 font-medium">
                    {viewModal.requestData.equipment_name || 'N/A'}
                  </p>
                  {viewModal.requestData.brand && (
                    <p className="text-sm text-gray-600 mt-1">
                      {viewModal.requestData.brand} {viewModal.requestData.model || ''}
                    </p>
                  )}
                  {viewModal.requestData.category_name && (
                    <p className="text-xs text-gray-500 mt-1">Category: {viewModal.requestData.category_name}</p>
                  )}
                </div>
              </div>

              {/* Reason */}
              <div>
                <h5 className="text-sm font-semibold text-gray-700 mb-2">REASON FOR EXCHANGE</h5>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {viewModal.requestData.reason || 'No reason provided'}
                  </p>
                </div>
              </div>

              {/* Evidence File */}
              {viewModal.requestData.evidence_file && (
                <div>
                  <h5 className="text-sm font-semibold text-gray-700 mb-2">EVIDENCE</h5>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <a
                      href={`/storage/${viewModal.requestData.evidence_file}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-800"
                    >
                      <Download className="h-4 w-4" />
                      <span>View Evidence File</span>
                    </a>
                  </div>
                </div>
              )}

              {/* Status and Dates */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <h5 className="text-sm font-semibold text-gray-700 mb-2">STATUS</h5>
                  {getStatusBadge(viewModal.requestData.status)}
                </div>
                <div>
                  <h5 className="text-sm font-semibold text-gray-700 mb-2">DATE REQUESTED</h5>
                  <p className="text-sm text-gray-600">{formatDate(viewModal.requestData.created_at)}</p>
                </div>
              </div>

              {/* Action Buttons */}
              {viewModal.requestData.status === 'pending' && (
                <div className="flex items-center justify-end space-x-3 pt-4 border-t">
                  <button
                    onClick={handleCloseModal}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      handleApproveRejectClick(viewModal.requestData, 'reject');
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => {
                      handleApproveRejectClick(viewModal.requestData, 'approve');
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Approve
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.isOpen && confirmModal.requestData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">
                {confirmModal.type === 'approve' ? 'Approve Exchange Request' : 'Reject Exchange Request'}
              </h3>
            </div>

            <div className="p-6">
              {confirmModal.type === 'approve' ? (
                <div className="space-y-3">
                  <p className="text-gray-700">
                    Are you sure you want to approve this exchange request?
                  </p>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                    <p className="font-semibold mb-2">This will:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Return the original equipment: <strong>{confirmModal.requestData.original_equipment_name || 'N/A'}</strong></li>
                      <li>Assign new equipment: <strong>{confirmModal.requestData.equipment_name || 'N/A'}</strong></li>
                      <li>Create a new transaction for the employee</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-gray-700">
                    Are you sure you want to reject this exchange request?
                  </p>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
                    <p>The employee will keep their current equipment: <strong>{confirmModal.requestData.original_equipment_name || 'N/A'}</strong></p>
                  </div>
                </div>
              )}

              {confirmModal.type === 'reject' && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rejection Reason (Optional)
                  </label>
                  <textarea
                    id="rejection-reason"
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Enter reason for rejection..."
                  />
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end space-x-3">
              <button
                onClick={handleCloseConfirmModal}
                disabled={confirmModal.actionLoading}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleApproveReject}
                disabled={confirmModal.actionLoading}
                className={`px-4 py-2 rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  confirmModal.type === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {confirmModal.actionLoading ? 'Processing...' : confirmModal.type === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewExchangeRequests;

