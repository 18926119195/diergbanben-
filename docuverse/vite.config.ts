import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load parent workspace .env as well as local
  const rootEnv = loadEnv(mode, path.resolve(__dirname, '..'), '')
  const localEnv = loadEnv(mode, __dirname, '')
  const apiKey =
    localEnv.ZHIPU_API_KEY ||
    rootEnv.ZHIPU_API_KEY ||
    process.env.ZHIPU_API_KEY ||
    ''

  return {
    plugins: [react()],
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
      proxy: {
        '/api/zhipu': {
          target: 'https://open.bigmodel.cn',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/zhipu/, '/api/paas/v4'),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq, req) => {
              const existing = req.headers.authorization
              if (typeof existing === 'string' && existing.length > 0) {
                proxyReq.setHeader('Authorization', existing)
              } else if (apiKey) {
                proxyReq.setHeader('Authorization', `Bearer ${apiKey}`)
              }
            })
          },
        },
      },
    },
  }
})
