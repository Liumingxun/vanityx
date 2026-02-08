import type { Address, Hex } from 'viem'
import { AddressMatchSchema, CREATEX_FACTORY_ADDRESS, SearchVanityArgsSchema } from '#schema'
import { computeGuardedSalt } from 'createx_guard'
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
}

function searchVanity(input: SearchVanityInput): SearchVanityResult {
  const { deployer: from, initcodeHash: bytecodeHash, msgSender, pattern, saltPrefixBytes, chainId } = SearchVanityArgsSchema.parse(input)

  const saltBytes = new Uint8Array(32)
  saltBytes.set(saltPrefixBytes)
  const prefilledLength = saltPrefixBytes.length

  const isCreateX = from === CREATEX_FACTORY_ADDRESS
  const addressPattern = AddressMatchSchema(pattern)

  while (true) {
    crypto.getRandomValues(saltBytes.subarray(prefilledLength))
    const salt = isCreateX
      ? computeGuardedSalt({
          salt: saltBytes,
          msgSender,
          chainId,
        })
      : saltBytes

    const address = getContractAddress({
      opcode: 'CREATE2',
      salt,
      bytecodeHash,
      from,
    })
    const { success } = addressPattern.safeEncode(address)
    if (success) {
      return {
        salt: bytesToHex(saltBytes),
      }
    }
  }
}

export {
  searchVanity,
}
