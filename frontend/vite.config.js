// vite.config.js
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      // 仅保留 @ 别名，移除 path-browserify
      '@': path.resolve(__dirname, 'src'),
    }
  },
  server: {
    hmr: true
  }
});