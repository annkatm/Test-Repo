<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>iREPLY</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    
    <!-- React CDN (development version) -->
    <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
    
    <!-- Vite Assets -->
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/app.js'])
    
    <script>
        // Global error handler for resource loading failures
        window.addEventListener('error', function(e) {
            if (e.target && (e.target.src || e.target.href)) {
                console.error('Resource failed to load:', e.target.src || e.target.href);
                // If a critical resource fails, we might want to reload or show a message
                if ((e.target.src || e.target.href).includes('app.js')) {
                    console.error('Critical app.js resource failed to load');
                    // Add a reload button immediately
                    addReloadButton();
                }
            }
        }, true); // Use capture to get all events
        
        // Function to add a reload button to the page
        function addReloadButton() {
            const container = document.getElementById('superadmin-root');
            if (container && container.childNodes.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 40px; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #2563EB; font-size: 24px; margin-bottom: 16px;">Super Admin Dashboard</h2>
                        <p style="color: #4B5563; margin-bottom: 24px;">The dashboard is currently unavailable. Please try again later.</p>
                        <button onclick="window.location.reload()" 
                                style="background-color: #2563EB; color: white; border: none; padding: 8px 16px; 
                                       border-radius: 4px; cursor: pointer;">
                            Reload Page
                        </button>
                    </div>
                `;
            }
        }

        // Check if the app is loaded after a timeout
        setTimeout(function() {
            const container = document.getElementById('superadmin-root');
            if (container && container.childNodes.length === 0) {
                addReloadButton();
            }
        }, 3000); // Check after 3 seconds
    </script>
</head>
<body>
    <div id="superadmin-root"></div>
    
    
    <script>
        console.log('SuperAdmin page loaded');
        console.log('React available:', typeof window.React);
        console.log('ReactDOM available:', typeof window.ReactDOM);
        console.log('SuperAdmin component available:', typeof window.SuperAdmin);
        
        // Function to render a fallback UI if React component fails to load
        function renderFallback() {
            const container = document.getElementById('superadmin-root');
            if (container) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 40px; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #2563EB; font-size: 24px; margin-bottom: 16px;">Super Admin Dashboard</h2>
                        <p style="color: #4B5563; margin-bottom: 24px;">The dashboard is currently unavailable. Please try again later.</p>
                        <button onclick="window.location.reload()" 
                                style="background-color: #2563EB; color: white; border: none; padding: 8px 16px; 
                                       border-radius: 4px; cursor: pointer;">
                            Reload Page
                        </button>
                    </div>
                `;
            }
        }

        // Initialize SuperAdmin component
        setTimeout(() => {
            try {
                const container = document.getElementById('superadmin-root');
                
                if (!container) {
                    console.error('Container not found');
                    return;
                }
                
                // Render the SuperAdmin component
                if (typeof window.ReactDOM !== 'undefined' && typeof window.ReactDOM.createRoot === 'function') {
                    const root = window.ReactDOM.createRoot(container);
                    root.render(window.React.createElement(window.SuperAdmin));
                } else {
                    renderFallback();
                }
            } catch (error) {
                console.error('Error rendering SuperAdmin component:', error);
                renderFallback();
            }
        }, 1000);
    </script>
</body>
</html>