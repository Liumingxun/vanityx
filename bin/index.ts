#!/usr/bin/env node

import type { Address, Hex } from 'viem'
import process from 'node:process'
import { Command } from 'commander'
import { getVanity } from '../src/index'

const program = new Command()

program
  .name('vanity2')
  .description('Generate vanity addresses using CREATE2')
  .version('1.0.0')

program
  .command('generate')
  .description('Generate a vanity address')
  .requiredOption('-i, --init-code-hash <hash>', 'Init code hash')
  .requiredOption('-m, --matching <regexp>', 'Regular expression to match address (e.g., ^0xdead or dead.*beef)')
  .option('-s, --sender <address>', 'Message sender address')
  .option('-d, --deployer <address>', 'Deployer address (CREATE2 factory, default: createx)', '0xba5ed099633d3b313e4d5f7bdc1305d3c28ba5ed')
  .option('-c, --case-sensitive', 'Enable case-sensitive matching (default: case-insensitive)', false)
  .action((options) => {
    const { deployer, sender, initCodeHash, matching, caseSensitive } = options

    let regex: RegExp
    try {
      regex = new RegExp(matching, caseSensitive ? '' : 'i')
    }
    catch {
      process.stderr.write(`Invalid regular expression: ${matching}\n`)
      process.exit(1)
    }

    const result = getVanity({
      deployer: deployer as Address,
      msgSender: sender as Address,
      initCodeHash: initCodeHash as Hex,
      matching: address => regex.test(address),
    })

    process.stdout.write('Result:\n')
    process.stdout.write(`Address: ${result.address}\n`)
    process.stdout.write(`Salt: ${result.salt}\n`)
    process.stdout.write(`Attempts: ${result.counter}\n`)
    process.stdout.write(`Time taken (ms): ${result.timeMs.toFixed(2)}\n`)
  })

program.parse()
