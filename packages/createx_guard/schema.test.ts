import type { Address, Hex } from 'viem'
import { ethAddress as ANY_ADDRESS, hexToBytes, zeroAddress as ZERO_ADDRESS } from 'viem'
import { describe, expect, it } from 'vitest'
import { ComputeGuardedSaltArgsSchema, SaltSchema } from './schema'

describe('salt schema', () => {
  describe('basic validation', () => {
    it('validates a 32-byte hex string salt', () => {
      expect(SaltSchema.safeParse(`0x${'00'.repeat(32)}`).success).toBe(true)
      expect(SaltSchema.safeParse(`0x${'00'.repeat(31)}`).success).toBe(false)
      expect(SaltSchema.safeParse(`0x${'00'.repeat(33)}`).success).toBe(false)

      const { success, data, error } = SaltSchema.safeParse(new Uint8Array(32))
      expect(success).toBe(true)
      expect(data?.raw).toBeInstanceOf(Uint8Array)
      expect(error).toBeUndefined()
    })

    it('rejects invalid salt types', () => {
      expect(SaltSchema.safeParse(123).success).toBe(false)
      expect(SaltSchema.safeParse('not-a-hex-string').success).toBe(false)
      expect(SaltSchema.safeParse(new Uint8Array(31)).success).toBe(false)
      expect(SaltSchema.safeParse(new Uint8Array(33)).success).toBe(false)
    })
  })

  describe('derived data', () => {
    it('extracts senderBytes and redeployFlagByte correctly', () => {
      const hexSalt: Hex = `0x${'01'.repeat(20)}02${'00'.repeat(11)}`
      const { success: successHex, data: dataHex } = SaltSchema.safeParse(hexSalt)
      expect(successHex).toBe(true)
      expect(dataHex?.senderBytes).toEqual(new Uint8Array(20).fill(1))
      expect(dataHex?.redeployFlagByte).toBe(2)

      const byteArraySalt = hexToBytes(hexSalt)
      const { success: successBytes, data: dataBytes } = SaltSchema.safeParse(byteArraySalt)
      expect(successBytes).toBe(true)
      expect(dataBytes?.senderBytes).toEqual(new Uint8Array(20).fill(1))
      expect(dataBytes?.redeployFlagByte).toBe(2)
    })
  })
})

// +-----------------+------+------+--------+
// | Sender \ XChain |  On  |  Off |   NA   |
// +-----------------+------+------+--------+
// |       Self      | pass | pass |        |
// +-----------------+------+------+ revert |
// |       Zero      | pass | pass |        |
// +-----------------+------+------+--------+
// |      Random     |         pass         |
// +-----------------+----------------------+

const SELF_ADDRESS: Address = '0x1111111111111111111111111111111111111111' as const
const SELF_XC_OFF_SALT: Hex = `${SELF_ADDRESS}00${'aa'.repeat(11)}`
const SELF_XC_ON_SALT: Hex = `${SELF_ADDRESS}01${'aa'.repeat(11)}`
const SELF_XC_NA_SALT: Hex = `${SELF_ADDRESS}ff${'aa'.repeat(11)}`

const ZERO_XC_OFF_SALT: Hex = `${ZERO_ADDRESS}00${'bb'.repeat(11)}`
const ZERO_XC_ON_SALT: Hex = `${ZERO_ADDRESS}01${'bb'.repeat(11)}`
const ZERO_XC_NA_SALT: Hex = `${ZERO_ADDRESS}ff${'bb'.repeat(11)}`

const ANY_XC_OFF_SALT: Hex = `${ANY_ADDRESS}00${'cc'.repeat(11)}`
const ANY_XC_ON_SALT: Hex = `${ANY_ADDRESS}01${'cc'.repeat(11)}`
const ANY_XC_NA_SALT: Hex = `${ANY_ADDRESS}ff${'cc'.repeat(11)}`

describe('compute guard salt schema', () => {
  it.for([
    // row 1: Self, On, Off
    { salt: SELF_XC_ON_SALT, msgSender: SELF_ADDRESS, chainId: 1 },
    { salt: SELF_XC_OFF_SALT, msgSender: SELF_ADDRESS, chainId: 1 },
    { salt: SELF_XC_OFF_SALT, msgSender: SELF_ADDRESS },
    // row 2: Zero, On, Off
    { salt: ZERO_XC_ON_SALT, msgSender: SELF_ADDRESS, chainId: 1 },
    { salt: ZERO_XC_OFF_SALT, msgSender: SELF_ADDRESS, chainId: 1 },
    { salt: ZERO_XC_OFF_SALT, msgSender: SELF_ADDRESS },
    // row 3: Random, On, Off, NA
    { salt: ANY_XC_ON_SALT, msgSender: SELF_ADDRESS, chainId: 1 },
    { salt: ANY_XC_ON_SALT, msgSender: SELF_ADDRESS },
    { salt: ANY_XC_OFF_SALT, msgSender: SELF_ADDRESS, chainId: 1 },
    { salt: ANY_XC_OFF_SALT, msgSender: SELF_ADDRESS },
    { salt: ANY_XC_NA_SALT, msgSender: SELF_ADDRESS, chainId: 1 },
    { salt: ANY_XC_NA_SALT, msgSender: SELF_ADDRESS },
  ])('%$: validates correct combinations of salt, msgSender and chainId', (input) => {
    const { success, error } = ComputeGuardedSaltArgsSchema.safeParse(input)

    expect(success).toBe(true)
    expect(error).toBeUndefined()
  })

  it.for([
    // row 1: Self, NA
    { salt: SELF_XC_NA_SALT, msgSender: SELF_ADDRESS, chainId: 1 },
    { salt: SELF_XC_NA_SALT, msgSender: SELF_ADDRESS },
    // row 2: Zero, NA
    { salt: ZERO_XC_NA_SALT, msgSender: SELF_ADDRESS, chainId: 1 },
    { salt: ZERO_XC_NA_SALT, msgSender: SELF_ADDRESS },
  ])('%$: rejects invalid combinations of salt, msgSender and chainId', (input) => {
    const { success, error } = ComputeGuardedSaltArgsSchema.safeParse(input)
    expect(success).toBe(false)
    expect(error?.issues.map(issue => issue.message)).toMatchInlineSnapshot(`
      [
        "When the first 20 bytes matches the caller address or is zero address, the cross-chain redeploy protection flag must be explicitly specified as either 0 or 1 at the 21st byte.",
      ]
    `)
  })

  it.for([
    // use zero address as msgSender
    { salt: ANY_XC_NA_SALT, msgSender: ZERO_ADDRESS, chainId: 1 },
    { salt: ANY_XC_NA_SALT, msgSender: ZERO_ADDRESS },
  ])('%$: rejects zero address as msgSender', (input) => {
    const { success, error } = ComputeGuardedSaltArgsSchema.safeParse(input)
    expect(success).toBe(false)
    expect(error?.issues.map(issue => issue.message)).toMatchInlineSnapshot(`
      [
        "Address cannot be the zero address",
      ]
    `)
  })

  it.for([
    // without chainId when redeployFlagByte is 1
    { salt: SELF_XC_ON_SALT, msgSender: SELF_ADDRESS },
    { salt: ZERO_XC_ON_SALT, msgSender: SELF_ADDRESS },
  ])('%$: rejects enable xchain protection without chainId', (input) => {
    const { success, error } = ComputeGuardedSaltArgsSchema.safeParse(input)
    expect(success).toBe(false)
    expect(error?.issues.map(issue => issue.message)).toMatchInlineSnapshot(`
      [
        "When set redeploy protection flag, chainId must be provided",
      ]
    `)
  })
})
