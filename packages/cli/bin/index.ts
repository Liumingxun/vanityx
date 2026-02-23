#!/usr/bin/env bun

import process from 'node:process'
import { Command } from '@cliffy/command'
import { CompletionsCommand } from '@cliffy/command/completions'
import { inspect } from 'bun'
import pkg from '../package.json' with { type: 'json' }

const program = new Command()

const patternExample = {
  '--pattern "0xcafe*"': 'Search for addresses starting with "0xcafe"',
  '--pattern "0x{AA,BB}*"': 'Search for addresses starting with "0xAA" or "0xBB"',
  '--pattern "0x*bee?"': 'Search for addresses ending with "bee" followed by one character',
} as const

program
  .name('vanityx')
  .description('Search vanity addresses using CREATE2')
  .version(pkg.version)
  .usage('search [options]')
  .action(() => {
    program.showHelp()
  })
  .example('basic usage', `vanityx search -i "$INITCODE_HASH" -s "$SENDER" -p '0xab*'`)

program
  .command('search', 'Search for vanity addresses')
  .example('pattern', `${inspect.table(patternExample)}\nFor more pattern syntax, see: https://bun.sh/docs/runtime/glob`)
  .option('-i, --initcode-hash <hash>', 'Init code hash', { required: true })
  .option('-s, --sender <address>', 'Message sender address', { required: true })
  .option('-p, --pattern <glob>', 'Glob pattern to match address', { required: true })
  .option('-d, --deployer [address]', 'Deployer address (CREATE2 factory)', { default: '0xba5ed099633d3b313e4d5f7bdc1305d3c28ba5ed', defaultText: 'CREATEX factory' })
  .option('-c, --chain-id [integer:integer]', 'EVM network chain ID')
  .option('-x, --crosschain', 'Enable crosschain mode for CREATEX factory', { default: false, depends: ['chain-id'] })
  .option('-y, --permissioned', 'Enable permissioned mode for CREATEX factory', { default: false })
  .option('-t, --threads [integer:integer]', 'Number of worker threads to use', { default: navigator.hardwareConcurrency || 1 })
  .action(async ({ initcodeHash, pattern, sender: msgSender, deployer, chainId, crosschain, permissioned, threads }) => {
    writeOut(`Searching with ${threads} workers...`)

    return new Promise<void>((resolve, reject) => {
      const workers: Worker[] = []
      const workerStats = new Map<number, { attempts: number, timeMs: number }>()
      let found = false

      const getAggregateStats = () => {
        let totalAttempts = 0
        let maxTime = 0

        for (const stat of workerStats.values()) {
          totalAttempts += stat.attempts
          maxTime = Math.max(maxTime, stat.timeMs)
        }

        const attemptsPerSec = maxTime > 0 ? (totalAttempts / maxTime) * 1000 : 0
        return { totalAttempts, maxTime, attemptsPerSec }
      }

      const cleanup = () => {
        for (const w of workers) {
          w.terminate()
        }
      }

      const handleWorkerError = (workerId: number, label: string, err: unknown) => {
        writeErr(`[Main] Worker ${workerId} ${label}: ${inspect(err)}`)
        cleanup()
        reject(new Error('Worker failure'))
      }

      process.on('SIGINT', () => {
        writeOut('\n\nStopping...\n')
        cleanup()
        process.exit(0)
      })

      for (let i = 0; i < Number(threads); i++) {
        const workerId = i
        const worker = new Worker(
          new URL('../src/worker.ts', import.meta.url),
          { type: 'module' },
        )
        worker.addEventListener('error', err => handleWorkerError(workerId, 'ERROR', err))
        worker.addEventListener('messageerror', err => handleWorkerError(workerId, 'MESSAGE ERROR', err))

        worker.addEventListener('message', (ev: MessageEvent) => {
          const { type, data } = ev.data

          if (type === 'progress') {
            workerStats.set(workerId, { attempts: data.attempts, timeMs: data.timeMs })
            const { totalAttempts, attemptsPerSec } = getAggregateStats()
            writeProgress(`Attempts: ${totalAttempts} | Speed: ${Math.floor(attemptsPerSec)}/s`)
          }
          else if (type === 'result' && !found) {
            found = true
            cleanup()
            const { maxTime } = getAggregateStats()

            writeOut(` | Time: ${(maxTime / 1000).toFixed(2)}s\n${inspect.table(data, { colors: true })}`)

            resolve()
          }
        })

        worker.postMessage({ type: 'search', data: { initcodeHash, pattern, msgSender, deployer, chainId, createxOpts: { crosschain, permissioned } } })
        workers.push(worker)
      }
    })
  })

program
  .command('completions', new CompletionsCommand())
  .alias('com')

await program
  .parse()

function writeOut(message: string) {
  process.stdout.write(`${message}\n`)
}

function writeProgress(message: string) {
  process.stdout.write(`\r\x1B[K${message}`)
}

function writeErr(message: string) {
  process.stderr.write(`${message}\n`)
}
