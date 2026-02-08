import type { Address, Hex } from 'viem'
import { AddressSchema, ChainIdSchema } from 'createx_guard/schema'
import mm from 'micromatch'
import { isHash, isHex, zeroAddress } from 'viem'
import { z } from 'zod'

const HexPatternSchema = z.string().refine(h => isHex(h, { strict: false }), 'Invalid hex pattern, must start with 0x')
const HashPatternSchema = HexPatternSchema.refine(h => isHash(h), 'Invalid hash pattern, must be a 32-byte hex string')

function AddressMatchSchema(pattern: Hex) {
  const hexPattern = HexPatternSchema.encode(pattern)

  return AddressSchema.refine(addr => mm.isMatch(addr, hexPattern), {
    message: `Address does not match pattern ${hexPattern}`,
  })
}

const CREATEX_FACTORY_ADDRESS: Address = '0xba5ed099633d3b313e4d5f7bdc1305d3c28ba5ed' as const
const CreateXOptionsSchema = z.object({
  crosschain: z.boolean(),
  permissioned: z.boolean(),
}).partial()

const SearchVanityBaseArgsSchema = z.object({
  pattern: HexPatternSchema,
  deployer: AddressSchema,
  msgSender: AddressSchema,
  chainId: ChainIdSchema.optional(),
  createxOpts: CreateXOptionsSchema.optional().default({}),
})
const SearchVanityArgsSchema = z.union([
  SearchVanityBaseArgsSchema.extend({
    initcode: HexPatternSchema,
  }),
  SearchVanityBaseArgsSchema.extend({
    initcodeHash: HashPatternSchema,
  }),
])
  .refine(({ deployer, chainId, createxOpts: { crosschain } }) => {
    if (deployer.toLowerCase() === CREATEX_FACTORY_ADDRESS)
      return !(crosschain && !chainId)
    return true
  }, 'When crosschain option is enabled, chainId must be provided')
  .transform(({ pattern, deployer, msgSender, chainId, createxOpts }) => {
    const { permissioned, crosschain } = createxOpts

    if (permissioned && crosschain) {
      return {
        saltPrefix: `${msgSender.toLowerCase()}01`,
        pattern,
        deployer,
        msgSender,
        chainId: chainId!,
      }
    }
    else if (permissioned) {
      return {
        saltPrefix: `${msgSender.toLowerCase()}00`,
        pattern,
        deployer,
        msgSender,
      }
    }
    else if (crosschain) {
      return {
        saltPrefix: `${zeroAddress}01`,
        pattern,
        deployer,
        msgSender,
        chainId: chainId!,
      }
    }

    return {
      saltPrefix: `${zeroAddress}00`,
      pattern,
      deployer,
      msgSender,
    }
  })

export {
  AddressMatchSchema,
  SearchVanityArgsSchema,
}
