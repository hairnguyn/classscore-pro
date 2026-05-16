import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',

  plugins: [react()],

  optimizeDeps: {
    include: [
      '@material/web',
      '@m3e/web',
      '@tylertech/forge',
      '@maicol07/material-web-additions'
    ]
  },

  build: {
    target: 'esnext',
    assetsInlineLimit: 0,
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
})
