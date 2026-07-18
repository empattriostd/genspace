import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// GENSPACE PLC — Vite config
// Path alias '@' -> 'src' keeps imports stable as the feature/module tree grows.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true, // exposes on LAN, useful for testing on a real phone during dev
  },
});
