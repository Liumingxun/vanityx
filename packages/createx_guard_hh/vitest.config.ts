import { defineConfig } from 'vitest/config'

export default defineConfig({
  root: 'tests',
  test: {
    include: ['**/*.test.ts'],
  },
})
