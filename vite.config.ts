import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    // Installable app (add to home screen) with offline basics: the app's screens, its fonts and the scheme pages
    // a person has opened recently. Search, SetuAI, eligibility checks and anything signed-in still need internet.
    // Only in a production build (npm run build / preview); the dev server has no service worker.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.png', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'SchemeSetu',
        short_name: 'SchemeSetu',
        description: 'Find Indian government schemes you are eligible for, in English, Hindi and Gujarati.',
        lang: 'en-IN',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#faf9fd',
        theme_color: '#1960a3',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        // Any page opens offline from the saved app; /api is never answered with the page.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // A scheme's own page (same for everyone, no sign-in): newest from the network, the saved copy when offline.
            urlPattern: ({ url, request }) => request.method === 'GET' && /^\/api\/schemes\/[0-9a-f-]{36}$/i.test(url.pathname),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'scheme-pages',
              networkTimeoutSeconds: 6,
              expiration: { maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    port: 5173,
    // Google sign-in only accepts the origins registered for the client ID (http://localhost:5173 here). If another
    // app already has 5173, stop with an error instead of quietly moving to 5174, where sign-in fails with
    // "Error 400: origin_mismatch".
    strictPort: true,
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
