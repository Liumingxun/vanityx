import type { ArgumentValue } from '@cliffy/command'
import type { Address, Hash, Hex } from 'viem'
import { AddressSchema, HashSchema, HexPatternSchema } from '@vanityx/core/schema'

export function hashType({ value }: ArgumentValue): Hash {
  const result = HashSchema.safeParse(value)
  if (!result.success) {
    throw result.error
  }
  return result.data
}

export function patternType({ value }: ArgumentValue): Hex {
  const result = HexPatternSchema.safeParse(value)
  if (!result.success) {
    throw result.error
  }
  return result.data
}

export function addressType({ value }: ArgumentValue): Address {
  const result = AddressSchema.safeParse(value)
  if (!result.success) {
    throw result.error
  }
  return result.data
}
