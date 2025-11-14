/**
 * Root Registry - Manages React root instances to prevent duplicate roots
 * and ensure proper cleanup
 */

const rootRegistry = new Map();

/**
 * Get or create a React root for a container
 * @param {HTMLElement} container - The DOM container element
 * @param {Function} createRootFn - Function to create a root (from react-dom/client)
 * @returns {Object} React root instance
 */
export function getOrCreateRoot(container, createRootFn) {
    if (!container) {
        throw new Error('Container element is required');
    }

    // Check if a root already exists for this container
    const existingRoot = rootRegistry.get(container);
    if (existingRoot) {
        return existingRoot;
    }

    // Create a new root
    const root = createRootFn(container);
    rootRegistry.set(container, root);

    // Clean up when container is removed from DOM
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.removedNodes.forEach((node) => {
                if (node === container || (node.nodeType === 1 && node.contains(container))) {
                    // Container was removed, clean up root
                    try {
                        root.unmount();
                    } catch (e) {
                        // Ignore unmount errors
                    }
                    rootRegistry.delete(container);
                    observer.disconnect();
                }
            });
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    return root;
}

/**
 * Unmount and remove a root from the registry
 * @param {HTMLElement} container - The DOM container element
 */
export function unmountRoot(container) {
    const root = rootRegistry.get(container);
    if (root) {
        try {
            root.unmount();
        } catch (e) {
            console.error('Error unmounting root:', e);
        }
        rootRegistry.delete(container);
    }
}

/**
 * Check if a root exists for a container
 * @param {HTMLElement} container - The DOM container element
 * @returns {boolean}
 */
export function hasRoot(container) {
    return rootRegistry.has(container);
}

/**
 * Clear all roots (useful for cleanup)
 */
export function clearAllRoots() {
    rootRegistry.forEach((root, container) => {
        try {
            root.unmount();
        } catch (e) {
            // Ignore unmount errors
        }
    });
    rootRegistry.clear();
}

