import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy all API endpoints to the backend
      '/users': {
        target: 'http://localhost:8081',
        changeOrigin: true,
        secure: false,
      },
      '/roles': {
        target: 'http://localhost:8081',
        changeOrigin: true,
        secure: false,
      },
      '/patient_profile': {
        target: 'http://localhost:8081',
        changeOrigin: true,
        secure: false,
      },
      '/doctor_profile': {
        target: 'http://localhost:8081',
        changeOrigin: true,
        secure: false,
      },
      '/admin_profile': {
        target: 'http://localhost:8081',
        changeOrigin: true,
        secure: false,
      },
      '/technician_profile': {
        target: 'http://localhost:8081',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
