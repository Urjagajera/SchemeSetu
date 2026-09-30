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
    watch: {
      ignored: [
        '**/backend/**',
        '**/reports/**',
        '**/.git/**',
        '**/node_modules/**',
      ],
    },
    /**
     * Proxy /api/* to the Express backend (port 3001) in development.
     * When the backend is not running, the proxy returns a graceful 503
     * without polluting the terminal with unhandled ECONNREFUSED stack traces.
     */
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            // Gracefully handle backend being offline or restarting
            if (res && 'writeHead' in res && typeof res.writeHead === 'function' && !res.headersSent) {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                error: 'Backend unavailable on port 3001',
                code: 'ECONNREFUSED',
              }));
            }
          });
        },
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
