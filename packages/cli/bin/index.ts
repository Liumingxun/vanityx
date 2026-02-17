#!/usr/bin/env bun

import process from 'node:process'
import { Command } from '@cliffy/command'
import { CompletionsCommand } from '@cliffy/command/completions'
import { searchVanity } from 'vanityx'
import { SearchVanityArgsSchema } from 'vanityx/schema'
import pkg from '../package.json' with { type: 'json' }

const program = new Command()

program
  .name('vanityx')
  .description('Search vanity addresses using CREATE2')
  .version(pkg.version)
  .usage('search [options]')
  .action(() => {
    program.showHelp()
  })

program
  .command('search', 'Search for vanity addresses')
  .option('-i, --initcode-hash <hash>', 'Init code hash', {
    required: true,
  })
  .option('-p, --pattern <glob>', 'Glob pattern to match address (e.g., 0xcafe*AA??{CC,DD} or 0xdead*beef)', {
    required: true,
  })
  .option('-s, --sender <address>', 'Message sender address', {
    required: true,
  })
  .option('-d, --deployer [address]', 'Deployer address (CREATE2 factory)', {
    default: '0xba5ed099633d3b313e4d5f7bdc1305d3c28ba5ed',
  })
  .option('-c, --chain-id [integer:integer]', 'Chain ID for target address computation (e.g., 1 for Ethereum Mainnet)')
  .option('-x, --crosschain', 'Enable crosschain mode for CREATEX factory', {
    default: false,
    depends: ['chain-id'],
  })
  .option('-y, --permissioned', 'Enable permissioned mode for CREATEX factory', {
    default: false,
  })
  .action(async ({ initcodeHash, pattern, sender: msgSender, deployer, chainId, crosschain, permissioned }) => {
    const args = SearchVanityArgsSchema.parse({ initcodeHash, pattern, msgSender, deployer, chainId, createxOpts: { crosschain, permissioned } })
    console.log(args)
  })

program
  .command('completions', new CompletionsCommand())
  .alias('com')

await program
  .parse()
