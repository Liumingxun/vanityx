import { bytesToHex } from 'viem'
import { anvil } from 'viem/chains'
import { calcGuardSalt } from './utils'

const salt = new Uint8Array(32)
salt[21] = 1

console.log(bytesToHex(salt))

console.log(calcGuardSalt(
  salt,
  { msgSender: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266', chainId: anvil.id },
) === '0xe2d44d82fbf82649bd829d093663eefdb320319a1ec59c84ccc03b00f89584e2')
