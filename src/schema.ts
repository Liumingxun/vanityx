import { AddressSchema, CreateXOptionsSchema } from 'createx_guard/schema'
import { bytesToHex, hexToBytes, isHash, isHex, keccak256 } from 'viem'
import { z } from 'zod'

export { AddressSchema }

export const HexPatternSchema = z.string().refine(h => isHex(h, { strict: false }), 'Invalid hex pattern, must start with 0x')
export const HexSchema = z.string().refine(h => isHex(h), 'Invalid hex, must match `/^0x[0-9a-fA-F]*$/`')
export const HashSchema = HexSchema.refine(h => isHash(h), 'Invalid hash, must be a 32-byte hex string')

export const CREATEX_FACTORY_ADDRESS = '0xba5ed099633d3b313e4d5f7bdc1305d3c28ba5ed' as const

const SearchVanityBaseArgsSchema = z.object({
  pattern: HexPatternSchema,
  deployer: AddressSchema.toLowerCase(),
  createxOpts: CreateXOptionsSchema.extend({
    permissioned: z.object({ msgSender: AddressSchema.transform(addr => hexToBytes(addr)) }).optional(),
  }).optional().default({}),
})

const WithInitcodeSchema = z.object({
  initcode: HexSchema,
}).transform(({ initcode }) => ({
  initcodeHash: keccak256(initcode),
}))

const WithInitcodeHashSchema = z.object({
  initcodeHash: HashSchema,
})

const SearchVanityArgsSchema = SearchVanityBaseArgsSchema.and(
  z.union([WithInitcodeSchema, WithInitcodeHashSchema]),
)
  .transform(({ createxOpts, ...rest }) => {
    const { permissioned, crosschain } = createxOpts

    if (
      (!permissioned && !crosschain)
      || rest.deployer !== CREATEX_FACTORY_ADDRESS
    ) {
      return {
        saltPrefixBytes: new Uint8Array(0),
        permissioned: undefined,
        crosschain: undefined,
        ...rest,
      }
    }

    const saltPrefixBytes = new Uint8Array(21)
    if (permissioned && crosschain) {
      saltPrefixBytes.set(permissioned.msgSender)
      saltPrefixBytes.fill(1, 20)
    }
    else if (permissioned) {
      saltPrefixBytes.set(permissioned.msgSender)
    }
    else if (crosschain) {
      saltPrefixBytes.fill(1, 20)
    }
    return {
      saltPrefixBytes,
      permissioned: permissioned ? { msgSender: bytesToHex(permissioned.msgSender) } : undefined,
      crosschain,
      ...rest,
    }
  })

export {
  SearchVanityArgsSchema,
}
