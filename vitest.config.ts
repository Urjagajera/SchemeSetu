import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));

// Kept apart from vite.config.ts on purpose: that file opens a browser and proxies /api for the dev server,
// neither of which a test run should do.
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(here, './src') } },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
    // Real timers and a clean slate for every test; tests that need fake timers ask for them.
    restoreMocks: true,
    unstubGlobals: true,
  },
});
