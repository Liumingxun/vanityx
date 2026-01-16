import type { Address, Hex } from 'viem'
import { bytesToHex, encodeDeployData, encodeFunctionData, getContractAddress, keccak256, parseGwei } from 'viem'
import { hardhat } from 'viem/chains'
import { bytecode as afloatBytecode } from '../Afloat#Afloat.json'
import { bytecode as proxyBytecode } from '../Afloat#Proxy.json'
import { guardedSalt } from './utils'

// create2 deployer address
const deployer: Address = '0xba5ed099633d3b313e4d5f7bdc1305d3c28ba5ed'

// 0x0000000000000000000000000000000000000000000000000000000000000000
const salt = new Uint8Array(32)
// 0x290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e563
const guardsalt = guardedSalt(salt, deployer, (hardhat.id))

console.table({
  salt: bytesToHex(salt),
  guardsalt,
})

// https://etherscan.io/address/0xba5ed099633d3b313e4d5f7bdc1305d3c28ba5ed#readContract#F1
const address = getContractAddress({
  opcode: 'CREATE2',
  salt: guardsalt,
  from: deployer,
  /**
   * 实际上这里也应该使用 encodeDeployData 来生成初始化代码(init_code)，
   * 但由于 Afloat 合约没有构造函数参数，所以直接使用 bytecode 也是可以的。
   */
  bytecodeHash: keccak256(afloatBytecode as Hex),
})

console.log('Afloat contract address:', address, address === '0xE25f618CF80e7Ea13F99BaFFB7b19241B8dcD583')

const proxy_init_code = encodeDeployData({
  abi: [
    {
      inputs: [
        {
          internalType: 'address',
          name: 'implementation',
          type: 'address',
        },
        {
          internalType: 'bytes',
          name: '_data',
          type: 'bytes',
        },
      ],
      stateMutability: 'payable',
      type: 'constructor',
    },
  ],
  bytecode: proxyBytecode as Hex,
  args: [address, encodeFunctionData({
    abi: [{
      inputs: [
        {
          components: [
            {
              internalType: 'uint64',
              name: 'ttl',
              type: 'uint64',
            },
            {
              internalType: 'uint256',
              name: 'minDeposit',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'pickFee',
              type: 'uint256',
            },
            {
              internalType: 'uint32',
              name: 'reportThreshold',
              type: 'uint32',
            },
          ],
          internalType: 'struct Afloat.Config',
          name: 'c',
          type: 'tuple',
        },
      ],
      name: 'initialize',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    }],
    functionName: 'initialize',
    args: [{
      ttl: BigInt(60 * 60 * 2),
      minDeposit: parseGwei('1'),
      pickFee: parseGwei('10'),
      reportThreshold: 3,
    }],
  })],
})

const proxyAddress = getContractAddress({
  opcode: 'CREATE2',
  salt: guardsalt,
  from: deployer,
  bytecodeHash: keccak256(proxy_init_code),
})

console.log('Afloat Proxy contract address:', proxyAddress, proxyAddress === '0x1B6e77B1a0803dbaad620DB95F722BD253fF988C')
