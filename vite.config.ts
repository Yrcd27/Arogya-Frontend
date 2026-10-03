import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const GATEWAY = 'http://localhost:8090'
const CHATBOT = 'http://localhost:8091'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Everything below is served by the microservices behind the API
      // Gateway (port 8090) — the gateway handles routing, JWT validation
      // and CORS, so the dev proxy just forwards to it unchanged.
      '/users': { target: GATEWAY, changeOrigin: true, secure: false },
      '/roles': { target: GATEWAY, changeOrigin: true, secure: false },
      '/patient_profile': { target: GATEWAY, changeOrigin: true, secure: false },
      '/doctor_profile': { target: GATEWAY, changeOrigin: true, secure: false },
      '/admin_profile': { target: GATEWAY, changeOrigin: true, secure: false },
      '/technician_profile': { target: GATEWAY, changeOrigin: true, secure: false },
      '/clinics': { target: GATEWAY, changeOrigin: true, secure: false },
      '/clinic_doctors': { target: GATEWAY, changeOrigin: true, secure: false },
      '/queue': { target: GATEWAY, changeOrigin: true, secure: false },
      '/consultations': { target: GATEWAY, changeOrigin: true, secure: false },
      '/lab-tests': { target: GATEWAY, changeOrigin: true, secure: false },
      '/test-results': { target: GATEWAY, changeOrigin: true, secure: false },
      // Chatbot service is separate and not behind the gateway.
      '/chat': { target: CHATBOT, changeOrigin: true, secure: false },
      '/health': { target: CHATBOT, changeOrigin: true, secure: false },
    },
  },
})
