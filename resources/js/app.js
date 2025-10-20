import React from 'react';
import { createRoot } from 'react-dom/client';
import { initReact } from './utils/initReact';
import EmployeePage from './EmployeePage.jsx';
import EmployeeDashboard from './Users/EmployeeDashboard.jsx';
import SimpleEmployee from './SimpleEmployee';
import ViewRequest from './ViewRequest';
import ViewApproved from './ViewApproved.jsx';
import ActivityLogs from './ActivityLogs.jsx';
import HomePage from './Home.jsx';
import Equipment from './Equipment.jsx';
import AddStocks from './AddStocks.jsx';
import RoleManagementPage from './RoleManagementPage.jsx';
import UsersPage from './UsersPage.jsx';
import ControlPanel from './ControlPanel.jsx';
import Reports from './Reports.jsx';
import Archive from './Archive.jsx';
import ToastContainer from './components/ToastContainer.jsx';
import { replaceAlert } from './utils/toastUtils.js';

// Make React, ReactDOM, and components available globally for fallback mechanisms
window.React = React;

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
        
        // Render ToastContainer
        const root = createRoot(toastContainer);
        root.render(React.createElement(ToastContainer));
        
        // Replace alert() with toast notifications
        replaceAlert();
        
        console.log('Toast system initialized');
    } catch (error) {
        console.error('Failed to initialize toast system:', error);
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
            const root = window.ReactDOM.createRoot(superAdminContainer);
            root.render(window.React.createElement(SuperAdmin));
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
            const root = createRoot(archiveContainer);
            root.render(React.createElement(Archive));
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
            const root = createRoot(homeContainer);
            root.render(React.createElement(HomePage));
            console.log('Home component rendered successfully');
        } catch (error) {
            console.error('Error rendering Home component:', error);
            // Display error message in the UI
            homeContainer.innerHTML = `
              <div style="padding: 20px; background-color: #ffebee; border: 2px solid #f44336; border-radius: 5px; margin: 20px; text-align: center;">
                <h2 style="color: #d32f2f;">Home Failed to Load</h2>
                <p>There was an error loading the Dashboard component. Please try reloading the page.</p>
                <button onclick="window.location.reload()" style="padding: 10px 20px; background-color: #2196f3; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 10px;">
                  Reload Page
                </button>
              </div>
            `;
        }
    }
    
    // Check for employee-root (for employee page)
    const employeeContainer = document.getElementById('employee-root');
    console.log('employee-root element found:', employeeContainer);
    
    if (employeeContainer) {
        try {
            // Create a root for the container
            const root = createRoot(employeeContainer);
            
            // Define a function to render the fallback component
            const renderFallback = () => {
                console.log('Rendering SimpleEmployee as fallback');
                try {
                    root.render(React.createElement(SimpleEmployee));
                    console.log('SimpleEmployee fallback rendered successfully');
                } catch (fallbackError) {
                    console.error('Error rendering fallback component:', fallbackError);
                    // If even the fallback fails, show a basic message
                    employeeContainer.innerHTML = '<div style="padding: 20px; background-color: lightcoral; border: 2px solid red; border-radius: 5px; margin: 20px; font-size: 24px; text-align: center;">Fallback: React Component Failed to Load</div>';
                }
            };
            
            // Render SimpleEmployee component directly on employee page
            try {
                console.log('Rendering SimpleEmployee component on employee-root');
                root.render(React.createElement(SimpleEmployee));
                console.log('SimpleEmployee component rendered to employee-root');
            } catch (employeeError) {
                console.error('Error rendering Employee component:', employeeError);
                // Try to use the inline fallback component if available
                if (window.EmployeeFallback) {
                    console.log('Using inline EmployeeFallback component');
                    try {
                        root.render(React.createElement(window.EmployeeFallback));
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
            // If we can't even create a root, show a basic message
            employeeContainer.innerHTML = '<div style="padding: 20px; background-color: lightcoral; border: 2px solid red; border-radius: 5px; margin: 20px; font-size: 24px; text-align: center;">Fallback: React Component Failed to Load</div>';
        }
    }
    
    // Check for role-management-root (for role management page)
    const roleManagementContainer = document.getElementById('role-management-root');
    console.log('role-management-root element found:', roleManagementContainer);
    
    if (roleManagementContainer) {
        try {
            console.log('Initializing RoleManagementPage component');
            const root = createRoot(roleManagementContainer);
            root.render(React.createElement(RoleManagementPage));
            console.log('RoleManagementPage component rendered successfully');
        } catch (error) {
            console.error('Error rendering RoleManagementPage component:', error);
            // Display error message in the UI
            roleManagementContainer.innerHTML = `
              <div style="padding: 20px; background-color: #ffebee; border: 2px solid #f44336; border-radius: 5px; margin: 20px; text-align: center;">
                <h2 style="color: #d32f2f;">Role Management Failed to Load</h2>
                <p>There was an error loading the Role Management component. Please try reloading the page.</p>
                <button onclick="window.location.reload()" style="padding: 10px 20px; background-color: #2196f3; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 10px;">
                  Reload Page
                </button>
              </div>
            `;
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
                usersContainer.innerHTML = `
                  <div style="padding: 20px; background-color: #ffebee; border: 2px solid #f44336; border-radius: 5px; margin: 20px; text-align: center;">
                    <h2 style="color: #d32f2f;">UsersPage Component Not Found</h2>
                    <p>The UsersPage component is not properly imported or defined.</p>
                    <button onclick="window.location.reload()" style="padding: 10px 20px; background-color: #2196f3; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 10px;">
                      Reload Page
                    </button>
                  </div>
                `;
                return;
            }
            
            const root = createRoot(usersContainer);
            root.render(React.createElement(UsersPage));
            console.log('UsersPage component rendered successfully');
        } catch (error) {
            console.error('Error rendering UsersPage component:', error);
            // Display error message in the UI
            usersContainer.innerHTML = `
              <div style="padding: 20px; background-color: #ffebee; border: 2px solid #f44336; border-radius: 5px; margin: 20px; text-align: center;">
                <h2 style="color: #d32f2f;">Users Failed to Load</h2>
                <p>There was an error loading the Users component. Please try reloading the page.</p>
                <p>Error: ${error.message}</p>
                <button onclick="window.location.reload()" style="padding: 10px 20px; background-color: #2196f3; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 10px;">
                  Reload Page
                </button>
              </div>
            `;
        }
    }
    
    // Check for control-panel-root (for control panel page)
    const controlPanelContainer = document.getElementById('control-panel-root');
    console.log('control-panel-root element found:', controlPanelContainer);
    
    if (controlPanelContainer) {
        try {
            console.log('Initializing ControlPanel component');
            const root = createRoot(controlPanelContainer);
            root.render(React.createElement(ControlPanel));
            console.log('ControlPanel component rendered successfully');
        } catch (error) {
            console.error('Error rendering ControlPanel component:', error);
            // Display error message in the UI
            controlPanelContainer.innerHTML = `
              <div style="padding: 20px; background-color: #ffebee; border: 2px solid #f44336; border-radius: 5px; margin: 20px; text-align: center;">
                <h2 style="color: #d32f2f;">Control Panel Failed to Load</h2>
                <p>There was an error loading the Control Panel component. Please try reloading the page.</p>
                <button onclick="window.location.reload()" style="padding: 10px 20px; background-color: #2196f3; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 10px;">
                  Reload Page
                </button>
              </div>
            `;
        }
    }
    
    // Check for reports-root (for reports page)
    const reportsContainer = document.getElementById('reports-root');
    console.log('reports-root element found:', reportsContainer);
    
    if (reportsContainer) {
        try {
            console.log('Initializing Reports component');
            const root = createRoot(reportsContainer);
            root.render(React.createElement(Reports));
            console.log('Reports component rendered successfully');
        } catch (error) {
            console.error('Error rendering Reports component:', error);
            // Display error message in the UI
            reportsContainer.innerHTML = `
              <div style="padding: 20px; background-color: #ffebee; border: 2px solid #f44336; border-radius: 5px; margin: 20px; text-align: center;">
                <h2 style="color: #d32f2f;">Reports Failed to Load</h2>
                <p>There was an error loading the Reports component. Please try reloading the page.</p>
                <button onclick="window.location.reload()" style="padding: 10px 20px; background-color: #2196f3; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 10px;">
                  Reload Page
                </button>
              </div>
            `;
        }
    }
    
    // Check for employee-dashboard-root (for employee dashboard page)
    const employeeDashboardContainer = document.getElementById('employee-dashboard-root');
    console.log('employee-dashboard-root element found:', employeeDashboardContainer);
    
    if (employeeDashboardContainer) {
        try {
            console.log('Initializing EmployeeDashboard component');
            const root = createRoot(employeeDashboardContainer);
            root.render(React.createElement(EmployeeDashboard));
            console.log('EmployeeDashboard component rendered successfully');
        } catch (error) {
            console.error('Error rendering EmployeeDashboard component:', error);
            // Display error message in the UI
            employeeDashboardContainer.innerHTML = `
              <div style="padding: 20px; background-color: #ffebee; border: 2px solid #f44336; border-radius: 5px; margin: 20px; text-align: center;">
                <h2 style="color: #d32f2f;">Employee Dashboard Failed to Load</h2>
                <p>There was an error loading the Employee Dashboard component. Please try reloading the page.</p>
                <button onclick="window.location.reload()" style="padding: 10px 20px; background-color: #2196f3; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 10px;">
                  Reload Page
                </button>
              </div>
            `;
        }
    }
    
    // Check for activitylogs-root (for activity logs page)
    const activityLogsContainer = document.getElementById('activitylogs-root');
    console.log('activitylogs-root element found:', activityLogsContainer);
    
    if (activityLogsContainer) {
        try {
            console.log('Initializing ActivityLogs component');
            const root = createRoot(activityLogsContainer);
            root.render(React.createElement(ActivityLogs));
            console.log('ActivityLogs component rendered successfully');
        } catch (error) {
            console.error('Error rendering ActivityLogs component:', error);
            // Display error message in the UI
            activityLogsContainer.innerHTML = `
              <div style="padding: 20px; background-color: #ffebee; border: 2px solid #f44336; border-radius: 5px; margin: 20px; text-align: center;">
                <h2 style="color: #d32f2f;">Activity Logs Failed to Load</h2>
                <p>There was an error loading the Activity Logs component. Please try reloading the page.</p>
                <button onclick="window.location.reload()" style="padding: 10px 20px; background-color: #2196f3; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 10px;">
                  Reload Page
                </button>
              </div>
            `;
        }
    }
    
    // Check for root element (for other pages)
    const rootContainer = document.getElementById('root');
    console.log('root element found:', rootContainer);
    
    if (rootContainer) {
        try {
            // Create a root for the container
            const root = createRoot(rootContainer);
            
            // Define a function to render the fallback component
            const renderFallback = () => {
                console.log('Rendering SimpleEmployee as fallback');
                try {
                    root.render(React.createElement(SimpleEmployee));
                    console.log('SimpleEmployee fallback rendered successfully');
                } catch (fallbackError) {
                    console.error('Error rendering fallback component:', fallbackError);
                    // If even the fallback fails, show a basic message
                    rootContainer.innerHTML = '<div style="padding: 20px; background-color: lightcoral; border: 2px solid red; border-radius: 5px; margin: 20px; font-size: 24px; text-align: center;">Fallback: React Component Failed to Load</div>';
                }
            };
            
            // Try to render the main component with error handling
            try {
                console.log('Attempting to render SimpleEmployee component');
                root.render(React.createElement(SimpleEmployee));
                console.log('SimpleEmployee component rendered to root');
            } catch (employeeError) {
                console.error('Error rendering Employee component:', employeeError);
                // Try to use the inline fallback component if available
                if (window.EmployeeFallback) {
                    console.log('Using inline EmployeeFallback component');
                    try {
                        root.render(React.createElement(window.EmployeeFallback));
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
            // If we can't even create a root, show a basic message
            rootContainer.innerHTML = '<div style="padding: 20px; background-color: lightcoral; border: 2px solid red; border-radius: 5px; margin: 20px; font-size: 24px; text-align: center;">Fallback: React Component Failed to Load</div>';
        }
    }
});