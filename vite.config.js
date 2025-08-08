import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  // Base URL for GitHub Pages deployment
  // Update 'azure-pipeline-deployer' to match your repository name
  base: process.env.VITE_BASE_URL || '/',
  server: {
    port: 5173
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          vendor: ['vue', 'axios'],
        }
      }
    },
    assetsDir: 'assets',
    target: 'es2015'
  },
  // Ensure proper handling of environment variables in production
  define: {
    __VUE_PROD_DEVTOOLS__: false,
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false
  }
})