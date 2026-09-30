import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    port: 5173,
    open: true,
    /**
     * Proxy /api/* to the Express backend (port 3001) in development.
     * When the backend is not running, the proxy will fail and the
     * axios service layer will catch the error and fall back to mock data.
     * This prevents Vite's SPA HTML fallback from being returned to API calls.
     */
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        // If the backend is not running, the request will fail fast
        // instead of getting a 200 HTML response from Vite's SPA router.
      },
    },
  },

  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        // Manual chunking to keep bundle sizes reasonable
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'framer': ['framer-motion'],
          'icons': ['lucide-react'],
          'forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
        },
      },
    },
  },
});
