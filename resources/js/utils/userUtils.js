// Utility helpers for user-related data used across the app
// Provides a stable way to retrieve the current logged-in employee id

export const getCurrentUserEmployeeId = async () => {
  try {
    // Try localStorage first (set during login elsewhere in the app)
    const raw = localStorage.getItem('user');
    if (raw) {
      try {
        const user = JSON.parse(raw);
        const lsId = user?.employee?.id || user?.employee_id || user?.employeeId;
        if (lsId) return lsId;
      } catch (_) {
        // ignore parse error and fallback to API
      }
    }

    // Fallback to backend profile endpoint
    const res = await fetch('/api/profile', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      const u = data?.data || data?.user || {};
      const apiId = u?.employee?.id || u?.employee_id || u?.employeeId;
      if (apiId) return apiId;
    }
  } catch (e) {
    // ignore and return null
  }
  return null;
};
