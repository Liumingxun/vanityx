#!/usr/bin/env bun

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
  .requiredOption('-d, --deployer <address>', 'Deployer address (CREATE2 factory)')
  .requiredOption('-s, --sender <address>', 'Message sender address')
  .requiredOption('-i, --init-code-hash <hash>', 'Init code hash')
  .requiredOption('-m, --matching <regexp>', 'Regular expression to match address (e.g., ^0xdead or dead.*beef)')
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

    process.stdout.write(`Searching for address matching pattern: ${matching}\n`)
    process.stdout.write(`Case sensitive: ${caseSensitive}\n`)
    process.stdout.write(`Deployer: ${deployer}\n`)
    process.stdout.write(`Sender: ${sender}\n`)
    process.stdout.write(`Init Code Hash: ${initCodeHash}\n`)
    process.stdout.write('\n')

    const result = getVanity({
      deployer: deployer as Address,
      msgSender: sender as Address,
      initCodeHash: initCodeHash as Hex,
      matching: address => regex.test(address),
    })

    process.stdout.write('\nResult:\n')
    process.stdout.write(`Address: ${result.address}\n`)
    process.stdout.write(`Salt: ${result.salt}\n`)
  })

program.parse()
