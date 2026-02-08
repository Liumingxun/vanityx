import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./bin/index.ts'],
  inlineOnly: false,
})
