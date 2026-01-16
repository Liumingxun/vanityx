import type { Address, ByteArray, Hex } from 'viem'
import process from 'node:process'
import { calcGuardSalt } from 'createx_guard'
import { bytesToHex, concat, getContractAddress, hexToBytes, keccak256, slice, stringToBytes, stringToHex } from 'viem'

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
}: GetVanityOptions): { salt: Hex, address: Address } {
  let counter = 0n
  const bytecodeHash = 'initCode' in initOption
    ? keccak256(initOption.initCode)
    : initOption.initCodeHash

  const saltDefaultBytes: ByteArray = new Uint8Array(21)
  saltDefaultBytes.set(hexToBytes(msgSender))
  saltDefaultBytes[21] = 0 // redeployProtectionFlag = false

  while (true) {
    const start = performance.now()
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
      process.stdout.end(`Found matching address ${address} in ${(end - start).toFixed(2)} ms with salt ${bytesToHex(salt)} after ${counter} attempts`)
      return { salt: bytesToHex(salt), address }
    }
    counter++
  }
}

if (import.meta.main) {
  getVanity({
    deployer: '0xba5ed099633d3b313e4d5f7bdc1305d3c28ba5ed' as Address,
    msgSender: '0xdeadbeef000000000000000000000000deadbeef' as Address,
    initCodeHash: stringToHex(crypto.randomUUID()) as Hex,
    matching: address => address.toLowerCase().startsWith('0xdead'),
  })
}
