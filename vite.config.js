import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.js'],
            refresh: true,
        }),
        react(),
        tailwindcss(),
    ],
    build: {
        chunkSizeWarningLimit: 1000, // Increase limit to 1MB to reduce warnings
        rollupOptions: {
            output: {
                manualChunks(id) {
                    // Split node_modules into separate chunks
                    if (id.includes('node_modules')) {
                        // React and React-DOM in separate chunk
                        if (id.includes('react') || id.includes('react-dom')) {
                            return 'vendor_react';
                        }
                        // Lucide icons in separate chunk
                        if (id.includes('lucide-react')) {
                            return 'vendor_icons';
                        }
                        // Other vendors
                        return 'vendor';
                    }
                    
                    // Split large components into separate chunks
                    if (id.includes('resources/js/')) {
                        // Modal components
                        if (id.includes('Modal.jsx')) {
                            return 'modals';
                        }
                        // Page components
                        if (id.includes('Page.jsx') || id.includes('Dashboard.jsx')) {
                            return 'pages';
                        }
                        // Service files
                        if (id.includes('services/') || id.includes('hooks/')) {
                            return 'services';
                        }
                    }
                }
            }
        }
    }
});
