import { useState, useEffect, useCallback } from 'react';

export const useDashboardStats = (refreshInterval = 30000) => {
  const [stats, setStats] = useState({
    items_currently_borrowed: 0,
    total_equipment: 0,
    available_equipment: 0,
    issued_equipment: 0,
    total_employees: 0,
    employees_with_items: 0,
    pending_requests: 0,
    approved_requests: 0,
    denied_requests: 0,
    categories: [],
    last_updated: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      const response = await fetch('/api/dashboard/stats');
      const data = await response.json();

      if (data.success) {
        setStats(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch dashboard stats');
      }
    } catch (err) {
      console.error('Dashboard stats error:', err);
      setError(err.message);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, []);

  const fetchSpecificCounts = useCallback(async (metrics = ['borrowed', 'available', 'total']) => {
    try {
      const params = new URLSearchParams();
      metrics.forEach(metric => params.append('metrics[]', metric));
      
      const response = await fetch(`/api/dashboard/counts?${params}`);
      const data = await response.json();

      if (data.success) {
        setStats(prev => ({
          ...prev,
          items_currently_borrowed: data.data.borrowed ?? prev.items_currently_borrowed,
          available_equipment: data.data.available ?? prev.available_equipment,
          total_equipment: data.data.total ?? prev.total_equipment,
          employees_with_items: data.data.employees_with_items ?? prev.employees_with_items,
          last_updated: data.timestamp
        }));
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to fetch counts');
      }
    } catch (err) {
      console.error('Dashboard counts error:', err);
      return null;
    }
  }, []);

  const refreshStats = useCallback(() => {
    fetchStats(false);
  }, [fetchStats]);

  useEffect(() => {
    // Initial fetch
    fetchStats();

    // Set up periodic refresh
    const interval = setInterval(() => {
      fetchStats(false);
    }, refreshInterval);

    // Listen for equipment/employee updates
    const handleUpdate = () => {
      // Delay refresh slightly to allow database to update
      setTimeout(() => fetchStats(false), 500);
    };

    window.addEventListener('equipment:updated', handleUpdate);
    window.addEventListener('employee:updated', handleUpdate);
    window.addEventListener('transaction:updated', handleUpdate);
    window.addEventListener('request:updated', handleUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('equipment:updated', handleUpdate);
      window.removeEventListener('employee:updated', handleUpdate);
      window.removeEventListener('transaction:updated', handleUpdate);
      window.removeEventListener('request:updated', handleUpdate);
    };
  }, [fetchStats, refreshInterval]);

  return {
    stats,
    loading,
    error,
    refreshStats,
    fetchSpecificCounts
  };
};

export default useDashboardStats;