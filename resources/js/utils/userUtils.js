/**
 * Utility functions for user authentication and employee ID retrieval
 */

/**
 * Get the current user's employee ID
 * @returns {Promise<number|null>} The employee ID or null if not found
 */
export const getCurrentUserEmployeeId = async () => {
  try {
    // Get current user's authentication data
    const userResponse = await fetch('/check-auth', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      credentials: 'same-origin'
    });
    
    const userData = await userResponse.json();
    if (!userData.authenticated || !userData.user) {
      return null;
    }

    // First try to get employee ID from linked_employee_id
    if (userData.user.linked_employee_id) {
      return userData.user.linked_employee_id;
    }

    // Fallback: find employee by email
    const employeeResponse = await fetch('/api/employees');
    const employeeData = await employeeResponse.json();
    const employees = employeeData.success ? employeeData.data : employeeData;
    
    if (Array.isArray(employees) && userData.user.email) {
      const found = employees.find(emp => 
        emp.email && emp.email.toLowerCase() === userData.user.email.toLowerCase()
      );
      if (found) return found.id;
    }

    return null;
  } catch (error) {
    console.error('Failed to get current user employee ID:', error);
    return null;
  }
};

/**
 * Check if the current user is authenticated
 * @returns {Promise<boolean>} True if authenticated, false otherwise
 */
export const isUserAuthenticated = async () => {
  try {
    const userResponse = await fetch('/check-auth', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      credentials: 'same-origin'
    });
    
    const userData = await userResponse.json();
    return userData.authenticated && !!userData.user;
  } catch (error) {
    console.error('Failed to check user authentication:', error);
    return false;
  }
};
