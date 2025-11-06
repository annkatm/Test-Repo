// API Service Layer for iREPLY Inventory Management System
import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Session/token invalid: send to root (our login route is GET /)
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Authentication Services
export const authService = {
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    const { user, token } = response.data.data;
    
    // Store auth data
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user', JSON.stringify(user));
    
    return response.data;
  },

  logout: async () => {
    await api.post('/auth/logout');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  updateProfile: async (profileData) => {
    const response = await api.put('/auth/profile', profileData);
    return response.data;
  },

  changePassword: async (passwordData) => {
    const response = await api.put('/auth/change-password', passwordData);
    return response.data;
  },

  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },
};

// Equipment Services
export const equipmentService = {
  getAll: async (params = {}) => {
    const response = await api.get('/equipment', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/equipment/${id}`);
    return response.data;
  },

  create: async (equipmentData) => {
    const response = await api.post('/equipment', equipmentData);
    return response.data;
  },

  update: async (id, equipmentData) => {
    const response = await api.put(`/equipment/${id}`, equipmentData);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/equipment/${id}`);
    return response.data;
  },

  getStatistics: async () => {
    const response = await api.get('/equipment-statistics');
    return response.data;
  },
};

// Request Services
export const requestService = {
  getAll: async (params = {}) => {
    const response = await api.get('/requests', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/requests/${id}`);
    return response.data;
  },

  create: async (requestData) => {
    const response = await api.post('/requests', requestData);
    return response.data;
  },

  update: async (id, requestData) => {
    const response = await api.put(`/requests/${id}`, requestData);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/requests/${id}`);
    return response.data;
  },

  approve: async (id, approvalData = {}) => {
    const response = await api.post(`/requests/${id}/approve`, approvalData);
    return response.data;
  },

  reject: async (id, rejectionData) => {
    const response = await api.post(`/requests/${id}/reject`, rejectionData);
    return response.data;
  },

  getStatistics: async () => {
    const response = await api.get('/request-statistics');
    return response.data;
  },
};

// Transaction Services
export const transactionService = {
  getAll: async (params = {}) => {
    const response = await api.get('/transactions', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/transactions/${id}`);
    return response.data;
  },

  create: async (transactionData) => {
    const response = await api.post('/transactions', transactionData);
    return response.data;
  },

  update: async (id, transactionData) => {
    const response = await api.put(`/transactions/${id}`, transactionData);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/transactions/${id}`);
    return response.data;
  },

  release: async (id, releaseData = {}) => {
    const response = await api.post(`/transactions/${id}/release`, releaseData);
    return response.data;
  },

  print: async (id) => {
    const response = await api.get(`/transactions/${id}/print`);
    return response.data;
  },

  getDashboard: async () => {
    const response = await api.get('/transactions/dashboard');
    return response.data;
  },
};

// Reports Services
export const reportService = {
  getOverview: async (params = {}) => {
    const response = await api.get('/reports/overview', { params });
    return response.data;
  },
  exportCsv: async (params = {}) => {
    const response = await api.get('/reports/export', {
      params,
      responseType: 'blob',
    });
    return response;
  },
};

// User Services
export const userService = {
  getAll: async (params = {}) => {
    const response = await api.get('/users', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  create: async (userData) => {
    const response = await api.post('/users', userData);
    return response.data;
  },

  update: async (id, userData) => {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },

  // User permission methods
  getPermissions: async (id) => {
    const response = await api.get(`/users/${id}/permissions`);
    return response.data;
  },

  setPermissions: async (id, permissions, useCustom = true) => {
    const response = await api.post(`/users/${id}/permissions`, {
      permissions,
      use_custom: useCustom
    });
    return response.data;
  },

  resetPermissions: async (id) => {
    const response = await api.post(`/users/${id}/permissions/reset`);
    return response.data;
  },
};

// Role Services
export const roleService = {
  getAll: async () => {
    // Use session-authenticated web routes (no /api prefix)
    const response = await axios.get('/roles', { withCredentials: true });
    return response.data;
  },

  getById: async (id) => {
    const response = await axios.get(`/roles/${id}`, { withCredentials: true });
    return response.data;
  },

  create: async (roleData) => {
    const response = await axios.post('/roles', roleData, { withCredentials: true });
    return response.data;
  },

  update: async (id, roleData) => {
    const response = await axios.put(`/roles/${id}`, roleData, { withCredentials: true });
    return response.data;
  },

  delete: async (id) => {
    const response = await axios.delete(`/roles/${id}`, { withCredentials: true });
    return response.data;
  },

  setPermissions: async (id, permissions) => {
    const response = await axios.post(`/roles/${id}/permissions`, { permissions }, { withCredentials: true });
    return response.data;
  },
};

// Employee Services
export const employeeService = {
  getAll: async (params = {}) => {
    const response = await api.get('/employees', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/employees/${id}`);
    return response.data;
  },

  create: async (employeeData) => {
    const response = await api.post('/employees', employeeData);
    return response.data;
  },

  update: async (id, employeeData) => {
    const response = await api.put(`/employees/${id}`, employeeData);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/employees/${id}`);
    return response.data;
  },

  getCurrentHolders: async () => {
    const response = await api.get('/employees/current-holders');
    return response.data;
  },

  getPendingRequests: async () => {
    const response = await api.get('/employees/pending-requests');
    return response.data;
  },

  getVerifyReturns: async () => {
    const response = await api.get('/employees/verify-returns');
    return response.data;
  },
};

// Utility functions
export const apiUtils = {
  handleError: (error) => {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.response?.data?.errors) {
      return Object.values(error.response.data.errors).flat().join(', ');
    }
    return 'An unexpected error occurred';
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('auth_token');
  },

  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  hasRole: (role) => {
    const user = apiUtils.getCurrentUser();
    return user?.role?.name === role;
  },

  hasPermission: (permission) => {
    const user = apiUtils.getCurrentUser();
    
    // Check if user has custom permissions enabled
    if (user?.user_permissions?.use_custom_permissions) {
      return user.user_permissions.permissions?.includes(permission) || false;
    }
    
    // Fall back to role permissions
    return user?.role?.permissions?.includes(permission) || false;
  },
};

export default api;
