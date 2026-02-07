import hardhatToolboxViemPlugin from '@nomicfoundation/hardhat-toolbox-viem'
import { defineConfig } from 'hardhat/config'

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin],
  paths: {
    tests: './tests',
  },
  solidity: {
    profiles: {
      default: {
        version: '0.8.33',
      },
      production: {
        version: '0.8.33',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: 'edr-simulated',
      chainType: 'l1',
    },
  },
})
