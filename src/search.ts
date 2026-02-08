import type { Address, Hex } from 'viem'
import { CREATEX_FACTORY_ADDRESS, SearchVanityArgsSchema } from '#schema'
import { computeGuardedSalt } from 'createx_guard'
import { isMatch } from 'micromatch'
import { bytesToHex, getContractAddress } from 'viem'

interface SearchVanityBaseInput {
  pattern: Hex
  deployer: Address
  msgSender: Address
  chainId?: number | undefined
  createxOpts?: {
    crosschain?: boolean | undefined
    permissioned?: boolean | undefined
  } | undefined
}

export type SearchVanityInput = SearchVanityBaseInput & ({
  initcode?: Hex
} | {
  initcodeHash?: Hex
})

export interface SearchVanityResult {
  salt: Hex
  address: Address
  guardedSalt?: Hex
}

function searchVanity(input: SearchVanityInput): SearchVanityResult {
  const { deployer: from, initcodeHash: bytecodeHash, msgSender, pattern, saltPrefixBytes, chainId } = SearchVanityArgsSchema.parse(input)

  const saltBytes = new Uint8Array(32)
  saltBytes.set(saltPrefixBytes)
  const prefilledLength = saltPrefixBytes.length

  const isCreateX = from === CREATEX_FACTORY_ADDRESS

  while (true) {
    crypto.getRandomValues(saltBytes.subarray(prefilledLength))
    const rawSalt = bytesToHex(saltBytes)
    const salt = isCreateX
      ? computeGuardedSalt({
          salt: rawSalt,
          msgSender,
          crosschain: !!input.createxOpts?.crosschain,
          permissioned: !!input.createxOpts?.permissioned,
          chainId,
        })
      : rawSalt

    const address = getContractAddress({
      opcode: 'CREATE2',
      salt,
      bytecodeHash,
      from,
    })
    if (isMatch(address, pattern)) {
      if (isCreateX) {
        return {
          salt: rawSalt,
          guardedSalt: salt,
          address,
        }
      }
      return {
        salt,
        address,
      }
    }
  }
}

export {
  searchVanity,
}
