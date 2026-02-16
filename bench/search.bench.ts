import { CREATEX_FACTORY_ADDRESS } from '#schema'
import { searchVanity } from '#search'
import { bench, run } from 'mitata'
import { ethAddress } from 'viem'

const initcodeHash = '0x56b90c57ea3b6dfd7d0be3027c7508e333196786f9863ba6d87df6416fb8fa89' as const

bench('search', () => {
  searchVanity({
    deployer: CREATEX_FACTORY_ADDRESS,
    msgSender: ethAddress,
    pattern: '0xabcdef*',
    initcodeHash,
    createxOpts: {
      crosschain: true,
      permissioned: true,
    },
    chainId: 1,
  }, {
    onProgress: ({ attempts }) => {
      return attempts < 100_000
    },
  })
})

await run({
  format: 'markdown',
})
