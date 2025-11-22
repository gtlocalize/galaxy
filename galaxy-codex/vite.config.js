import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/galaxy/',
  server: {
    port: 5174,
    host: true,
    allowedHosts: ['vodbase.net', 'www.vodbase.net', 'localhost'],
    proxy: {
      '/galaxy-api': {
        target: 'http://localhost:3005',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
