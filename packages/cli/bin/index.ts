#!/usr/bin/env bun

import type { CreatexOpts } from '@vanityx/core'
import process from 'node:process'
import { addressType, hashType, patternType } from '#cli.type'
import { searchWithWorkers } from '#manager'
import { Command } from '@cliffy/command'
import { CompletionsCommand } from '@cliffy/command/completions'
import { inspect } from 'bun'
import pkg from '../package.json' with { type: 'json' }

const program: Command = new Command()

const patternExample = {
  '--pattern "0xcafe*"': 'Search for addresses starting with "0xcafe"',
  '--pattern "0x{AA,BB}*"': 'Search for addresses starting with "0xAA" or "0xBB"',
  '--pattern "0x*bee?"': 'Search for addresses ending with "bee" followed by one character',
} as const

program
  .name('vanityx')
  .description('Search vanity addresses for Ethereum CREATE2 using multiple threads')
  .version(pkg.version)
  .usage('search [options]')
  .action(() => {
    program.showHelp()
  })
  .example('basic usage', `vanityx search -i "$INITCODE_HASH" -p "$PATTERN"`)
  .example('other deployer', `vanityx search -i "$INITCODE_HASH" -p "$PATTERN" -d "0xYourFactoryAddress"`)

program
  .command('search', 'Search for vanity addresses')
  .type('hash', hashType)
  .type('pattern', patternType)
  .type('address', addressType)
  .example('pattern', `${inspect.table(patternExample)}\nFor more pattern syntax, see: https://bun.sh/docs/runtime/glob`)
  .option('-i, --initcode-hash <hash:hash>', 'Init code hash', { required: true })
  .option('-p, --pattern <glob:pattern>', 'Glob pattern to match address', { required: true })
  .option('-d, --deployer [address:address]', 'Deployer address (CREATE2 factory)', { default: '0xba5ed099633d3b313e4d5f7bdc1305d3c28ba5ed', defaultText: 'CREATEX factory', value: (v) => { return v as `0x${string}` } })
  .option('-x, --crosschain', 'Enable crosschain mode for CREATEX factory', { default: false, depends: ['chain-id'] })
  .option('-c, --chain-id [integer:integer]', 'EVM network chain ID', { value: v => Number(v) })
  .option('-y, --permissioned', 'Enable permissioned mode for CREATEX factory', { default: false, depends: ['sender'] })
  .option('-s, --sender [address:address]', 'Message sender address', { value: (v) => { return v as `0x${string}` } })
  .option('-t, --threads [integer:integer]', 'Number of worker threads to use', { default: navigator.hardwareConcurrency || 1 })
  .action(async ({ initcodeHash, pattern, deployer, crosschain, chainId, permissioned, sender: msgSender, threads }) => {
    writeOut(`Searching with ${threads} workers...`)

    const startTime = performance.now()

    process.on('SIGINT', () => {
      writeOut('\n\nStopping...\n')
      process.exit(0)
    })

    const createxOpts: CreatexOpts = {
      ...(permissioned && { permissioned: { msgSender: msgSender as `0x${string}` } }),
      ...(crosschain && { crosschain: { chainId: Number(chainId) } }),
    }

    try {
      const result = await searchWithWorkers({
        initcodeHash,
        pattern,
        deployer,
        createxOpts,
      }, {
        threads: Number(threads),
        onProgress: (stats) => {
          writeProgress(`Attempts: ${stats.totalAttempts} | Speed: ${Math.floor(stats.attemptsPerSec)}/s`)
        },
      })

      const timeMs = performance.now() - startTime
      writeOut(` | Time: ${(timeMs / 1000).toFixed(2)}s\n${inspect.table(result)}`)
    }
    catch (error) {
      writeErr(`\nSearch failed: ${(error as Error).message}`)
      process.exit(1)
    }
  })

program
  .command('completions', new CompletionsCommand())
  .alias('com')

program.parse()

function writeOut(message: string): void {
  process.stdout.write(`${message}\n`)
}

function writeProgress(message: string): void {
  process.stdout.write(`\r\x1B[K${message}`)
}

function writeErr(message: string): void {
  process.stderr.write(`${message}\n`)
}
