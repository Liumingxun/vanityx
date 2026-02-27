import type { Address, ByteArray, Hash, Hex } from 'viem'

export interface CreatexOpts {
  crosschain?: {
    chainId: number
  } | undefined
  permissioned?: {
    msgSender: Address
  } | undefined
}

interface BaseInput {
  pattern: Hex
  deployer: Address
  createxOpts?: CreatexOpts | undefined
}

export type Input = BaseInput & ({
  initcode: Hex
  initcodeHash?: never
} | {
  initcode?: never
  initcodeHash: Hash
})

export interface Stats {
  attempts: number
  timeMs: number
}

export interface Options {
  onProgress?: (stats: Stats) => boolean | void
  progressInterval?: number
}

export interface StdIterInput {
  from: Address
  bytecodeHash: Hash
}

export type CrtxIterInput = StdIterInput & CreatexOpts & {
  saltPrefixBytes: ByteArray
}

export interface Result {
  salt: Hex
  address: Address
  guardedSalt?: Hex | undefined
}

export interface Attempt {
  salt: ByteArray | Hex
  address: Address
  guardedSalt?: ByteArray | undefined
}
