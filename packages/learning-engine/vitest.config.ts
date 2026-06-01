import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const root = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      '@config': path.resolve(root, '../../config'),
      '@config/app_settings.json': path.resolve(root, '../../config/app_settings.json'),
      '@config/sources.json': path.resolve(root, '../../config/sources.json'),
    },
  },
})
