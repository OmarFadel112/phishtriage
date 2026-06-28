import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' makes all asset paths relative so the app works correctly
// when deployed to GitHub Pages at https://username.github.io/repo-name/
// Without this, the browser looks for assets at the root '/' and gets 404s.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: 'dist',
  },
});
