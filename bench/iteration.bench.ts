import { CREATEX_FACTORY_ADDRESS } from '#schema'
import { searchVanityIterator } from '#search'
import { bench, run } from 'mitata'

const bytecodeHash = '0x56b90c57ea3b6dfd7d0be3027c7508e333196786f9863ba6d87df6416fb8fa89' as const

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
