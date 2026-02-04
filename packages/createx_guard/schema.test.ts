import type { Hex } from 'viem'
import { hexToBytes } from 'viem'
import { chai, expect, it } from 'vitest'
import { $ZodIssueCustom } from 'zod/v4/core'
import { ComputeGuardedSaltInputSchema, SaltSchema } from './schema'

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

it('validates salt against protection requirements', () => {
  const permissionedDeployProtection = {
    permissionedDeploy: {
      msgSender: `0x${'01'.repeat(20)}`,
    },
  }

  const validSalt: Hex = `0x${'01'.repeat(20)}00${'00'.repeat(11)}`
  const { success, error } = ComputeGuardedSaltInputSchema.safeParse({
    salt: validSalt,
    protection: permissionedDeployProtection,
  })
  expect(success).toBe(true)
  expect(error).toBeUndefined()

  const invalidSaltSender: Hex = `0x${'02'.repeat(20)}00${'00'.repeat(11)}`
  const { success: invalidSenderSuccess, error: invalidSenderError } = ComputeGuardedSaltInputSchema.safeParse({
    salt: invalidSaltSender,
    protection: permissionedDeployProtection,
  })
  expect(invalidSenderSuccess).toBe(false)
  expect(invalidSenderError?.issues.map(issue => issue.message)).toMatchInlineSnapshot(`
    [
      "For permissioned deploy protection, salt sender bytes(first 20bytes) must match permissionedDeploy.msgSender",
    ]
  `)

  const invalidSaltWithWrongRedeployFlag: Hex = `0x${'01'.repeat(20)}cc${'00'.repeat(11)}`
  const { success: invalidRedeployFlagSuccess, error: invalidRedeployFlagError } = ComputeGuardedSaltInputSchema.safeParse({
    salt: invalidSaltWithWrongRedeployFlag,
    protection: permissionedDeployProtection,
  })
  expect(invalidRedeployFlagSuccess).toBe(false)
  expect(invalidRedeployFlagError?.issues.map(issue => issue.message)).toMatchInlineSnapshot(`
    [
      "For permissioned deploy protection, salt redeploy flag(21st byte) must be 0 or 1",
    ]
  `)

  const invalidSaltRedeployFlag: Hex = `0x${'01'.repeat(20)}02${'00'.repeat(11)}`
  const crossChainRedeployProtection = {
    crossChainRedeploy: {
      chainId: 1,
    },
  }
  const { success: invalidFlagSuccess, error: invalidFlagError } = ComputeGuardedSaltInputSchema.safeParse({
    salt: invalidSaltRedeployFlag,
    protection: crossChainRedeployProtection,
  })
  expect(invalidFlagSuccess).toBe(false)
  expect(invalidFlagError?.issues.map(issue => issue.message)).toMatchInlineSnapshot(`
    [
      "For cross-chain redeploy protection, salt redeploy flag(21st byte) must be set to 1",
    ]
  `)

  // Valid case with both protections
  const validSaltBoth: Hex = `0x${'01'.repeat(20)}01${'00'.repeat(11)}`
  const { success: validBothSuccess, error: validBothError } = ComputeGuardedSaltInputSchema.safeParse({
    salt: validSaltBoth,
    protection: {
      ...permissionedDeployProtection,
      ...crossChainRedeployProtection,
    },
  })
  expect(validBothSuccess).toBe(true)
  expect(validBothError).toBeUndefined()

  const invalidSaltBoth: Hex = `0x${'02'.repeat(20)}ab${'00'.repeat(11)}`
  const { success: invalidBothSuccess, error: invalidBothError } = ComputeGuardedSaltInputSchema.safeParse({
    salt: invalidSaltBoth,
    protection: {
      ...permissionedDeployProtection,
      ...crossChainRedeployProtection,
    },
  })
  expect(invalidBothSuccess).toBe(false)
  expect(invalidBothError?.issues.map(issue => issue.message)).toMatchInlineSnapshot(`
    [
      "For permissioned deploy protection, salt sender bytes(first 20bytes) must match permissionedDeploy.msgSender",
      "For cross-chain redeploy protection, salt redeploy flag(21st byte) must be set to 1",
    ]
  `)
  expect(invalidBothError?.issues.filter(i => i.code === 'custom').map(issue => (issue.params))).toMatchInlineSnapshot(`
    [
      {
        "expected": "0x0101010101010101010101010101010101010101",
        "position": [
          0,
          20,
        ],
        "received": "0x0202020202020202020202020202020202020202",
      },
      {
        "expected": "0x01",
        "position": [
          20,
          21,
        ],
        "received": "0xab",
      },
    ]
  `)
})

// 校验 正确的 senderBytes 但 redeployFlagByte 不合法的情况
it('validates salt with zero sender bytes and invalid redeploy flag', () => {
  const invalidSalt: Hex = `0x${'01'.repeat(20)}02${'00'.repeat(11)}`
  const permissionedDeployProtection = {
    permissionedDeploy: {
      msgSender: `0x${'01'.repeat(20)}`,
    },
  }
  const { success, error } = ComputeGuardedSaltInputSchema.safeParse({
    salt: invalidSalt,
    protection: permissionedDeployProtection,
  })
  expect(success).toBe(false)
  expect(error?.issues.map(issue => issue.message)).toMatchInlineSnapshot(`
    [
      "For permissioned deploy protection, salt redeploy flag(21st byte) must be 0 or 1",
    ]
  `)
})

it('validates salt with zero sender bytes', () => {
  const validSalt0: Hex = `0x${'00'.repeat(20)}00${'00'.repeat(11)}`
  const validSalt1: Hex = `0x${'00'.repeat(20)}01${'00'.repeat(11)}`
  const { success: success0, error: error0 } = ComputeGuardedSaltInputSchema.safeParse({
    salt: validSalt0,
  })
  const { success: success1, error: error1 } = ComputeGuardedSaltInputSchema.safeParse({
    salt: validSalt1,
  })
  expect(success0).toBe(true)
  expect(error0).toBeUndefined()
  expect(success1).toBe(true)
  expect(error1).toBeUndefined()

  const invalidSalt: Hex = `0x${'00'.repeat(20)}02${'00'.repeat(11)}`
  const { success: invalidSuccess, error: invalidError } = ComputeGuardedSaltInputSchema.safeParse({
    salt: invalidSalt,
  })
  expect(invalidSuccess).toBe(false)
  expect(invalidError?.issues.map(issue => issue.message)).toMatchInlineSnapshot(`
    [
      "If salt sender bytes(first 20bytes) are zero, salt redeploy flag(21st byte) must be 0 or 1",
    ]
  `)
  expect(invalidError?.issues.filter(i => i.code === 'custom').map(issue => (issue.params))).toMatchInlineSnapshot(`
    [
      {
        "expected": "0x00 or 0x01",
        "position": [
          20,
          21,
        ],
        "received": "0x02",
      },
    ]
  `)
})
