import { defineConfig } from 'tsdown'

export default defineConfig([{
  entry: ['./bin/index.ts'],
  banner: '#!/usr/bin/env node\n',
}, {
  entry: ['./src/worker.ts'],
}])
