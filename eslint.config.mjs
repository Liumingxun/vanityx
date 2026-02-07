import antfu from '@antfu/eslint-config'

export default antfu({
  formatters: true,
  typescript: true,
  pnpm: {
    catalogs: true,
  },
}, {
  ignores: [
    '**/types/**',
  ],
  rules: {
    'pnpm/yaml-enforce-settings': 'off',
  },
})
