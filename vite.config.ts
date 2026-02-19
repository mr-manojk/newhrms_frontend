import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  define: {
    // This ensures 'process.env' is available as a global object in the browser
    'process.env': {
      API_KEY: JSON.stringify(process.env.API_KEY || '')
    },
    // Polyfill for libraries that expect 'global'
    'global': 'window',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  server: {
    port: 3000,
    open: true,
    proxy: {
      // Proxy API requests to the local backend during development
      '/api': {
        target: 'https://node-mysql-api-lhbg.onrender.com',
        changeOrigin: true,
        secure: false,
      },
      // Proxy uploads to the local backend during development
      '/uploads': {
        target: 'https://node-mysql-api-lhbg.onrender.com',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn']
      },
      mangle: true,
    },
  }
});