import type { Address, ByteArray, Hash, Hex } from 'viem'
import { CREATEX_FACTORY_ADDRESS, SearchVanityArgsSchema } from '#schema'
import { Glob } from 'bun'
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

type SearchVanityInput = SearchVanityBaseInput & ({
  initcode: Hex
  initcodeHash?: never
} | {
  initcode?: never
  initcodeHash: Hash
})

interface SearchVanityStats {
  attempts: number
  timeMs: number
}

interface SearchVanityOptions {
  onProgress?: (stats: SearchVanityStats) => boolean | void
  progressInterval?: number
}

interface SearchVanityResult {
  salt: Hex
  address: Address
  guardedSalt?: Hex | undefined
}

interface SearchVanityIteratorInput {
  from: Hex
  bytecodeHash: Hash
  crosschain: boolean
  permissioned: boolean
  chainId?: number | undefined
  saltPrefixBytes: ByteArray
}

interface SearchVanityAttempt {
  salt: Hex
  guardedSalt?: Hex | undefined
  address: Address
}

function* createXIterator(input: SearchVanityIteratorInput): Generator<SearchVanityAttempt> {
  const { from, bytecodeHash, crosschain, permissioned, chainId, saltPrefixBytes } = input

  const saltBytes = new Uint8Array(32)
  saltBytes.set(saltPrefixBytes)
  const prefilledLength = saltPrefixBytes.length

  while (true) {
    crypto.getRandomValues(saltBytes.subarray(prefilledLength))
    const rawSalt = bytesToHex(saltBytes)
    const guardedSalt = computeGuardedSalt({
      salt: rawSalt,
      crosschain,
      permissioned,
      chainId,
    })

    const address = getContractAddress({
      opcode: 'CREATE2',
      salt: guardedSalt,
      bytecodeHash,
      from,
    })

    yield {
      salt: rawSalt,
      guardedSalt,
      address,
    }
  }
}

function* standardIterator(input: SearchVanityIteratorInput): Generator<SearchVanityAttempt> {
  const { from, bytecodeHash, saltPrefixBytes } = input

  const saltBytes = new Uint8Array(32)
  saltBytes.set(saltPrefixBytes)
  const prefilledLength = saltPrefixBytes.length

  while (true) {
    crypto.getRandomValues(saltBytes.subarray(prefilledLength))
    const salt = bytesToHex(saltBytes)

    const address = getContractAddress({
      opcode: 'CREATE2',
      salt,
      bytecodeHash,
      from,
    })

    yield {
      salt,
      address,
    }
  }
}

function searchVanity(input: SearchVanityInput, options?: SearchVanityOptions): SearchVanityResult | null {
  const { deployer: from, initcodeHash: bytecodeHash, pattern, saltPrefixBytes, permissioned, crosschain, chainId }
    = SearchVanityArgsSchema.parse(input)
  const glob = new Glob(pattern)

  const { onProgress, progressInterval = 1000 } = options ?? {}

  const startTime = performance.now()
  let attempts = 0

  const isCreateX = from === CREATEX_FACTORY_ADDRESS
  const iterator = isCreateX
    ? createXIterator({ from, bytecodeHash, crosschain, permissioned, chainId, saltPrefixBytes })
    : standardIterator({ from, bytecodeHash, crosschain, permissioned, chainId, saltPrefixBytes })

  for (const attempt of iterator) {
    attempts++
    if (onProgress && attempts % progressInterval === 0) {
      const timeMs = performance.now() - startTime
      const shouldContinue = onProgress({
        attempts,
        timeMs,
      })
      if (shouldContinue === false) {
        return null
      }
    }

    if (glob.match(attempt.address)) {
      if (onProgress) {
        const timeMs = performance.now() - startTime
        onProgress({
          attempts,
          timeMs,
        })
      }
      return {
        salt: attempt.salt,
        guardedSalt: attempt.guardedSalt,
        address: attempt.address,
      }
    }
  }
  return null // unreachable
}

export { createXIterator, searchVanity, standardIterator }
export type { SearchVanityAttempt, SearchVanityInput, SearchVanityIteratorInput, SearchVanityOptions, SearchVanityResult, SearchVanityStats }
