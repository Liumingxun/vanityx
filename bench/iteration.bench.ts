import { bench, run } from 'mitata'
import { CREATEX_FACTORY_ADDRESS } from '@/schema.ts'
import { searchVanityIterator } from '@/search.ts'

const bytecodeHash = '0x56b90c57ea3b6dfd7d0be3027c7508e333196786f9863ba6d87df6416fb8fa89' as const

// clk: ~1.88 GHz
// cpu: Intel(R) Core(TM) i5-9300H CPU @ 2.40GHz
// runtime: bun 1.3.9 (x64-linux)

// benchmark                   avg (min … max) p75 / p99    (min … top 1%)
// ------------------------------------------- -------------------------------
// iteration                     74.26 µs/iter  76.20 µs  ▄█
//                        (44.20 µs … 4.89 ms) 217.00 µs  ██▅
//                     (  0.00  b …   2.00 mb)   6.78 kb ▃███▇▅▄▃▂▂▁▂▁▁▁▁▁▁▁▁▁

bench('iteration', function* () {
  const generator = searchVanityIterator({
    chainId: 1,
    saltPrefixBytes: new Uint8Array(21).fill(1),
    crosschain: true,
    permissioned: true,
    from: CREATEX_FACTORY_ADDRESS,
    bytecodeHash,
  })

  yield () => generator.next()
})

await run()
