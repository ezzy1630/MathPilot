import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const root = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@config': path.resolve(root, '../../config'),
      '@config/app_settings.json': path.resolve(root, '../../config/app_settings.json'),
      '@config/sources.json': path.resolve(root, '../../config/sources.json'),
      '@mathpilot/learning-engine': path.resolve(root, '../../packages/learning-engine/src/index.ts'),
      '@mathpilot/math-engine': path.resolve(root, '../../packages/math-engine/src/index.ts'),
      '@mathpilot/ai-adapter': path.resolve(root, '../../packages/ai-adapter/src/index.ts'),
    },
  },
  server: {
    fs: { allow: [path.resolve(root, '../..')] },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('react') || id.includes('scheduler')) return 'react-vendor'
          if (id.includes('mathlive') || id.includes('@cortex-js')) return 'math-vendor'
          if (id.includes('recharts') || id.includes('d3-')) return 'chart-vendor'
          if (id.includes('@tauri-apps')) return 'tauri-vendor'
          return 'vendor'
        },
      },
    },
  },
})
