import type { Address, ByteArray, Hex } from 'viem'
import { GetGuardedSaltArgsSchema } from '#schema'
import { encodeAbiParameters, keccak256, numberToHex } from 'viem'

interface GetGuardedSaltInput {
  salt: Hex | ByteArray
  msgSender: Address
  chainId?: number | undefined
}

/**
 * Computes the guarded salt based on the provided input parameters **with validation**.
 * @param {GetGuardedSaltInput} input The input object containing the salt, msgSender, and optionally chainId for computing the guarded salt.
 * @returns {Hex} The computed guarded salt as a hexadecimal string.
 * @example
 * ```ts
 * const exampleInput: GetGuardedSaltInput = {
 *   salt: '0x0000000000000000000000000000000000000000000000000000000000000000',
 *   msgSender: '0x1111111111111111111111111111111111111111',
 *   chainId: 1,
 * }
 * getGuardedSalt(exampleInput)
 * ```
 */
function getGuardedSalt(input: GetGuardedSaltInput): Hex {
  const { salt, chainId, permissioned, crosschain } = GetGuardedSaltArgsSchema.parse(input)
  return computeGuardedSalt({ salt, chainId, permissioned, crosschain })
}

interface ComputeGuardedSaltInput {
  salt: Hex
  permissioned: boolean
  crosschain: boolean
  chainId?: number | undefined
}

/**
 * Computes the guarded salt based on the provided input parameters **without validation**.
 * The computation logic follows the rules defined in the CreateX contract, taking into account whether the salt is permissioned and/or cross-chain.
 *
 * Note: When using this function, ensure that the input parameters are correctly set according to the CreateX contract's requirements, as this function **does not perform any validation** on the inputs.
 * @param {ComputeGuardedSaltInput} input The input object containing the salt, permissioned, crosschain, and optionally chainId for computing the guarded salt.
 * @returns {Hex} The computed guarded salt as a hexadecimal string.
 * @example
 * ```ts
 * const exampleInput: ComputeGuardedSaltInput = {
 *   salt: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee010000000000000000000000',
 *   permissioned: true,
 *   crosschain: true,
 *   chainId: 1,
 * }
 * computeGuardedSalt(exampleInput)
 * ```
 */
function computeGuardedSalt({ salt, chainId, permissioned, crosschain }: ComputeGuardedSaltInput): Hex {
  // https://github.com/Liumingxun/vanity2/blob/f75ad02613713e544aec70f2b47220ce96e8f87e/packages/createx_guard/schema.ts#L64-L79
  if (permissioned && crosschain) {
    const msgSender = salt.slice(0, 42) as Address
    // https://github.com/pcaversaccio/createx/blob/73d517ef6639a052ce02da245a9d3ccfc185ba6b/src/CreateX.sol#L889-L891
    return keccak256(encodeAbiParameters(
      [{ type: 'address' }, { type: 'uint256' }, { type: 'bytes32' }],
      [msgSender, BigInt(chainId!), salt],
    ))
  }
  else if (permissioned) {
    const msgSender = salt.slice(0, 42) as Address
    // https://github.com/pcaversaccio/createx/blob/73d517ef6639a052ce02da245a9d3ccfc185ba6b/src/CreateX.sol#L892-L894
    return keccak256(encodeAbiParameters(
      [{ type: 'address' }, { type: 'bytes32' }],
      [msgSender, salt],
    ))
  }
  else if (crosschain) {
    // https://github.com/pcaversaccio/createx/blob/73d517ef6639a052ce02da245a9d3ccfc185ba6b/src/CreateX.sol#L898-L901
    return keccak256(encodeAbiParameters(
      [{ type: 'bytes32' }, { type: 'bytes32' }],
      [numberToHex((chainId!), { size: 32 }), salt],
    ))
  }

  // https://github.com/pcaversaccio/createx/blob/73d517ef6639a052ce02da245a9d3ccfc185ba6b/src/CreateX.sol#L907-L910
  return keccak256(encodeAbiParameters([{ type: 'bytes32' }], [salt]))
}

export { computeGuardedSalt, getGuardedSalt }
export type { ComputeGuardedSaltInput, GetGuardedSaltInput }
