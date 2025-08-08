import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // Set to true if you want source maps in production
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          vendor: ['vue', 'axios'],
        }
      }
    },
    // Optimize for Azure Static Web Apps
    assetsDir: 'assets',
    target: 'es2015'
  },
  base: '/', // Important for Azure Static Web Apps routing
  // Ensure proper handling of environment variables in production
  define: {
    __VUE_PROD_DEVTOOLS__: false,
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false
  }
})