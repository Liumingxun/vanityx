import type { Address, ByteArray, Hex } from 'viem'
import { calcGuardSalt } from 'createx_guard'
import { bytesToHex, getContractAddress, hexToBytes, keccak256 } from 'viem'

interface GetVanityBaseOptions {
  msgSender?: Address
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

const CREATEX_FACTORY_ADDRESS: Address = '0xba5ed099633d3b313e4d5f7bdc1305d3c28ba5ed' as const

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

  const isCreatexFactory = deployer.toLowerCase() === CREATEX_FACTORY_ADDRESS.toLowerCase()

  const saltBytes: ByteArray = new Uint8Array(32)

  const start = performance.now()
  while (true) {
    crypto.getRandomValues(saltBytes)
    if (msgSender)
      saltBytes.set(hexToBytes(msgSender))

    if (isCreatexFactory)
      saltBytes[20] = 0

    const salt = isCreatexFactory
      ? calcGuardSalt(saltBytes, { msgSender })
      : saltBytes

    const address = getContractAddress({
      opcode: 'CREATE2',
      from: deployer,
      salt,
      bytecodeHash,
    })

    if (matching(address)) {
      const end = performance.now()
      return {
        salt: bytesToHex(saltBytes),
        address,
        counter,
        timeMs: end - start,
      }
    }
    counter++
  }
}
