import type { Hex } from 'viem'
import { hexToBytes } from 'viem'
import { describe, expect, it } from 'vitest'
import { ComputeGuardedSaltArgsSchema, SaltSchema } from './schema'

const ZERO_SENDER = '00'.repeat(20)
const MATCHING_SENDER = '01'.repeat(20)
const OTHER_SENDER = '02'.repeat(20)
const ANY_SENDER = 'ab'.repeat(20)
const SALT_SUFFIX = '00'.repeat(11)
const buildSalt = (senderHex: string, redeployFlagHex: string) => `0x${senderHex}${redeployFlagHex}${SALT_SUFFIX}`
function buildPermissionedProtection(senderHex = MATCHING_SENDER) {
  return {
    permissionedDeploy: {
      msgSender: `0x${senderHex}`,
    },
  }
}
const crossChainRedeployProtection = {
  crossChainRedeploy: {
    chainId: 1,
  },
}

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

describe('protection descriptor schema', () => {
  it('rejects empty protection objects', () => {
    const { success, error } = ComputeGuardedSaltArgsSchema.in.shape.protection.safeParse({
      crossChainRedeploy: {},
      permissionedDeploy: {},
    })
    expect(success).toBe(false)
    expect(error?.issues.map(issue => issue.message)).toMatchInlineSnapshot(`
      [
        "Address is required",
        "Chain ID must be a integer",
      ]
    `)
  })

  it('rejects only crossChainRedeploy protection without permissionedDeploy', () => {
    const { success, error } = ComputeGuardedSaltArgsSchema.in.shape.protection.safeParse({
      crossChainRedeploy: {
        chainId: 1,
      },
    })
    expect(success).toBe(false)
    expect(error?.issues.map(issue => issue.message)).toMatchInlineSnapshot(`
      [
        "If crossChainRedeploy protection is set, \`permissionedDeploy.msgSender\` must also be provided. (Tip: \`permissionedDeploy.msgSender\` can be zero address if needed)",
      ]
    `)
  })

  it('rejects permissionedDeploy without msgSender', () => {
    const { success, error } = ComputeGuardedSaltArgsSchema.in.shape.protection.safeParse({
      crossChainRedeploy: {
        chainId: 1,
      },
      permissionedDeploy: {},
    })
    expect(success).toBe(false)
    expect(error?.issues.map(issue => issue.message)).toMatchInlineSnapshot(`
      [
        "Address is required",
      ]
    `)
  })
})

