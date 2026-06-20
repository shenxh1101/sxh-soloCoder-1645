import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: './src/renderer',
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/renderer/src')
    }
  },
  server: {
    port: 5175,
    strictPort: true
  },
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true
  }
});
