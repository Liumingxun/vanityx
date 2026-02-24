import { CREATEX_FACTORY_ADDRESS } from '#schema'
import { createXIterator, standardIterator } from '#search'
import { bench, run, summary } from 'mitata'

const bytecodeHash = '0x56b90c57ea3b6dfd7d0be3027c7508e333196786f9863ba6d87df6416fb8fa89' as const

summary(() => {
  bench('createx iteration x $concurrency', function* () {
    const generator = createXIterator({
      chainId: 1,
      saltPrefixBytes: new Uint8Array(21).fill(1),
      crosschain: true,
      permissioned: true,
      from: CREATEX_FACTORY_ADDRESS,
      bytecodeHash,
    })

    yield () => generator.next()
  }).args('concurrency', [1, navigator.hardwareConcurrency])

  bench('standard iteration x $concurrency', function* () {
    const generator = standardIterator({
      saltPrefixBytes: new Uint8Array(32),
      from: '0x4e59b44847b379578588920ca78fbf26c0b4956c',
      bytecodeHash,
      crosschain: false,
      permissioned: false,
    })

    yield () => generator.next()
  }).args('concurrency', [1, navigator.hardwareConcurrency])
})

await run()
