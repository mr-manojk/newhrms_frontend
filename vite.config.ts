import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: './', // Ensure root is the current directory
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'index.html'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://node-mysql-api-lhbg.onrender.com',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'https://node-mysql-api-lhbg.onrender.com',
        changeOrigin: true,
      }
    }
  }
});