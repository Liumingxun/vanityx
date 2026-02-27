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
 *   salt: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee010000000000000000000000',
 *   msgSender: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
 *   chainId: 1,
 * }
 * getGuardedSalt(exampleInput)
 * ```
 */
function getGuardedSalt(input: GetGuardedSaltInput, to?: 'hex'): Hex
function getGuardedSalt(input: GetGuardedSaltInput, to: 'bytes'): ByteArray
function getGuardedSalt(input: GetGuardedSaltInput, to: 'hex' | 'bytes' = 'hex'): Hex | ByteArray {
  const { salt, permissioned, crosschain } = GetGuardedSaltArgsSchema.parse(input)
  return computeGuardedSalt({
    salt,
    permissioned,
    crosschain,
  }, to as any)
}

interface ComputeGuardedSaltInput {
  salt: Hex
  crosschain?: { chainId: number } | undefined
  permissioned?: { msgSender: Address } | undefined
}

/**
 * Computes the guarded salt based on the provided input parameters **without validation**.
 * The computation logic follows the rules defined in the CreateX contract, taking into account whether the salt is permissioned and/or cross-chain.
 *
 * Note: When using this function, ensure that the input parameters are correctly set according to the CreateX contract's requirements, as this function **does not perform any validation** on the inputs.
 * @param {ComputeGuardedSaltInput} input The input object containing the salt, permissioned, crosschain, and optionally chainId for computing the guarded salt.
 * @returns {ByteArray} The computed guarded salt as a byte array.
 * @example
 * ```ts
 * const exampleInput: ComputeGuardedSaltInput = {
 *   salt: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee010000000000000000000000',
 *   permissioned: { msgSender: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' },
 *   crosschain: { chainId: 1 },
 * }
 * computeGuardedSalt(exampleInput)
 * ```
 */
function computeGuardedSalt({ salt, permissioned, crosschain }: ComputeGuardedSaltInput, to?: 'hex'): Hex
function computeGuardedSalt({ salt, permissioned, crosschain }: ComputeGuardedSaltInput, to: 'bytes'): ByteArray
function computeGuardedSalt({ salt, permissioned, crosschain }: ComputeGuardedSaltInput, to: 'hex' | 'bytes' = 'hex'): Hex | ByteArray {
  // https://github.com/Liumingxun/vanity2/blob/f75ad02613713e544aec70f2b47220ce96e8f87e/packages/createx_guard/schema.ts#L64-L79
  if (permissioned && crosschain) {
    // https://github.com/pcaversaccio/createx/blob/73d517ef6639a052ce02da245a9d3ccfc185ba6b/src/CreateX.sol#L889-L891
    return keccak256(encodeAbiParameters(
      [{ type: 'address' }, { type: 'uint256' }, { type: 'bytes32' }],
      [permissioned.msgSender, BigInt(crosschain.chainId), salt],
    ), to)
  }
  else if (permissioned) {
    // https://github.com/pcaversaccio/createx/blob/73d517ef6639a052ce02da245a9d3ccfc185ba6b/src/CreateX.sol#L892-L894
    return keccak256(encodeAbiParameters(
      [{ type: 'address' }, { type: 'bytes32' }],
      [permissioned.msgSender, salt],
    ), to)
  }
  else if (crosschain) {
    // https://github.com/pcaversaccio/createx/blob/73d517ef6639a052ce02da245a9d3ccfc185ba6b/src/CreateX.sol#L898-L901
    return keccak256(encodeAbiParameters(
      [{ type: 'bytes32' }, { type: 'bytes32' }],
      [numberToHex((crosschain.chainId), { size: 32 }), salt],
    ), to)
  }

  // https://github.com/pcaversaccio/createx/blob/73d517ef6639a052ce02da245a9d3ccfc185ba6b/src/CreateX.sol#L907-L910
  return keccak256(encodeAbiParameters([{ type: 'bytes32' }], [salt]), to)
}

export { computeGuardedSalt, getGuardedSalt }
export type { ComputeGuardedSaltInput, GetGuardedSaltInput }
