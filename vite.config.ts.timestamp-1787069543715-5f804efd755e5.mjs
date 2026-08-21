// vite.config.ts
import { defineConfig } from "file:///D:/ANTI/SchemeSetu/node_modules/vite/dist/node/index.js";
import react from "file:///D:/ANTI/SchemeSetu/node_modules/@vitejs/plugin-react/dist/index.js";
import path from "path";
var __vite_injected_original_dirname = "D:\\ANTI\\SchemeSetu";
var vite_config_default = defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
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
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false
        // If the backend is not running, the request will fail fast
        // instead of getting a 200 HTML response from Vite's SPA router.
      }
    }
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      output: {
        // Manual chunking to keep bundle sizes reasonable
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "framer": ["framer-motion"],
          "icons": ["lucide-react"],
          "forms": ["react-hook-form", "@hookform/resolvers", "zod"]
        }
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxBTlRJXFxcXFNjaGVtZVNldHVcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkQ6XFxcXEFOVElcXFxcU2NoZW1lU2V0dVxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRDovQU5USS9TY2hlbWVTZXR1L3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtyZWFjdCgpXSxcblxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgICdAJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjJyksXG4gICAgfSxcbiAgfSxcblxuICBzZXJ2ZXI6IHtcbiAgICBwb3J0OiA1MTczLFxuICAgIG9wZW46IHRydWUsXG4gICAgLyoqXG4gICAgICogUHJveHkgL2FwaS8qIHRvIHRoZSBFeHByZXNzIGJhY2tlbmQgKHBvcnQgMzAwMSkgaW4gZGV2ZWxvcG1lbnQuXG4gICAgICogV2hlbiB0aGUgYmFja2VuZCBpcyBub3QgcnVubmluZywgdGhlIHByb3h5IHdpbGwgZmFpbCBhbmQgdGhlXG4gICAgICogYXhpb3Mgc2VydmljZSBsYXllciB3aWxsIGNhdGNoIHRoZSBlcnJvciBhbmQgZmFsbCBiYWNrIHRvIG1vY2sgZGF0YS5cbiAgICAgKiBUaGlzIHByZXZlbnRzIFZpdGUncyBTUEEgSFRNTCBmYWxsYmFjayBmcm9tIGJlaW5nIHJldHVybmVkIHRvIEFQSSBjYWxscy5cbiAgICAgKi9cbiAgICBwcm94eToge1xuICAgICAgJy9hcGknOiB7XG4gICAgICAgIHRhcmdldDogJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMScsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgc2VjdXJlOiBmYWxzZSxcbiAgICAgICAgLy8gSWYgdGhlIGJhY2tlbmQgaXMgbm90IHJ1bm5pbmcsIHRoZSByZXF1ZXN0IHdpbGwgZmFpbCBmYXN0XG4gICAgICAgIC8vIGluc3RlYWQgb2YgZ2V0dGluZyBhIDIwMCBIVE1MIHJlc3BvbnNlIGZyb20gVml0ZSdzIFNQQSByb3V0ZXIuXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG5cbiAgYnVpbGQ6IHtcbiAgICBvdXREaXI6ICdkaXN0JyxcbiAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICBvdXRwdXQ6IHtcbiAgICAgICAgLy8gTWFudWFsIGNodW5raW5nIHRvIGtlZXAgYnVuZGxlIHNpemVzIHJlYXNvbmFibGVcbiAgICAgICAgbWFudWFsQ2h1bmtzOiB7XG4gICAgICAgICAgJ3JlYWN0LXZlbmRvcic6IFsncmVhY3QnLCAncmVhY3QtZG9tJywgJ3JlYWN0LXJvdXRlci1kb20nXSxcbiAgICAgICAgICAnZnJhbWVyJzogWydmcmFtZXItbW90aW9uJ10sXG4gICAgICAgICAgJ2ljb25zJzogWydsdWNpZGUtcmVhY3QnXSxcbiAgICAgICAgICAnZm9ybXMnOiBbJ3JlYWN0LWhvb2stZm9ybScsICdAaG9va2Zvcm0vcmVzb2x2ZXJzJywgJ3pvZCddLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICB9LFxufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQThPLFNBQVMsb0JBQW9CO0FBQzNRLE9BQU8sV0FBVztBQUNsQixPQUFPLFVBQVU7QUFGakIsSUFBTSxtQ0FBbUM7QUFJekMsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUyxDQUFDLE1BQU0sQ0FBQztBQUFBLEVBRWpCLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssS0FBSyxRQUFRLGtDQUFXLE9BQU87QUFBQSxJQUN0QztBQUFBLEVBQ0Y7QUFBQSxFQUVBLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLE1BQU07QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxJQU9OLE9BQU87QUFBQSxNQUNMLFFBQVE7QUFBQSxRQUNOLFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxRQUNkLFFBQVE7QUFBQTtBQUFBO0FBQUEsTUFHVjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFFQSxPQUFPO0FBQUEsSUFDTCxRQUFRO0FBQUEsSUFDUixlQUFlO0FBQUEsTUFDYixRQUFRO0FBQUE7QUFBQSxRQUVOLGNBQWM7QUFBQSxVQUNaLGdCQUFnQixDQUFDLFNBQVMsYUFBYSxrQkFBa0I7QUFBQSxVQUN6RCxVQUFVLENBQUMsZUFBZTtBQUFBLFVBQzFCLFNBQVMsQ0FBQyxjQUFjO0FBQUEsVUFDeEIsU0FBUyxDQUFDLG1CQUFtQix1QkFBdUIsS0FBSztBQUFBLFFBQzNEO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
