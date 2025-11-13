import { getOrCreateRoot } from './rootRegistry';
import ErrorBoundary from '../components/ErrorBoundary';

// Use window.ErrorBoundary if available (for window context), otherwise use imported one
const getErrorBoundary = () => window.ErrorBoundary || ErrorBoundary;

/**
 * Initializes a React component with proper error handling and fallback behavior
 * @param {string} rootId - The ID of the root element to mount the component
 * @param {React.ComponentType} Component - The React component to render
 * @param {React.ComponentType} [FallbackComponent] - Optional fallback component to render on error
 * @param {number} [retryDelay=200] - Delay in ms before retrying component initialization
 */
export function initReact(rootId, Component, FallbackComponent, retryDelay = 200) {
    if (!window.React || !window.ReactDOM || !window.ReactDOM.createRoot) {
        console.error('React dependencies not loaded');
        return;
    }

    const container = document.getElementById(rootId);
    if (!container) {
        console.error(`Root element #${rootId} not found`);
        return;
    }

    try {
        // Use root registry to prevent duplicate roots
        const root = getOrCreateRoot(container, window.ReactDOM.createRoot);
        
        try {
            // Wrap component in ErrorBoundary
            const ErrorBoundaryComponent = getErrorBoundary();
            const element = window.React.createElement(
                ErrorBoundaryComponent,
                null,
                window.React.createElement(Component)
            );
            root.render(element);
            console.log(`Successfully rendered ${Component.name || 'component'} to #${rootId}`);
        } catch (componentError) {
            console.error(`Error rendering component:`, componentError);
            
            if (FallbackComponent) {
                try {
                    const ErrorBoundaryComponent = getErrorBoundary();
                    const fallbackElement = window.React.createElement(
                        ErrorBoundaryComponent,
                        null,
                        window.React.createElement(FallbackComponent)
                    );
                    root.render(fallbackElement);
                    console.log(`Rendered fallback component for ${rootId}`);
                } catch (fallbackError) {
                    console.error('Error rendering fallback:', fallbackError);
                    // Use React to render error message instead of innerHTML
                    root.render(window.React.createElement(ErrorFallback, { message: fallbackError.message }));
                }
            } else {
                // Use React to render error message instead of innerHTML
                root.render(window.React.createElement(ErrorFallback, { message: componentError.message }));
            }
        }
    } catch (error) {
        console.error('Critical initialization error:', error);
        // Only use innerHTML as last resort if React is completely broken
        if (container && !container._reactRootContainer) {
            renderErrorMessage(container);
        }
    }
}

// React component for error display
function ErrorFallback({ message }) {
    return window.React.createElement('div', {
        style: {
            padding: '20px',
            backgroundColor: '#fee2e2',
            border: '2px solid #ef4444',
            borderRadius: '6px',
            margin: '20px'
        }
    }, [
        window.React.createElement('h3', {
            key: 'title',
            style: { color: '#991b1b', marginBottom: '10px', fontSize: '18px' }
        }, 'Component Failed to Load'),
        window.React.createElement('p', {
            key: 'message',
            style: { color: '#7f1d1d', marginBottom: '10px' }
        }, message || 'Please try refreshing the page. If the problem persists, contact support.'),
        window.React.createElement('button', {
            key: 'button',
            onClick: () => window.location.reload(),
            style: {
                marginTop: '10px',
                padding: '8px 16px',
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
            }
        }, 'Reload Page')
    ]);
}

function renderErrorMessage(container) {
    if (!container) return;
    container.innerHTML = `
        <div style="padding: 20px; background-color: #fee2e2; border: 2px solid #ef4444; border-radius: 6px; margin: 20px;">
            <h3 style="color: #991b1b; margin-bottom: 10px; font-size: 18px;">Component Failed to Load</h3>
            <p style="color: #7f1d1d;">Please try refreshing the page. If the problem persists, contact support.</p>
            <button onclick="window.location.reload()" 
                    style="margin-top: 10px; padding: 8px 16px; background-color: #dc2626; color: white; 
                           border: none; border-radius: 4px; cursor: pointer;">
                Reload Page
            </button>
        </div>
    `;
}