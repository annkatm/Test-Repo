import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { transactionService } from '../services/api';

/**
 * Custom hook for managing request data with proper error handling and loading states
 */
export const useRequestData = () => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [approvedRequests, setApprovedRequests] = useState([]);
  const [currentHolders, setCurrentHolders] = useState([]);
  const [verifyReturns, setVerifyReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch pending requests
      const pendingRes = await api.get('/requests', { params: { status: 'pending' } });
      if (pendingRes.data.success) {
        // Extra filter to ensure no cancelled requests slip through
        const filteredPending = (pendingRes.data.data || []).filter(req => 
          req.status !== 'cancelled' && req.status !== 'canceled'
        );
        setPendingRequests(filteredPending);
      }

      // Fetch approved requests
      const approvedRes = await api.get('/requests', { params: { status: 'approved' } });
      if (approvedRes.data.success) {
        setApprovedRequests(approvedRes.data.data);
      }

      // Fetch current holders (status = 'released' - equipment released)
      const holdersResponse = await transactionService.getAll({ status: 'released' });
      if (holdersResponse.success) {
        setCurrentHolders(holdersResponse.data);
      } else {
        console.error('Failed to fetch current holders:', holdersResponse.message);
      }

      // Fetch verify returns (status = 'returned' - equipment returned)
      const returnsResponse = await transactionService.getAll({ status: 'returned' });
      if (returnsResponse.success) {
        setVerifyReturns(returnsResponse.data);
      } else {
        console.error('Failed to fetch verify returns:', returnsResponse.message);
      }
      
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshData = useCallback(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchData();

    // Listen for cancelled request events from employee side
    const handleRequestCancelled = (event) => {
      const { request_id, equipment_id } = event.detail || {};
      console.log('[useRequestData] Request cancelled event received:', { request_id, equipment_id });
      
      if (request_id) {
        // Remove the cancelled request from pending requests
        setPendingRequests(prev => prev.filter(req => String(req.id) !== String(request_id)));
        
        // Also remove from approved requests if it was there
        setApprovedRequests(prev => prev.filter(req => String(req.id) !== String(request_id)));
        
        console.log('[useRequestData] Removed cancelled request from admin view');
        
        // Force a refresh after a short delay to ensure consistency
        setTimeout(() => {
          console.log('[useRequestData] Refreshing data after cancellation');
          fetchData();
        }, 1000);
      }
    };

    // Listen for multiple event types
    window.addEventListener('ireply:request:cancelled', handleRequestCancelled);
    window.addEventListener('ireply:request:canceled', handleRequestCancelled); // Alternative spelling

    // Set up periodic refresh to keep data in sync (every 30 seconds)
    const refreshInterval = setInterval(() => {
      console.log('[useRequestData] Periodic refresh triggered');
      fetchData();
    }, 30000);

    return () => {
      window.removeEventListener('ireply:request:cancelled', handleRequestCancelled);
      window.removeEventListener('ireply:request:canceled', handleRequestCancelled);
      clearInterval(refreshInterval);
    };
  }, [fetchData]);

  return {
    pendingRequests,
    approvedRequests,
    currentHolders,
    verifyReturns,
    loading,
    error,
    refreshData,
    setPendingRequests,
    setApprovedRequests,
    setCurrentHolders,
    setVerifyReturns
  };
};
