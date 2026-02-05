import { bytesToHex, hexToBytes, isAddress, isBytes, isHex, numberToHex, zeroAddress } from 'viem'
import { z } from 'zod'

const AddressSchema = z.string()
  .refine(v => isAddress(v), 'Invalid address format')

const ProtectionDescriptorSchema = z.object({
  permissionedDeploy: z.object({
    msgSender: AddressSchema,
  }),
  crossChainRedeploy: z.object({
    chainId: z.number('Chain ID must be a number').nonnegative('Chain ID must be non-negative'),
  }),
}).partial().refine((data) => {
  if (data.crossChainRedeploy && !data.permissionedDeploy)
    return false
  return true
}, {
  error: 'If crossChainRedeploy protection is set, permissionedDeploy.msgSender must also be provided. (Tip: permissionedDeploy.msgSender can be zero address if needed)',
  path: ['permissionedDeploy', 'msgSender'],
})

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
    const maybeXChainProtection = protection?.crossChainRedeploy
    if (!maybeXChainProtection) {
      if (redeployFlagByte !== 0) {
        ctx.addIssue({
          code: 'custom',
          params: {
            position: [20, 21],
            expected: '0x00',
            received: numberToHex(redeployFlagByte, { size: 1 }),
          },
          message: 'If salt sender bytes(first 20bytes) are zero disable cross-chain redeploy protection, salt redeploy flag(21st byte) must be 0',
        })
      }
    }
    else if (redeployFlagByte !== 1) {
      ctx.addIssue({
        code: 'custom',
        params: {
          position: [20, 21],
          expected: '0x01',
          received: numberToHex(redeployFlagByte, { size: 1 }),
        },
        message: 'If salt sender bytes(first 20bytes) are zero enable cross-chain redeploy protection, salt redeploy flag(21st byte) must be 1',
      })
    }
    return
  }

  if (!protection)
    return

  const { permissionedDeploy: permissionedProtection, crossChainRedeploy: XChainProtection } = protection

  if (permissionedProtection) {
    if (bytesToHex(senderBytes) !== permissionedProtection.msgSender.toLowerCase()) {
      ctx.addIssue({
        code: 'custom',
        params: {
          position: [0, 20],
          expected: permissionedProtection.msgSender.toLowerCase(),
          received: bytesToHex(senderBytes),
        },
        message: 'For permissioned deploy protection, salt sender bytes(first 20bytes) must match permissionedDeploy.msgSender',
      })
    }
    if (!XChainProtection) {
      if (redeployFlagByte !== 0) {
        ctx.addIssue({
          code: 'custom',
          params: {
            position: [20, 21],
            expected: '0x00',
            received: numberToHex(redeployFlagByte, { size: 1 }),
          },
          message: 'If cross-chain redeploy protection is not provided, salt redeploy flag(21st byte) must be set to 0',
        })
      }
    }
    else if (redeployFlagByte !== 1) {
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
})
export type ComputeGuardedSaltInput = z.input<typeof ComputeGuardedSaltInputSchema>
export type ProtectionDescriptor = z.infer<typeof ProtectionDescriptorSchema>

export {
  ComputeGuardedSaltInputSchema,
  SaltSchema,
}
