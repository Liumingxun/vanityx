#!/usr/bin/env bun

import { arch, platform } from 'node:process'
import { $, fileURLToPath } from 'bun'

const ext = platform === 'win32' ? '.exe' : ''
const outfile = fileURLToPath(import.meta.resolve(`../../dist/vanityx_${platform}_${arch}${ext}`, import.meta.dirname))

await $`bun build --compile --bytecode --minify bin/index.ts src/worker.ts --outfile=${outfile}`
