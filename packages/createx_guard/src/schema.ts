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
  senderHex: bytesToHex(v.slice(0, 20)).toLowerCase(),
  redeployFlag: v[20],
  raw: v,
}))

const ComputeGuardedSaltTransformedBaseArgsSchema = z.object({
  salt: SaltHexSchema,
  permissioned: z.boolean(),
})
const ComputeGuardedSaltTransformedArgsSchema = z.discriminatedUnion(
  'crosschain',
  [
    z.object({
      ...ComputeGuardedSaltTransformedBaseArgsSchema.shape,
      chainId: z.never().optional(),
      crosschain: z.literal(false),
    }),
    z.object({
      ...ComputeGuardedSaltTransformedBaseArgsSchema.shape,
      chainId: ChainIdSchema,
      crosschain: z.literal(true),
    }),
  ],
)

const ComputeGuardedSaltArgsSchema = z.object({
  salt: SaltSchema,
  msgSender: AddressSchema.toLowerCase(),
  chainId: ChainIdSchema.optional(),
}).superRefine(({ salt: { senderHex, redeployFlag, raw }, msgSender, chainId }, ctx) => {
  if (senderHex === zeroAddress || senderHex === msgSender) {
    if (redeployFlag !== 0 && redeployFlag !== 1) {
      ctx.addIssue({
        code: 'invalid_value',
        values: [bytesToHex(raw)],
        path: ['salt'],
        message: 'When the first 20 bytes matches the caller address or is zero address, the cross-chain redeploy protection flag must be explicitly specified as either 0 or 1 at the 21st byte.',
      })
    }
    else if (redeployFlag === 1 && !chainId) {
      ctx.addIssue({
        code: 'invalid_type',
        expected: 'int',
        message: 'When set redeploy protection flag, chainId must be provided',
      })
    }
  }
}).transform(({ salt: { senderHex, redeployFlag, raw }, msgSender, chainId }) => {
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
  const permissioned = senderHex === msgSender
  const crosschain = (permissioned || senderHex === zeroAddress) && redeployFlag === 1

  return {
    salt: bytesToHex(raw),
    chainId: crosschain ? chainId : undefined,
    permissioned,
    crosschain,
  }
}).pipe(z.transform(v => ComputeGuardedSaltTransformedArgsSchema.parse(v)))

export {
  AddressSchema,
  ChainIdSchema,
  ComputeGuardedSaltArgsSchema,
  SaltBytesSchema,
  SaltHexSchema,
  SaltSchema,
}
