import type { Attempt, CreatexOpts, CrtxIterInput, Input, Options, Result, Stats, StdIterInput } from '#types'
import { CREATEX_FACTORY_ADDRESS, SearchVanityArgsSchema } from '#schema'
import { computeGuardedSalt } from '@vanityx/createx_guard'
import { Glob } from 'bun'
import { bytesToHex, getContractAddress } from 'viem'

/**
 * A generator function that yields attempts for CreateX deployments.
 * It continuously generates random salts (respecting any prefix), computes the guarded salt
 * required by CreateX's permissioned/crosschain logic, and derives the resulting contract address.
 *
 * @param {CrtxIterInput} input - The input parameters specific to CreateX iteration (deployer, bytecode hash, flags, salt prefix).
 * @yields An {@link Attempt} object containing the original salt, the guarded salt, and the computed address.
 */
function* createXIterator(input: CrtxIterInput): Generator<Attempt> {
  const { from, bytecodeHash, crosschain, permissioned, saltPrefixBytes } = input

  const saltBytes = new Uint8Array(32)
  saltBytes.set(saltPrefixBytes)
  const prefilledLength = saltPrefixBytes.length

  while (true) {
    crypto.getRandomValues(saltBytes.subarray(prefilledLength))
    const salt = bytesToHex(saltBytes)
    const guardedSalt = computeGuardedSalt({
      salt,
      permissioned,
      crosschain,
    }, 'bytes')

    const address = getContractAddress({
      opcode: 'CREATE2',
      salt: guardedSalt,
      bytecodeHash,
      from,
    })

    yield {
      salt,
      guardedSalt,
      address,
    }
  }
}

/**
 * A generator function that yields attempts for standard CREATE2 deployments.
 * It continuously generates random 32-byte salts and derives the resulting contract address.
 *
 * @param {StdIterInput} input - The input parameters for standard iteration (deployer, bytecode hash).
 * @yields An {@link Attempt} object containing the random salt and the computed address.
 */
function* standardIterator(input: StdIterInput): Generator<Attempt> {
  const { from, bytecodeHash } = input

  const salt = new Uint8Array(32)

  while (true) {
    crypto.getRandomValues(salt)

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

/**
 * Searches for a CREATE2 address matching the given pattern, starting from the specified deployer and initcode hash.
 * Supports both standard CREATE2 and CreateX deployments based on the input parameters.
 * The function performs sequential iteration and pattern matching using `Glob` for address pattern matching,
 * with optional progress callbacks to monitor the search process.
 *
 * @param {Input} input - The input parameters for the vanity search, including the desired address pattern, deployer address, initcode hash, and optional CreateX-specific parameters.
 * @param {Options} options - Optional configuration for the search process, such as a progress callback and interval.
 * @returns {Result | null} The result containing the matching salt and address if found, or null if the search was stopped via the progress callback.
 * @example
 * ```ts
 * const result = searchVanity({
 *   pattern: '0x1234*4321',
 *   deployer: '0xabcde...12345',
 *   initcodeHash: '0xcafe...feca',
 * })
 * console.log(result)
 * ```
 */
function searchVanity(input: Input, options?: Options): Result | null {
  const { deployer: from, initcodeHash: bytecodeHash, pattern, saltPrefixBytes, permissioned, crosschain }
    = SearchVanityArgsSchema.parse(input)
  const glob = new Glob(pattern)

  const { onProgress, progressInterval = 1000 } = options ?? {}

  const startTime = performance.now()
  let attempts = 0

  const isCreateX = from === CREATEX_FACTORY_ADDRESS
  const iterator = isCreateX
    ? createXIterator({ from, bytecodeHash, crosschain, permissioned, saltPrefixBytes })
    : standardIterator({ from, bytecodeHash })

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
        salt: typeof attempt.salt === 'string' ? attempt.salt : bytesToHex(attempt.salt),
        guardedSalt: attempt.guardedSalt ? bytesToHex(attempt.guardedSalt) : undefined,
        address: attempt.address,
      }
    }
  }
  return null // unreachable
}

export { createXIterator, searchVanity, standardIterator }
export type { Attempt, CreatexOpts, CrtxIterInput, Input, Options, Result, Stats, StdIterInput }
