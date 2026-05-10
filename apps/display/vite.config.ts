import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

/** First 7 chars of CI git SHA (Railway / Vercel) — baked at build time for “which bundle is this?” checks. */
const displayBuildId =
  (process.env.RAILWAY_GIT_COMMIT_SHA ||
    process.env.RAILWAY_GIT_COMMIT ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    '')
    .toString()
    .slice(0, 7) || 'local'

export default defineConfig({
  define: {
    __DISPLAY_BUILD_ID__: JSON.stringify(displayBuildId),
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@qhe/core': path.resolve(__dirname, '../../packages/core/src'),
      '@qhe/net': path.resolve(__dirname, '../../packages/net/src'),
      '@qhe/ui': path.resolve(__dirname, '../../packages/ui/src'),
    },
  },
  server: {
    port: 7777,
    proxy: {
      '/api': {
        target: 'http://localhost:7777',
        changeOrigin: true,
      },
    },
  },
  base: '/display/',
})
