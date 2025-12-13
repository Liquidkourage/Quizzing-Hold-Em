import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@qhe/core': path.resolve(__dirname, '../../packages/core/src'),
      '@qhe/net': path.resolve(__dirname, '../../packages/net/src'),
      '@qhe/ui': path.resolve(__dirname, '../../packages/ui/src'),
    },
  },
  server: {
    // Use a non-conflicting port; server listens on 7777
    port: 7780,
    proxy: {
      '/api': {
        target: 'http://localhost:7777',
        changeOrigin: true,
      },
    },
  },
  base: '/player/',
})
