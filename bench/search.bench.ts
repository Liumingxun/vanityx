import { bench, run } from 'mitata'
import { ethAddress } from 'viem'
import { CREATEX_FACTORY_ADDRESS, SearchVanityArgsSchema } from '@/schema.ts'
import { searchVanity } from '@/search.ts'

const initcodeHash = '0x56b90c57ea3b6dfd7d0be3027c7508e333196786f9863ba6d87df6416fb8fa89' as const

// | benchmark    |              avg |         min |         p75 |         p99 |         max |
// | ------------ | ---------------- | ----------- | ----------- | ----------- | ----------- |
// | schema parse | `  8.71 µs/iter` | `  4.10 µs` | `  8.10 µs` | ` 49.30 µs` | `  4.34 ms` |
bench('schema parse', () => {
  SearchVanityArgsSchema.parse({
    deployer: CREATEX_FACTORY_ADDRESS,
    msgSender: ethAddress,
    pattern: '0xabcdef*',
    initcodeHash,
    createxOpts: {
      crosschain: true,
      permissioned: true,
    },
    chainId: 1,
  })
})

// | benchmark | avg              | min         | p75         | p99         | max         |
// | --------- | ---------------- | ----------- | ----------- | ----------- | ----------- |
// | search    | `   7.51 s/iter` | `   7.26 s` | `   7.58 s` | `   7.61 s` | `   8.23 s` |
//
// 7510 / 100000 = 0.0751ms
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
