import { defineConfig, createLogger } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const customLogger = createLogger()
const loggerError = customLogger.error

// Intercept and suppress noisy ECONNABORTED errors from Vite's internal WS proxy handler
customLogger.error = (msg, options) => {
  if (msg.includes('ws proxy socket error') && msg.includes('ECONNABORTED')) {
    return
  }
  loggerError(msg, options)
}

// Backend host for the dev proxy — override via BACKEND_URL env var for LAN/remote dev.
// Example: BACKEND_URL=http://192.168.1.9:3001 vite --host
const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:3001'
const backendWsUrl = backendUrl.replace(/^http/, 'ws')

export default defineConfig({
  customLogger,
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: backendUrl, changeOrigin: true },
      '/ws': {
        target: backendWsUrl,
        ws: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err: any, _req, _res) => {
            if (err.code === 'ECONNABORTED') {
              console.warn('[vite proxy] WebSocket connection aborted gracefully.')
            } else {
              console.error('[vite proxy] error:', err.message)
            }
          })
        }
      },
    },
  },
})
