import type { Address, ByteArray } from 'viem'
import { bytesToHex, encodeAbiParameters, hexToNumber, keccak256, numberToHex } from 'viem'

function parseSalt(salt: ByteArray) {
  const senderBytes = bytesToHex(salt.slice(0, 20))
  const redeployFlagBytes = salt[20]
  if (redeployFlagBytes === 1) {
    return {
      senderBytes,
      redeployProtectionFlag: true,
    }
  }
  if (redeployFlagBytes === 0) {
    return {
      senderBytes,
      redeployProtectionFlag: false,
    }
  }
  throw new Error('Invalid salt: redeploy flag must be 0 or 1')
}

export function calcGuardSalt(salt: ByteArray, options: { msgSender?: Address, chainId?: number }) {
  const { senderBytes, redeployProtectionFlag } = parseSalt(salt)
  const { msgSender, chainId } = options

  if (redeployProtectionFlag) {
    if (!chainId)
      throw new Error('chainId is required when redeployProtectionFlag is set')
    if (senderBytes.toLowerCase() === msgSender?.toLowerCase()) {
      return keccak256(encodeAbiParameters(
        [{ type: 'address' }, { type: 'uint256' }, { type: 'bytes32' }],
        [msgSender, BigInt(chainId), bytesToHex(salt)],
      ))
    }
    if (hexToNumber(senderBytes) === 0) {
      return keccak256(encodeAbiParameters(
        [{ type: 'bytes32' }, { type: 'bytes32' }],
        [numberToHex((chainId), { size: 32 }), bytesToHex(salt)],
      ))
    }
  }

  if (senderBytes.toLowerCase() === msgSender?.toLowerCase() && !redeployProtectionFlag) {
    return keccak256(encodeAbiParameters(
      [{ type: 'address' }, { type: 'bytes32' }],
      [msgSender, bytesToHex(salt)],
    ))
  }
  return keccak256(encodeAbiParameters([{ type: 'bytes32' }], [bytesToHex(salt)]))
}
