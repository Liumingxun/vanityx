import { bytesToHex, hexToBytes, isAddress, isBytes, isHex, numberToHex, zeroAddress } from 'viem'
import { z } from 'zod'

const AddressSchema = z.string()
  .refine(v => isAddress(v), 'Invalid address format')

// TODO: Refactor to use zod discriminated unions for handling more specific situations.
const ProtectionDescriptorSchema = z.object({
  permissionedDeploy: z.object({
    msgSender: AddressSchema,
  }),
  crossChainRedeploy: z.object({
    chainId: z.number('Chain ID must be a number').nonnegative('Chain ID must be non-negative'),
  }),
}).partial()

const SaltSchema = z.union([
  z.string()
    .refine(v => isHex(v), 'Salt must be a valid hex string')
    .length(66, 'Salt must be 32 bytes long in hex format (0x...)')
    .transform(v => hexToBytes(v)),
  z.instanceof(Uint8Array)
    .refine(isBytes, 'Salt must be a byte array')
    .refine(v => v.length === 32, 'Salt must be 32 bytes long'),
]).transform(v => ({
  senderBytes: v.slice(0, 20),
  redeployFlagByte: v[20],
  raw: v,
}))

const ComputeGuardedSaltInputSchema = z.object({
  salt: SaltSchema,
  protection: ProtectionDescriptorSchema.optional(),
}).superRefine(({ salt: { senderBytes, redeployFlagByte }, protection }, ctx) => {
  if (bytesToHex(senderBytes) === zeroAddress) {
    if (redeployFlagByte !== 0 && redeployFlagByte !== 1) {
      ctx.addIssue({
        code: 'custom',
        params: {
          position: [20, 21],
          expected: '0x00 or 0x01',
          received: numberToHex(redeployFlagByte, { size: 1 }),
        },
        message: 'If salt sender bytes(first 20bytes) are zero, salt redeploy flag(21st byte) must be 0 or 1',
      })
    }
  }

  if (!protection)
    return

  const { permissionedDeploy, crossChainRedeploy } = protection

  if (permissionedDeploy) {
    if (bytesToHex(senderBytes) !== permissionedDeploy.msgSender.toLowerCase()) {
      ctx.addIssue({
        code: 'custom',
        params: {
          position: [0, 20],
          expected: permissionedDeploy.msgSender.toLowerCase(),
          received: bytesToHex(senderBytes),
        },
        message: 'For permissioned deploy protection, salt sender bytes(first 20bytes) must match permissionedDeploy.msgSender',
      })
    }
  }

  if (crossChainRedeploy) {
    if (redeployFlagByte !== 1) {
      ctx.addIssue({
        code: 'custom',
        params: {
          position: [20, 21],
          expected: '0x01',
          received: numberToHex(redeployFlagByte, { size: 1 }),
        },
        message: 'For cross-chain redeploy protection, salt redeploy flag(21st byte) must be set to 1',
      })
    }
  }

  if (ctx.issues.length !== 0)
    return

  if (permissionedDeploy) {
    if (redeployFlagByte !== 0 && redeployFlagByte !== 1) {
      ctx.addIssue({
        code: 'custom',
        params: {
          position: [20, 21],
          expected: '0x00 or 0x01',
          received: numberToHex(redeployFlagByte, { size: 1 }),
        },
        message: 'For permissioned deploy protection, salt redeploy flag(21st byte) must be 0 or 1',
      })
    }
    // COVERAGE: 如果 redeployFlagByte === 1，但是没有 crossChainRedeploy protection
    if (redeployFlagByte === 1 && !crossChainRedeploy) {
      ctx.addIssue({
        code: 'custom',
        params: {
          position: [20, 21],
          expected: '0x00',
          received: numberToHex(redeployFlagByte, { size: 1 }),
        },
        message: 'If salt redeploy flag(21st byte) is 1, cross-chain redeploy protection must be provided',
      })
    }
  }
})
export type ComputeGuardedSaltInput = z.input<typeof ComputeGuardedSaltInputSchema>
export type ProtectionDescriptor = z.infer<typeof ProtectionDescriptorSchema>

export {
  ComputeGuardedSaltInputSchema,
  SaltSchema,
}
