import type { Address, ByteArray, Hash, Hex } from 'viem'
import { CREATEX_FACTORY_ADDRESS, SearchVanityArgsSchema } from '#schema'
import { computeGuardedSalt } from 'createx_guard'
import mm from 'micromatch'
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
  attemptsPerSec: number
}

type ProgressCallback = (stats: SearchVanityStats) => boolean | void

interface SearchVanityOptions {
  onProgress?: ProgressCallback
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
  attempts: number
  timeMs: number
}

function* searchVanityIterator(input: SearchVanityIteratorInput): Generator<SearchVanityAttempt> {
  const { from, bytecodeHash, crosschain, permissioned, chainId, saltPrefixBytes } = input

  const saltBytes = new Uint8Array(32)
  saltBytes.set(saltPrefixBytes)
  const prefilledLength = saltPrefixBytes.length

  const isCreateX = from === CREATEX_FACTORY_ADDRESS
  let attempts = 0
  const startTime = performance.now()

  while (true) {
    attempts++
    crypto.getRandomValues(saltBytes.subarray(prefilledLength))
    const rawSalt = bytesToHex(saltBytes)
    const salt = isCreateX
      ? computeGuardedSalt({
          salt: rawSalt,
          crosschain,
          permissioned,
          chainId,
        })
      : rawSalt

    const address = getContractAddress({
      opcode: 'CREATE2',
      salt,
      bytecodeHash,
      from,
    })

    yield {
      salt: isCreateX ? rawSalt : salt,
      guardedSalt: isCreateX ? salt : undefined,
      address,
      attempts,
      timeMs: performance.now() - startTime,
    }
  }
}

function searchVanity(input: SearchVanityInput, options?: SearchVanityOptions): SearchVanityResult | null {
  const { deployer: from, initcodeHash: bytecodeHash, pattern, saltPrefixBytes, permissioned, crosschain, chainId }
    = SearchVanityArgsSchema.parse(input)

  const { onProgress, progressInterval = 1000 } = options ?? {}

  for (const attempt of searchVanityIterator({ from, bytecodeHash, crosschain, permissioned, chainId, saltPrefixBytes })) {
    if (onProgress && attempt.attempts % progressInterval === 0) {
      const shouldContinue = onProgress({
        attempts: attempt.attempts,
        timeMs: attempt.timeMs,
        attemptsPerSec: (attempt.attempts / attempt.timeMs) * 1000,
      })
      if (shouldContinue === false) {
        return null
      }
    }

    if (mm.isMatch(attempt.address, pattern)) {
      if (onProgress) {
        onProgress({
          attempts: attempt.attempts,
          timeMs: attempt.timeMs,
          attemptsPerSec: (attempt.attempts / attempt.timeMs) * 1000,
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

export { searchVanity, searchVanityIterator }
export type { SearchVanityAttempt, SearchVanityInput, SearchVanityIteratorInput, SearchVanityOptions, SearchVanityResult, SearchVanityStats }
