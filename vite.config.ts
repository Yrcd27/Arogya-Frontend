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
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('Clinic service proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('Proxying request to clinic service:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req) => {
            console.log('Clinic service proxy response:', proxyRes.statusCode, req.url);
          });
        },
      },
      '/clinic_doctors': {
        target: 'http://localhost:8082',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('Clinic-doctor service proxy error:', err);
          });
        },
      },
      // Queue service endpoints
      '/queue': {
        target: 'http://localhost:8085',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('Queue service proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('Proxying request to queue service:', req.method, req.url);
          });
        },
      },
      // Consultation service endpoints
      '/consultations': {
        target: 'http://localhost:8086',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('Consultation service proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('Proxying request to consultation service:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req) => {
            console.log('Consultation service proxy response:', proxyRes.statusCode, req.url);
          });
        },
      },
      // Lab tests endpoints (also part of consultation service)
      '/lab-tests': {
        target: 'http://localhost:8086',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('Lab tests service proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('Proxying request to lab tests:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req) => {
            console.log('Lab tests proxy response:', proxyRes.statusCode, req.url);
          });
        },
      },
      // Medical records / test-results endpoints (runs on :8087)
      '/test-results': {
        target: 'http://localhost:8087',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('Test-results service proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('Proxying request to test-results:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req) => {
            console.log('Test-results proxy response:', proxyRes.statusCode, req.url);
          });
        },
      },
    },
  },
})
