import { CREATEX_FACTORY_ADDRESS } from '#schema'
import { createXIterator, standardIterator } from '#search'
import { bench, run, summary } from 'mitata'
import { ethAddress } from 'viem'

const bytecodeHash = '0x56b90c57ea3b6dfd7d0be3027c7508e333196786f9863ba6d87df6416fb8fa89' as const

summary(() => {
  bench('createx iteration x $concurrency', function* () {
    const generator = createXIterator({
      saltPrefixBytes: new Uint8Array(21).fill(0xEE).fill(1, 20),
      crosschain: { chainId: 1 },
      permissioned: { msgSender: ethAddress },
      from: CREATEX_FACTORY_ADDRESS,
      bytecodeHash,
    })

    yield () => generator.next()
  }).args('concurrency', [1, navigator.hardwareConcurrency])

  bench('standard iteration x $concurrency', function* () {
    const generator = standardIterator({
      from: '0x4e59b44847b379578588920ca78fbf26c0b4956c',
      bytecodeHash,
    })

    yield () => generator.next()
  }).args('concurrency', [1, navigator.hardwareConcurrency])
})

await run()
