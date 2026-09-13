import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  /**
   * Relative base so the built `assets/` URLs resolve no matter where the app is
   * hosted: a custom domain root (`https://example.com/`), a GitHub Pages project
   * subdirectory (`https://user.github.io/MultiView/`), or even a local `file://`
   * preview. Combined with the HashRouter this means GitHub Pages never needs a
   * server-side rewrite and refreshing `/#/watch` cannot 404.
   */
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  server: {
    port: 5173,
    open: false,
  },
});
