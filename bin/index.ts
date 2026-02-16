#!/usr/bin/env node

import type { Address, Hex } from 'viem'
import process from 'node:process'
import { Command } from 'commander'
import { searchVanity } from '@/search.ts'

const program = new Command()

program
  .name('vanityx')
  .description('Generate vanity addresses using CREATE2')
  .version('1.0.0')

program
  .command('generate')
  .description('Generate a vanity address')
  .requiredOption('-i, --init-code-hash <hash>', 'Init code hash')
  .requiredOption('-p, --pattern <glob>', 'Glob pattern to match address (e.g., 0xcafe*A0{A0,B0} or 0xdead*beef)')
  .requiredOption('-s, --sender <address>', 'Message sender address')
  .option('-c, --chain-id <integer>', 'Chain ID for target address computation (e.g., 1 for Ethereum Mainnet)')
  .option('-d, --deployer <address>', 'Deployer address (CREATE2 factory, default: createx)', '0xba5ed099633d3b313e4d5f7bdc1305d3c28ba5ed')
  .action((options) => {
    const { deployer, sender, initCodeHash, pattern, chainId } = options

    const result = searchVanity({
      deployer: deployer as Address,
      msgSender: sender as Address,
      initcodeHash: initCodeHash as Hex,
      pattern: pattern as Hex,
      chainId: chainId ? Number(chainId) : undefined,
    })

    process.stdout.write('Result:\n')
    process.stdout.write(`Salt: ${result.salt}\n`)
    process.stdout.write(`Attempts: ${result.guardedSalt}\n`)
    process.stdout.write(`Address: ${result.address}\n`)
  })

program.parse()
