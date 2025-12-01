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
      // Clinic service endpoints
      '/clinics': {
        target: 'http://localhost:8082',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Clinic service proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Proxying request to clinic service:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Clinic service proxy response:', proxyRes.statusCode, req.url);
          });
        },
      },
      '/clinic_doctors': {
        target: 'http://localhost:8082',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Clinic-doctor service proxy error:', err);
          });
        },
      },
    },
  },
})
