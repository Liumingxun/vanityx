import type { Address, ByteArray, Hex } from 'viem'
import { calcGuardSalt } from 'createx_guard'
import { bytesToHex, concat, getContractAddress, hexToBytes, keccak256, slice, stringToBytes } from 'viem'

interface GetVanityBaseOptions {
  msgSender: Address
  deployer: Address
  matching: (address: Address) => boolean
}

type GetVanityOptions
  = GetVanityBaseOptions & ({
    initCode: Hex
  })
  | GetVanityBaseOptions & ({
    initCodeHash: Hex
  })

export function getVanity({
  msgSender,
  deployer,
  matching,
  ...initOption
}: GetVanityOptions) {
  let counter = 0n
  const bytecodeHash = 'initCode' in initOption
    ? keccak256(initOption.initCode)
    : initOption.initCodeHash

  const saltDefaultBytes: ByteArray = new Uint8Array(21)
  saltDefaultBytes.set(hexToBytes(msgSender))
  saltDefaultBytes[21] = 0 // redeployProtectionFlag = false

  const start = performance.now()
  while (true) {
    const chaos: ByteArray = new Uint8Array(11)
    chaos.set(slice(stringToBytes(crypto.randomUUID()), 25))
    const salt = concat([saltDefaultBytes, chaos])

    const guardSalt = calcGuardSalt(salt, { msgSender })

    const address = getContractAddress({
      opcode: 'CREATE2',
      from: deployer,
      salt: guardSalt,
      bytecodeHash,
    })

    if (matching(address)) {
      const end = performance.now()
      return {
        salt: bytesToHex(salt),
        address,
        counter,
        timeMs: end - start,
      }
    }
    counter++
  }
}
