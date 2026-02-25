import { computeGuardedSalt, getGuardedSalt } from 'createx_guard'
import { bench, run, summary } from 'mitata'
import { ethAddress } from 'viem'

summary(() => {
  bench('computeGuardedSalt', () => {
    computeGuardedSalt({
      salt: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee010000000000000000000000',
      permissioned: { msgSender: ethAddress },
      crosschain: { chainId: 1 },
    })
  })

  bench('getGuardedSalt', () => {
    getGuardedSalt({
      salt: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee010000000000000000000000',
      msgSender: ethAddress,
      chainId: 1,
    })
  })
})

await run({
  format: 'markdown',
})
