import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { StorybookConfig } from '@storybook/react-vite'

const root = path.dirname(fileURLToPath(import.meta.url))

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-essentials'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  viteFinal: async (config) => {
    config.resolve ??= {}
    config.resolve.alias = {
      ...config.resolve.alias,
      '@config': path.resolve(root, '../../../config'),
      '@config/app_settings.json': path.resolve(root, '../../../config/app_settings.json'),
      '@config/sources.json': path.resolve(root, '../../../config/sources.json'),
    }
    return config
  },
}

export default config
