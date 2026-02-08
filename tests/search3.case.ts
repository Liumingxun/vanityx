import { ethAddress } from 'viem'
import { CREATEX_FACTORY_ADDRESS } from '../src/schema'
import { searchVanity } from '../src/search'

const initcodeHash = '0x56b90c57ea3b6dfd7d0be3027c7508e333196786f9863ba6d87df6416fb8fa89'

const vanity = searchVanity({
  deployer: CREATEX_FACTORY_ADDRESS,
  msgSender: ethAddress,
  chainId: 1,
  createxOpts: {
    crosschain: true,
    permissioned: true,
  },
  initcodeHash,
  pattern: '0xaf*fa',
})
// eslint-disable-next-line no-console
console.table(vanity)
