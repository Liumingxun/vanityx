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
const SaltHexSchema = SaltBytesSchema.transform(v => bytesToHex(v))
const SaltSchema = SaltBytesSchema.transform(v => ({
  senderBytes: v.slice(0, 20),
  redeployFlagByte: v[20],
  raw: v,
}))

const ComputeGuardedSaltTransformedBaseArgsSchema = z.object({
  salt: SaltHexSchema,
  msgSender: AddressSchema,
  chainId: ChainIdSchema.optional(),
  crosschain: z.boolean(),
  permissioned: z.boolean(),
})
const ComputeGuardedSaltTransformedArgsSchema = z.discriminatedUnion('crosschain', [
  ComputeGuardedSaltTransformedBaseArgsSchema.extend({
    chainId: z.undefined(),
    crosschain: z.literal(false),
  }),
  ComputeGuardedSaltTransformedBaseArgsSchema.extend({
    chainId: ChainIdSchema,
    crosschain: z.literal(true),
  }),
])

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
  // +-------------+------------------+--------------+------------+
  // | SenderBytes | RedeployFlagByte | permissioned | crosschain |
  // +-------------+------------------+--------------+------------+
  // | self        |         1        |     true     |    true    |
  // +-------------+------------------+--------------+------------+
  // | self        |         0        |     true     |    false   |
  // +-------------+------------------+--------------+------------+
  // | zero        |         1        |     false    |    true    |
  // +-------------+------------------+--------------+------------+
  // | zero        |         0        |                           |
  // +-------------+------------------+                           |
  // | any         |         1        |           false           |
  // +-------------+------------------+                           |
  // | any         |         0        |                           |
  // +-------------+------------------+---------------------------+
  const saltSenderHex = bytesToHex(salt.senderBytes).toLowerCase()
  const permissioned = saltSenderHex === msgSender.toLowerCase()
  const crosschain = (permissioned || saltSenderHex === zeroAddress) && salt.redeployFlagByte === 1

  return {
    salt: bytesToHex(salt.raw),
    msgSender,
    chainId: crosschain ? chainId : undefined,
    permissioned,
    crosschain,
  }
}).pipe(z.transform(v => ComputeGuardedSaltTransformedArgsSchema.parse(v)))

export type ComputeGuardedSaltInput = z.input<typeof ComputeGuardedSaltArgsSchema>

export {
  ComputeGuardedSaltArgsSchema,
  SaltSchema,
}
