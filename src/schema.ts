import type { Address, Hex } from 'viem'
import { AddressSchema, ChainIdSchema } from 'createx_guard/schema'
import mm from 'micromatch'
import { bytesToHex, hexToBytes, isHash, isHex, keccak256, zeroAddress } from 'viem'
import { z } from 'zod'

const HexPatternSchema = z.string().refine(h => isHex(h, { strict: false }), 'Invalid hex pattern, must start with 0x')
const HashPatternSchema = HexPatternSchema.refine(h => isHash(h), 'Invalid hash pattern, must be a 32-byte hex string')

function AddressMatchSchema(pattern: Hex) {
  const hexPattern = HexPatternSchema.encode(pattern)

  return AddressSchema.refine(addr => mm.isMatch(addr, hexPattern), {
    message: `Address does not match pattern ${hexPattern}`,
  })
}

export const CREATEX_FACTORY_ADDRESS: Address = '0xba5ed099633d3b313e4d5f7bdc1305d3c28ba5ed' as const
const CreateXOptionsSchema = z.object({
  crosschain: z.boolean(),
  permissioned: z.boolean(),
}).partial()

const SearchVanityBaseArgsSchema = z.object({
  pattern: HexPatternSchema,
  deployer: AddressSchema.toLowerCase(),
  msgSender: AddressSchema.transform(addr => hexToBytes(addr)),
  chainId: ChainIdSchema.optional(),
  createxOpts: CreateXOptionsSchema.optional().default({}),
})

const WithInitcodeSchema = z.object({
  initcode: HexPatternSchema,
}).transform(({ initcode }) => ({
  initcodeHash: keccak256(initcode),
}))

const WithInitcodeHashSchema = z.object({
  initcodeHash: HashPatternSchema,
})

const SearchVanityArgsSchema = SearchVanityBaseArgsSchema.and(
  z.union([WithInitcodeSchema, WithInitcodeHashSchema]),
)
  .refine(({ deployer, chainId, createxOpts: { crosschain } }) => {
    if (deployer === CREATEX_FACTORY_ADDRESS)
      return !(crosschain && !chainId)
    return true
  }, 'When crosschain option is enabled, chainId must be provided')
  .transform(({ msgSender, createxOpts, ...rest }) => {
    const { permissioned, crosschain } = createxOpts

    if (!permissioned && !crosschain) {
      return {
        msgSender: bytesToHex(msgSender),
        saltPrefixBytes: new Uint8Array(0),
        ...rest,
      }
    }

    const saltPrefixBytes = new Uint8Array(21)
    if (permissioned && crosschain) {
      saltPrefixBytes.set(msgSender)
      saltPrefixBytes.fill(1, 20)
    }
    else if (permissioned) {
      saltPrefixBytes.set(msgSender)
    }
    else if (crosschain) {
      saltPrefixBytes.fill(1, 20)
    }
    return {
      msgSender: bytesToHex(msgSender),
      saltPrefixBytes,
      ...rest,
    }
  })

export {
  AddressMatchSchema,
  SearchVanityArgsSchema,
}
