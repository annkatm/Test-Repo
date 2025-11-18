import React from 'react';
import { createRoot } from 'react-dom/client';
import { initReact } from './utils/initReact';
import { getOrCreateRoot } from './utils/rootRegistry';
import ErrorBoundary from './components/ErrorBoundary';
import EmployeePage from './EmployeePage.jsx';
import EmployeeDashboard from './Users/EmployeeDashboard.jsx';
import SimpleEmployee from './SimpleEmployee';
import ViewRequest from './ViewRequest';
import ViewApproved from './ViewApproved.jsx';
import ViewExchangeRequests from './ViewExchangeRequests.jsx';
import ActivityLogs from './ActivityLogs.jsx';
import HomePage from './Home.jsx';
import Equipment from './Equipment.jsx';
import AddStocks from './AddStocks.jsx';
import RoleManagementPage from './RoleManagementPage.jsx';
import UsersPage from './UsersPage.jsx';
import ControlPanel from './ControlPanel.jsx';
import Reports from './Reports.jsx';
import Archive from './Archive.jsx';
import LoginPage from './auth/loginpage.jsx';
import ResetPassword from './auth/ResetPassword.jsx';
import ToastContainer from './components/ToastContainer.jsx';
import { replaceAlert } from './utils/toastUtils.js';

// Make React, ReactDOM, and components available globally for fallback mechanisms
window.React = React;
window.ErrorBoundary = ErrorBoundary;

// Properly expose ReactDOM with createRoot method
window.ReactDOM = {};
window.ReactDOM.createRoot = createRoot;

// Expose initialization function
window.initReact = initReact;

// Ensure ReactDOM is properly exposed with all necessary methods
try {
  if (typeof window.ReactDOM.createRoot !== 'function') {
    console.error('createRoot is not properly exposed, attempting to fix');
    window.ReactDOM.createRoot = createRoot;
  }
} catch (error) {
  console.error('Error setting up ReactDOM:', error);
}

// Expose components globally
window.ViewApproved = ViewApproved;
window.ViewRequest = ViewRequest;
window.ViewExchangeRequests = ViewExchangeRequests;
window.ActivityLogs = ActivityLogs;
window.Equipment = Equipment;
window.AddStocks = AddStocks;
window.EmployeePage = EmployeePage;
window.RoleManagementPage = RoleManagementPage;
window.UsersPage = UsersPage;
window.ControlPanel = ControlPanel;
window.Reports = Reports;

// Double check components are properly exposed
console.log('ViewApproved component:', ViewApproved);
console.log('ViewRequest component:', ViewRequest);
console.log('Equipment component:', Equipment);
console.log('AddStocks component:', AddStocks);
console.log('EmployeePage component:', EmployeePage);

// Force expose components if they're not properly set

if (!window.ViewApproved) {
  console.warn('ViewApproved not properly exposed, forcing exposure');
  window.ViewApproved = ViewApproved;
}

if (!window.ViewRequest) {
  console.warn('ViewRequest not properly exposed, forcing exposure');
  window.ViewRequest = ViewRequest;
}

if (!window.Equipment) {
  console.warn('Equipment not properly exposed, forcing exposure');
  window.Equipment = Equipment;
}

if (!window.AddStocks) {
  console.warn('AddStocks not properly exposed, forcing exposure');
  window.AddStocks = AddStocks;
}

// Log global objects to verify they're properly set
console.log('Global objects set:', {
  React: window.React,
  ReactDOM: window.ReactDOM,
  'ReactDOM.createRoot': typeof window.ReactDOM.createRoot === 'function',
  ViewApproved: window.ViewApproved,
  ViewRequest: window.ViewRequest
});

// Import CSS
import '../css/app.css';


// Simple test component for debugging
const TestComponent = () => {
    return React.createElement('div', {
        style: {
            padding: '20px',
            backgroundColor: 'lightblue',
            border: '2px solid blue',
            borderRadius: '5px',
            margin: '20px',
            fontSize: '24px',
            textAlign: 'center'
        }
    }, 'Test Component Loaded Successfully');
};

