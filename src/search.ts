import type { Attempt, CreatexOpts, CrtxIterInput, Input, Options, Result, Stats, StdIterInput } from '#types'
import { CREATEX_FACTORY_ADDRESS, SearchVanityArgsSchema } from '#schema'
import { Glob } from 'bun'
import { computeGuardedSalt } from 'createx_guard'
import { bytesToHex, getContractAddress } from 'viem'

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
