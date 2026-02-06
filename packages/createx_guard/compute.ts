import type { ComputeGuardedSaltInput } from './schema'
import { bytesToHex, encodeAbiParameters, keccak256, numberToHex, zeroAddress } from 'viem'
import { ComputeGuardedSaltArgsSchema } from './schema'

function computeGuardedSalt(input: ComputeGuardedSaltInput): string {
  const { success, data, error } = ComputeGuardedSaltArgsSchema.safeParse(input)
  if (!success) {
    throw new Error(error.message, { cause: error.cause })
  }

  const { salt, protection } = data
  const msgSender = protection.permissionedDeploy?.msgSender
  const chainId = protection.crossChainRedeploy?.chainId

  // All parameters have passed schema validation at this point
  if (msgSender && chainId) {
    // https://github.com/pcaversaccio/createx/blob/73d517ef6639a052ce02da245a9d3ccfc185ba6b/src/CreateX.sol#L898-L901
    if (msgSender.toLowerCase() === zeroAddress) {
      return keccak256(encodeAbiParameters(
        [{ type: 'bytes32' }, { type: 'bytes32' }],
        [numberToHex((chainId), { size: 32 }), bytesToHex(salt)],
      ))
    }

    // https://github.com/pcaversaccio/createx/blob/73d517ef6639a052ce02da245a9d3ccfc185ba6b/src/CreateX.sol#L889-L891
    return keccak256(encodeAbiParameters(
      [{ type: 'address' }, { type: 'uint256' }, { type: 'bytes32' }],
      [msgSender, BigInt(chainId), bytesToHex(salt)],
    ))
  }

  // https://github.com/pcaversaccio/createx/blob/73d517ef6639a052ce02da245a9d3ccfc185ba6b/src/CreateX.sol#L892-L894
  if (msgSender) {
    return keccak256(encodeAbiParameters(
      [{ type: 'address' }, { type: 'bytes32' }],
      [msgSender, bytesToHex(salt)],
    ))
  }

  // https://github.com/pcaversaccio/createx/blob/73d517ef6639a052ce02da245a9d3ccfc185ba6b/src/CreateX.sol#L907-L910
  return keccak256(encodeAbiParameters([{ type: 'bytes32' }], [bytesToHex(salt)]))
}

export default computeGuardedSalt