describe('compute guarded salt input schema', () => {
  describe('no protections', () => {
    it('rejects non-zero redeploy flag when no protections are set', () => {
      const { success, error } = ComputeGuardedSaltArgsSchema.safeParse({
        salt: buildSalt(OTHER_SENDER, 'ab'),
      })
      expect(success).toBe(false)
      expect(error?.issues.map(issue => issue.message)).toMatchInlineSnapshot(`
        [
          "If cross-chain redeploy protection is not provided, salt redeploy flag(21st byte) must be set to 0",
        ]
      `)
    })

    it('rejects non-zero redeploy flag when cross-chain protection is absent', () => {
      const { success, error } = ComputeGuardedSaltArgsSchema.safeParse({
        salt: buildSalt(ANY_SENDER, '01'),
      })
      expect(success).toBe(false)
      expect(error?.issues.map(issue => issue.message)).toMatchInlineSnapshot(`
        [
          "If cross-chain redeploy protection is not provided, salt redeploy flag(21st byte) must be set to 0",
        ]
      `)
    })

    it('rejects non-zero redeploy flag when no protections are set (empty protection object)', () => {
      const { success, error } = ComputeGuardedSaltArgsSchema.safeParse({
        salt: buildSalt(OTHER_SENDER, 'ab'),
        protection: {},
      })
      expect(success).toBe(false)
      expect(error?.issues.map(issue => issue.message)).toMatchInlineSnapshot(`
        [
          "If cross-chain redeploy protection is not provided, salt redeploy flag(21st byte) must be set to 0",
        ]
      `)
    })
  })

  describe('permissioned deploy protection', () => {
    const protection = buildPermissionedProtection()

    it('accepts matching sender bytes when redeploy flag is zero', () => {
      const { success, error } = ComputeGuardedSaltArgsSchema.safeParse({
        salt: buildSalt(MATCHING_SENDER, '00'),
        protection,
      })
      expect(success).toBe(true)
      expect(error).toBeUndefined()
    })

    it('rejects mismatched sender bytes', () => {
      const { success, error } = ComputeGuardedSaltArgsSchema.safeParse({
        salt: buildSalt(OTHER_SENDER, '00'),
        protection,
      })
      expect(success).toBe(false)
      expect(error?.issues.map(issue => issue.message)).toMatchInlineSnapshot(`
        [
          "If permissioned deploy protection is enabled, salt sender bytes(first 20bytes) must match \`permissionedDeploy.msgSender\`",
        ]
      `)
    })

    it('rejects non-zero redeploy flag when cross-chain protection is absent', () => {
      const { success, error } = ComputeGuardedSaltArgsSchema.safeParse({
        salt: buildSalt(MATCHING_SENDER, 'cc'),
        protection,
      })
      expect(success).toBe(false)
      expect(error?.issues.map(issue => issue.message)).toMatchInlineSnapshot(`
        [
          "If cross-chain redeploy protection is not provided, salt redeploy flag(21st byte) must be set to 0",
        ]
      `)
    })
  })

  describe('combined protections', () => {
    const protection = {
      ...buildPermissionedProtection(),
      ...crossChainRedeployProtection,
    }

    it('accepts valid salt when both protections are configured', () => {
      const { success, error } = ComputeGuardedSaltArgsSchema.safeParse({
        salt: buildSalt(MATCHING_SENDER, '01'),
        protection,
      })
      expect(success).toBe(true)
      expect(error).toBeUndefined()
    })

    it('reports both sender and redeploy flag mismatches together', () => {
      const { success, error } = ComputeGuardedSaltArgsSchema.safeParse({
        salt: buildSalt(OTHER_SENDER, 'ab'),
        protection,
      })
      expect(success).toBe(false)
      expect(error?.issues.map(issue => issue.message)).toMatchInlineSnapshot(`
        [
          "If cross-chain redeploy protection is enabled, salt redeploy flag(21st byte) must be 1",
          "If permissioned deploy protection is enabled, salt sender bytes(first 20bytes) must match \`permissionedDeploy.msgSender\`",
        ]
      `)
      expect(error?.issues.filter(i => i.code === 'custom').map(issue => issue.params)).toMatchInlineSnapshot(`
        [
          {
            "expected": "0x01",
            "position": [
              20,
              21,
            ],
            "received": "0xab",
          },
          {
            "expected": "0x0101010101010101010101010101010101010101",
            "position": [
              0,
              20,
            ],
            "received": "0x0202020202020202020202020202020202020202",
          },
        ]
      `)
    })
  })

  describe('zero sender bytes', () => {
    it('accepts zero sender salt when redeploy flag is 0', () => {
      const { success, error } = ComputeGuardedSaltArgsSchema.safeParse({
        salt: buildSalt(ZERO_SENDER, '00'),
      })
      expect(success).toBe(true)
      expect(error).toBeUndefined()
    })

    it('rejects zero sender salt when redeploy flag is 1', () => {
      const { success, error } = ComputeGuardedSaltArgsSchema.safeParse({
        salt: buildSalt(ZERO_SENDER, '01'),
      })
      expect(success).toBe(false)
      expect(error?.issues.map(issue => issue.message)).toMatchInlineSnapshot(`
        [
          "If cross-chain redeploy protection is not provided, salt redeploy flag(21st byte) must be set to 0",
        ]
      `)
    })

    it('rejects zero sender salt with cross-chain protection when redeploy flag is not 1', () => {
      const { success, error } = ComputeGuardedSaltArgsSchema.safeParse({
        salt: buildSalt(ZERO_SENDER, '02'),
        protection: {
          ...buildPermissionedProtection(ZERO_SENDER),
          ...crossChainRedeployProtection,
        },
      })
      expect(success).toBe(false)
      expect(error?.issues.map(issue => issue.message)).toMatchInlineSnapshot(`
        [
          "If cross-chain redeploy protection is enabled, salt redeploy flag(21st byte) must be 1",
        ]
      `)
    })

    it('accepts zero sender salt with cross-chain protection when redeploy flag is 1', () => {
      const { success, error } = ComputeGuardedSaltArgsSchema.safeParse({
        salt: buildSalt(ZERO_SENDER, '01'),
        protection: {
          ...buildPermissionedProtection(ZERO_SENDER),
          ...crossChainRedeployProtection,
        },
      })
      expect(success).toBe(true)
      expect(error).toBeUndefined()
    })
  })
})
