import { bytesToHex, hexToBytes, isAddress, isBytes, isHex, zeroAddress } from 'viem'
import { z } from 'zod'

const AddressSchema = z.string().refine(v => v !== zeroAddress, 'Address cannot be the zero address').refine(v => isAddress(v), 'Invalid address format')
const ChainIdSchema = z.int('Chain ID must be a integer').nonnegative('Chain ID must be non-negative')

const SaltBytesSchema = z.union([
  z.string()
    .refine(v => isHex(v), 'Salt must be a valid hex string')
    .length(66, 'Salt must be 32 bytes long in hex format (0x...)'),
  z.instanceof(Uint8Array)
    .refine(isBytes, 'Salt must be a byte array')
    .refine(v => v.length === 32, 'Salt must be 32 bytes long'),
]).transform(v => typeof v === 'string' ? hexToBytes(v) : v)
const SaltSchema = SaltBytesSchema.transform(v => ({
  senderBytes: v.slice(0, 20),
  redeployFlagByte: v[20],
  raw: v,
}))

const ComputeGuardedSaltArgsSchema = z.object({
  salt: SaltSchema,
  msgSender: AddressSchema,
  chainId: ChainIdSchema.optional(),
}).superRefine(({ salt: { senderBytes, redeployFlagByte, raw }, msgSender, chainId }, ctx) => {
  const senderHex = bytesToHex(senderBytes).toLowerCase()
  if (senderHex === zeroAddress || senderHex === msgSender.toLowerCase()) {
    if (redeployFlagByte !== 0 && redeployFlagByte !== 1) {
      ctx.addIssue({
        code: 'invalid_value',
        values: [bytesToHex(raw)],
        path: ['salt'],
        message: 'When the first 20 bytes matches the caller address or is zero address, the cross-chain redeploy protection flag must be explicitly specified as either 0 or 1 at the 21st byte.',
      })
    }
    else if (redeployFlagByte === 1 && !chainId) {
      ctx.addIssue({
        code: 'invalid_type',
        expected: 'int',
        message: 'When set redeploy protection flag, chainId must be provided',
      })
    }
  }
}).transform(({ salt, msgSender, chainId }) => {
  const crosschain = salt.redeployFlagByte === 1
  const permissioned = bytesToHex(salt.senderBytes).toLowerCase() === msgSender.toLowerCase()

  return {
    salt: salt.raw,
    msgSender,
    chainId,
    protection: {
      permissioned,
      crosschain,
    },
  }
})
export type ComputeGuardedSaltInput = z.input<typeof ComputeGuardedSaltArgsSchema>

export {
  ComputeGuardedSaltArgsSchema,
  SaltSchema,
}
