import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  plugins: [tailwindcss(), reactRouter()],
  resolve: {
    alias: { '~': path.resolve(__dirname, 'app') },
  },
  server: {
    port: 5173,
    proxy: {
      // Same-origin in development too, so the httpOnly refresh cookie works.
      '/api': { target: process.env.API_PROXY || 'http://localhost:5000', changeOrigin: false },
    },
  },
});