// Error fallback component for displaying errors
function ErrorFallback({ message }) {
    return React.createElement('div', {
        style: {
            padding: '20px',
            backgroundColor: '#ffebee',
            border: '2px solid #f44336',
            borderRadius: '5px',
            margin: '20px',
            textAlign: 'center'
        }
    }, [
        React.createElement('h2', {
            key: 'title',
            style: { color: '#d32f2f', marginBottom: '10px' }
        }, 'Component Failed to Load'),
        React.createElement('p', {
            key: 'message',
            style: { marginBottom: '10px' }
        }, message || 'There was an error loading the component. Please try reloading the page.'),
        React.createElement('button', {
            key: 'button',
            onClick: () => window.location.reload(),
            style: {
                padding: '10px 20px',
                backgroundColor: '#2196f3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginTop: '10px'
            }
        }, 'Reload Page')
    ]);
}

// For debugging
console.log('App.js loaded');
console.log('React version:', React.version);

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, looking for containers');
    
    // Initialize Toast system and replace alert()
    try {
        // Create toast container
        const toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        document.body.appendChild(toastContainer);
        
        // Render ToastContainer using root registry
        const toastRoot = getOrCreateRoot(toastContainer, createRoot);
        toastRoot.render(React.createElement(ErrorBoundary, null, React.createElement(ToastContainer)));
        
        // Replace alert() with toast notifications
        replaceAlert();
        
        console.log('Toast system initialized');
    } catch (error) {
        console.error('Failed to initialize toast system:', error);
    }
    
    // Check for reset-password-root (for reset password page)
    const resetPasswordContainer = document.getElementById('reset-password-root');
    console.log('reset-password-root element found:', resetPasswordContainer);
    
    if (resetPasswordContainer) {
        try {
            console.log('Initializing ResetPassword component');
            const root = getOrCreateRoot(resetPasswordContainer, createRoot);
            root.render(React.createElement(ErrorBoundary, null, React.createElement(ResetPassword)));
            console.log('ResetPassword component rendered successfully');
        } catch (error) {
            console.error('Error rendering ResetPassword component:', error);
        }
    }
    
    // Check for login-root (for login page)
    const loginContainer = document.getElementById('login-root');
    console.log('login-root element found:', loginContainer);
    
    if (loginContainer) {
        try {
            console.log('Initializing LoginPage component');
            const root = getOrCreateRoot(loginContainer, createRoot);
            
            // Define onAuthSuccess callback
            const handleAuthSuccess = () => {
                console.log('Authentication successful, checking user role for redirect...');
                // Fetch user data to determine appropriate redirect
                fetch('/login-data')
                    .then(response => response.json())
                    .then(data => {
                        if (data.success && data.redirect) {
                            window.location.href = data.redirect;
                        } else {
                            // Fallback to dashboard
                            window.location.href = '/dashboard';
                        }
                    })
                    .catch(error => {
                        console.error('Error fetching login data:', error);
                        // Fallback to dashboard
                        window.location.href = '/dashboard';
                    });
            };
            
            root.render(React.createElement(ErrorBoundary, null, React.createElement(LoginPage, { onAuthSuccess: handleAuthSuccess })));
            console.log('LoginPage component rendered successfully');
        } catch (error) {
            console.error('Error rendering LoginPage component:', error);
            // Use React to render error instead of innerHTML
            try {
                const root = getOrCreateRoot(loginContainer, createRoot);
                root.render(React.createElement(ErrorFallback, { message: error.message }));
            } catch (e) {
                console.error('Failed to render error fallback:', e);
            }
        }
    }
  // Lazy-load SuperAdmin when the superadmin page is present to code-split large admin bundle
  (function lazyLoadSuperAdmin() {
    const superAdminContainer = document.getElementById('superadmin-root');
    if (!superAdminContainer) return;
    // Dynamic import creates a separate chunk for SuperAdmin
    import('./SuperAdmin.jsx')
      .then((mod) => {
        const SuperAdmin = mod.default || mod;
        // Expose globally for existing inline scripts that expect window.SuperAdmin
        try { window.SuperAdmin = SuperAdmin; } catch (e) { /* ignore */ }
        // Try to render immediately if the container is present
        try {
          if (typeof window.ReactDOM !== 'undefined' && typeof window.ReactDOM.createRoot === 'function') {
            const root = getOrCreateRoot(superAdminContainer, window.ReactDOM.createRoot);
            root.render(React.createElement(ErrorBoundary, null, React.createElement(SuperAdmin)));
          }
        } catch (err) {
          console.error('Error rendering lazy-loaded SuperAdmin:', err);
        }
      })
      .catch((err) => {
        console.error('Failed to lazy-load SuperAdmin chunk:', err);
      });
  })();
    
    // Mount Archive page
    const archiveContainer = document.getElementById('archive-root');
    if (archiveContainer) {
        try {
            const root = getOrCreateRoot(archiveContainer, createRoot);
            root.render(React.createElement(ErrorBoundary, null, React.createElement(Archive)));
        } catch (error) {
            console.error('Error rendering Archive component:', error);
        }
    }

    // Check for home-root first (for homepage/dashboard)
    const homeContainer = document.getElementById('home-root');
    console.log('home-root element found:', homeContainer);
    
    if (homeContainer) {
        try {
            console.log('Initializing Home component');
            const root = getOrCreateRoot(homeContainer, createRoot);
            root.render(React.createElement(ErrorBoundary, null, React.createElement(HomePage)));
            console.log('Home component rendered successfully');
        } catch (error) {
            console.error('Error rendering Home component:', error);
            // Use React to render error instead of innerHTML
            try {
                const root = getOrCreateRoot(homeContainer, createRoot);
                root.render(React.createElement(ErrorFallback, { message: error.message }));
            } catch (e) {
                console.error('Failed to render error fallback:', e);
            }
        }
    }
    
    // Check for employee-root (for employee page)
    const employeeContainer = document.getElementById('employee-root');
    console.log('employee-root element found:', employeeContainer);
    
    if (employeeContainer) {
        try {
            // Use root registry to prevent duplicate roots
            const root = getOrCreateRoot(employeeContainer, createRoot);
            
            // Define a function to render the fallback component
            const renderFallback = () => {
                console.log('Rendering SimpleEmployee as fallback');
                try {
                    root.render(React.createElement(ErrorBoundary, null, React.createElement(SimpleEmployee)));
                    console.log('SimpleEmployee fallback rendered successfully');
                } catch (fallbackError) {
                    console.error('Error rendering fallback component:', fallbackError);
                    root.render(React.createElement(ErrorFallback, { message: fallbackError.message }));
                }
            };
            
            // Render EmployeePage component directly on employee page
            try {
                console.log('Rendering EmployeePage component on employee-root');
                root.render(React.createElement(ErrorBoundary, null, React.createElement(EmployeePage)));
                console.log('EmployeePage component rendered to employee-root');
            } catch (employeeError) {
                console.error('Error rendering Employee component:', employeeError);
                // Try to use the inline fallback component if available
                if (window.EmployeeFallback) {
                    console.log('Using inline EmployeeFallback component');
                    try {
                        root.render(React.createElement(ErrorBoundary, null, React.createElement(window.EmployeeFallback)));
                        console.log('EmployeeFallback rendered successfully');
                    } catch (fallbackError) {
                        console.error('Error rendering inline fallback:', fallbackError);
                        renderFallback();
                    }
                } else {
                    renderFallback();
                }
            }
        } catch (error) {
            console.error('Error creating root for employee-root:', error);
            // Use React to render error instead of innerHTML
            try {
                const root = getOrCreateRoot(employeeContainer, createRoot);
                root.render(React.createElement(ErrorFallback, { message: error.message }));
            } catch (e) {
                console.error('Failed to render error fallback:', e);
            }
        }
    }
    
    // Check for role-management-root (for role management page)
    const roleManagementContainer = document.getElementById('role-management-root');
    console.log('role-management-root element found:', roleManagementContainer);
    
    if (roleManagementContainer) {
        try {
            console.log('Initializing RoleManagementPage component');
            const root = getOrCreateRoot(roleManagementContainer, createRoot);
            root.render(React.createElement(ErrorBoundary, null, React.createElement(RoleManagementPage)));
            console.log('RoleManagementPage component rendered successfully');
        } catch (error) {
            console.error('Error rendering RoleManagementPage component:', error);
            // Use React to render error instead of innerHTML
            try {
                const root = getOrCreateRoot(roleManagementContainer, createRoot);
                root.render(React.createElement(ErrorFallback, { message: error.message }));
            } catch (e) {
                console.error('Failed to render error fallback:', e);
            }
        }
    }
    
    // Check for users-root (for users page)
    const usersContainer = document.getElementById('users-root');
    console.log('users-root element found:', usersContainer);
    
    if (usersContainer) {
        try {
            console.log('Initializing UsersPage component');
            console.log('UsersPage component available:', typeof UsersPage);
            
            // Test if UsersPage is properly imported
            if (typeof UsersPage === 'undefined') {
                console.error('UsersPage component is not defined');
                const root = getOrCreateRoot(usersContainer, createRoot);
                root.render(React.createElement(ErrorFallback, { message: 'UsersPage component is not properly imported or defined.' }));
                return;
            }
            
            const root = getOrCreateRoot(usersContainer, createRoot);
            root.render(React.createElement(ErrorBoundary, null, React.createElement(UsersPage)));
            console.log('UsersPage component rendered successfully');
        } catch (error) {
            console.error('Error rendering UsersPage component:', error);
            // Use React to render error instead of innerHTML
            try {
                const root = getOrCreateRoot(usersContainer, createRoot);
                root.render(React.createElement(ErrorFallback, { message: error.message }));
            } catch (e) {
                console.error('Failed to render error fallback:', e);
            }
        }
    }
    
    // Check for control-panel-root (for control panel page)
    const controlPanelContainer = document.getElementById('control-panel-root');
    console.log('control-panel-root element found:', controlPanelContainer);
    
    if (controlPanelContainer) {
        try {
            console.log('Initializing ControlPanel component');
            const root = getOrCreateRoot(controlPanelContainer, createRoot);
            root.render(React.createElement(ErrorBoundary, null, React.createElement(ControlPanel)));
            console.log('ControlPanel component rendered successfully');
        } catch (error) {
            console.error('Error rendering ControlPanel component:', error);
            // Use React to render error instead of innerHTML
            try {
                const root = getOrCreateRoot(controlPanelContainer, createRoot);
                root.render(React.createElement(ErrorFallback, { message: error.message }));
            } catch (e) {
                console.error('Failed to render error fallback:', e);
            }
        }
    }
    
    // Check for reports-root (for reports page)
    const reportsContainer = document.getElementById('reports-root');
    console.log('reports-root element found:', reportsContainer);
    
    if (reportsContainer) {
        try {
            console.log('Initializing Reports component');
            const root = getOrCreateRoot(reportsContainer, createRoot);
            root.render(React.createElement(ErrorBoundary, null, React.createElement(Reports)));
            console.log('Reports component rendered successfully');
        } catch (error) {
            console.error('Error rendering Reports component:', error);
            // Use React to render error instead of innerHTML
            try {
                const root = getOrCreateRoot(reportsContainer, createRoot);
                root.render(React.createElement(ErrorFallback, { message: error.message }));
            } catch (e) {
                console.error('Failed to render error fallback:', e);
            }
        }
    }
    
    // Check for employee-dashboard-root (for employee dashboard page)
    const employeeDashboardContainer = document.getElementById('employee-dashboard-root');
    console.log('employee-dashboard-root element found:', employeeDashboardContainer);
    
    if (employeeDashboardContainer) {
        try {
            console.log('Initializing EmployeeDashboard component');
            const root = getOrCreateRoot(employeeDashboardContainer, createRoot);
            root.render(React.createElement(ErrorBoundary, null, React.createElement(EmployeeDashboard)));
            console.log('EmployeeDashboard component rendered successfully');
        } catch (error) {
            console.error('Error rendering EmployeeDashboard component:', error);
            // Use React to render error instead of innerHTML
            try {
                const root = getOrCreateRoot(employeeDashboardContainer, createRoot);
                root.render(React.createElement(ErrorFallback, { message: error.message }));
            } catch (e) {
                console.error('Failed to render error fallback:', e);
            }
        }
    }
    
    // Check for activitylogs-root (for activity logs page)
    const activityLogsContainer = document.getElementById('activitylogs-root');
    console.log('activitylogs-root element found:', activityLogsContainer);
    
    if (activityLogsContainer) {
        try {
            console.log('Initializing ActivityLogs component');
            const root = getOrCreateRoot(activityLogsContainer, createRoot);
            root.render(React.createElement(ErrorBoundary, null, React.createElement(ActivityLogs)));
            console.log('ActivityLogs component rendered successfully');
        } catch (error) {
            console.error('Error rendering ActivityLogs component:', error);
            // Use React to render error instead of innerHTML
            try {
                const root = getOrCreateRoot(activityLogsContainer, createRoot);
                root.render(React.createElement(ErrorFallback, { message: error.message }));
            } catch (e) {
                console.error('Failed to render error fallback:', e);
            }
        }
    }
    
    // Check for viewexchangerequests-root (for exchange requests page)
    const viewExchangeRequestsContainer = document.getElementById('viewexchangerequests-root');
    console.log('viewexchangerequests-root element found:', viewExchangeRequestsContainer);
    
    if (viewExchangeRequestsContainer) {
        try {
            console.log('Initializing ViewExchangeRequests component');
            const root = getOrCreateRoot(viewExchangeRequestsContainer, createRoot);
            root.render(React.createElement(ErrorBoundary, null, React.createElement(ViewExchangeRequests)));
            console.log('ViewExchangeRequests component rendered successfully');
        } catch (error) {
            console.error('Error rendering ViewExchangeRequests component:', error);
            // Use React to render error instead of innerHTML
            try {
                const root = getOrCreateRoot(viewExchangeRequestsContainer, createRoot);
                root.render(React.createElement(ErrorFallback, { message: error.message }));
            } catch (e) {
                console.error('Failed to render error fallback:', e);
            }
        }
    }
    
    // Check for root element (for other pages)
    const rootContainer = document.getElementById('root');
    console.log('root element found:', rootContainer);
    
    if (rootContainer) {
        try {
            // Use root registry to prevent duplicate roots
            const root = getOrCreateRoot(rootContainer, createRoot);
            
            // Define a function to render the fallback component
            const renderFallback = () => {
                console.log('Rendering SimpleEmployee as fallback');
                try {
                    root.render(React.createElement(ErrorBoundary, null, React.createElement(SimpleEmployee)));
                    console.log('SimpleEmployee fallback rendered successfully');
                } catch (fallbackError) {
                    console.error('Error rendering fallback component:', fallbackError);
                    root.render(React.createElement(ErrorFallback, { message: fallbackError.message }));
                }
            };
            
            // Try to render the main component with error handling
            try {
                console.log('Attempting to render SimpleEmployee component');
                root.render(React.createElement(ErrorBoundary, null, React.createElement(SimpleEmployee)));
                console.log('SimpleEmployee component rendered to root');
            } catch (employeeError) {
                console.error('Error rendering Employee component:', employeeError);
                // Try to use the inline fallback component if available
                if (window.EmployeeFallback) {
                    console.log('Using inline EmployeeFallback component');
                    try {
                        root.render(React.createElement(ErrorBoundary, null, React.createElement(window.EmployeeFallback)));
                        console.log('EmployeeFallback rendered successfully');
                    } catch (fallbackError) {
                        console.error('Error rendering inline fallback:', fallbackError);
                        renderFallback();
                    }
                } else {
                    renderFallback();
                }
            }
        } catch (error) {
            console.error('Error creating root for root:', error);
            // Use React to render error instead of innerHTML
            try {
                const root = getOrCreateRoot(rootContainer, createRoot);
                root.render(React.createElement(ErrorFallback, { message: error.message }));
            } catch (e) {
                console.error('Failed to render error fallback:', e);
            }
        }
    }
});