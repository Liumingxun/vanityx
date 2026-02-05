import { bytesToHex, hexToBytes, isAddress, isBytes, isHex, numberToHex, zeroAddress } from 'viem'
import { z } from 'zod'

const AddressSchema = z.string('Address must be a string')
  .refine(v => isAddress(v), 'Invalid address format')

const ProtectionDescriptorSchema = z.object({
  permissionedDeploy: z.object({
    msgSender: AddressSchema,
  }),
  crossChainRedeploy: z.object({
    chainId: z.number('Chain ID must be a number').nonnegative('Chain ID must be non-negative'),
  }),
}).partial().refine(data => !(data.crossChainRedeploy && !data.permissionedDeploy), {
  error: 'If crossChainRedeploy protection is set, `permissionedDeploy.msgSender` must also be provided. (Tip: `permissionedDeploy.msgSender` can be zero address if needed)',
  path: ['permissionedDeploy', 'msgSender'],
  abort: true,
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
  const senderHex = bytesToHex(senderBytes).toLowerCase()
  const addFlagIssue = (expected: 0 | 1) => {
    if (redeployFlagByte === expected)
      return
    ctx.addIssue({
      code: 'custom',
      params: {
        position: [20, 21],
        expected: expected === 0 ? '0x00' : '0x01',
        received: numberToHex(redeployFlagByte, { size: 1 }),
      },
      message: expected === 0
        ? 'If cross-chain redeploy protection is not provided, salt redeploy flag(21st byte) must be set to 0'
        : 'If cross-chain redeploy protection is enabled, salt redeploy flag(21st byte) must be 1',
    })
  }

  if (senderHex === zeroAddress) {
    addFlagIssue(protection?.crossChainRedeploy ? 1 : 0)
    return
  }

  if (!protection)
    return

  const { permissionedDeploy: permissionedProtection, crossChainRedeploy: XChainProtection } = protection

  if (!permissionedProtection)
    return

  if (senderHex !== permissionedProtection.msgSender.toLowerCase()) {
    ctx.addIssue({
      code: 'custom',
      params: {
        position: [0, 20],
        expected: permissionedProtection.msgSender.toLowerCase(),
        received: senderHex,
      },
      message: 'If permissioned deploy protection is enabled, salt sender bytes(first 20bytes) must match `permissionedDeploy.msgSender`',
    })
  }

  addFlagIssue(XChainProtection ? 1 : 0)
})
export type ComputeGuardedSaltInput = z.input<typeof ComputeGuardedSaltInputSchema>
export type ProtectionDescriptor = z.infer<typeof ProtectionDescriptorSchema>

export {
  ComputeGuardedSaltInputSchema,
  SaltSchema,
}
