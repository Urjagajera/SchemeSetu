import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  // Backend tests are plain Node/TS with no CSS involved, but Vite's
  // underlying postcss-load-config searches upward through parent
  // directories by default and picks up the FRONTEND's postcss.config.js
  // one level up (this is a monorepo, not a workspace). That config needs
  // @tailwindcss/postcss, which lives only in the frontend's node_modules —
  // fine on a machine where both package.json's deps happen to be installed,
  // but backend's own CI job installs only backend/node_modules on an
  // isolated runner, so the require() fails outright there. An inline empty
  // postcss config short-circuits the file search entirely.
  css: {
    postcss: {},
  },
});
