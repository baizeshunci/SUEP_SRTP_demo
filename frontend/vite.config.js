// vite.config.js
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import { viteMockServe } from 'vite-plugin-mock'

export default defineConfig({
  plugins: [vue(),
  viteMockServe({
    mockPath: './src/mock', 
    localEnabled: true, 
    logger: true 
  })],
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