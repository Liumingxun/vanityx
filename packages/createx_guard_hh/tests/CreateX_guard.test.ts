import type { Address, Hex } from 'viem'
import { computeGuardedSalt as _guard } from 'createx_guard'
import { network } from 'hardhat'
import { ethAddress as ANY_ADDRESS, zeroAddress as ZERO_ADDRESS } from 'viem'
import { describe, expect, it } from 'vitest'
import GuardModule from '../ignition/modules/CreateX_guard'

const SELF_ADDRESS: Address = '0x1111111111111111111111111111111111111111' as const

const SELF_XC_OFF_SALT: Hex = `${SELF_ADDRESS}00${'aa'.repeat(11)}`
const SELF_XC_ON_SALT: Hex = `${SELF_ADDRESS}01${'aa'.repeat(11)}`
const SELF_XC_NA_SALT: Hex = `${SELF_ADDRESS}ff${'aa'.repeat(11)}`

const ZERO_XC_OFF_SALT: Hex = `${ZERO_ADDRESS}00${'bb'.repeat(11)}`
const ZERO_XC_ON_SALT: Hex = `${ZERO_ADDRESS}01${'bb'.repeat(11)}`
const ZERO_XC_NA_SALT: Hex = `${ZERO_ADDRESS}ff${'bb'.repeat(11)}`

const ANY_XC_OFF_SALT: Hex = `${ANY_ADDRESS}00${'cc'.repeat(11)}`
const ANY_XC_ON_SALT: Hex = `${ANY_ADDRESS}01${'cc'.repeat(11)}`
const ANY_XC_NA_SALT: Hex = `${ANY_ADDRESS}ff${'cc'.repeat(11)}`

const passed_salt_cases = [
  // row 1: Self, On, Off
  { salt: SELF_XC_ON_SALT, msgSender: SELF_ADDRESS, chainId: 31337 },
  { salt: SELF_XC_OFF_SALT, msgSender: SELF_ADDRESS, chainId: 31337 },
  { salt: SELF_XC_OFF_SALT, msgSender: SELF_ADDRESS },
  // row 2: Zero, On, Off
  { salt: ZERO_XC_ON_SALT, msgSender: SELF_ADDRESS, chainId: 31337 },
  { salt: ZERO_XC_OFF_SALT, msgSender: SELF_ADDRESS, chainId: 31337 },
  { salt: ZERO_XC_OFF_SALT, msgSender: SELF_ADDRESS },
  // row 3: Random, On, Off, NA
  { salt: ANY_XC_ON_SALT, msgSender: SELF_ADDRESS, chainId: 31337 },
  { salt: ANY_XC_ON_SALT, msgSender: SELF_ADDRESS },
  { salt: ANY_XC_OFF_SALT, msgSender: SELF_ADDRESS, chainId: 31337 },
  { salt: ANY_XC_OFF_SALT, msgSender: SELF_ADDRESS },
  { salt: ANY_XC_NA_SALT, msgSender: SELF_ADDRESS, chainId: 31337 },
  { salt: ANY_XC_NA_SALT, msgSender: SELF_ADDRESS },
] as const

const reverted_salt_cases = [
  // row 1: Self, NA
  { salt: SELF_XC_NA_SALT, msgSender: SELF_ADDRESS, chainId: 31337 },
  { salt: SELF_XC_NA_SALT, msgSender: SELF_ADDRESS },
  // row 2: Zero, NA
  { salt: ZERO_XC_NA_SALT, msgSender: SELF_ADDRESS, chainId: 31337 },
  { salt: ZERO_XC_NA_SALT, msgSender: SELF_ADDRESS },
] as const

describe('guard module', async () => {
  const { viem: hviem, ignition } = await network.connect()
  const caller = await hviem.getTestClient({
    account: SELF_ADDRESS,
  })
  const { guard: createx_guard } = await ignition.deploy(GuardModule)

  it.skipIf(createx_guard.address === '0x5FbDB2315678afecb367f032d93F642f64180aa3')('basic', async () => {
    expect(createx_guard).toBeDefined()
    expect(createx_guard.read._guard).toBeDefined()
    expect(createx_guard.address).toMatchInlineSnapshot(`"0x5FbDB2315678afecb367f032d93F642f64180aa3"`)
    expect(caller.account?.address).toMatchInlineSnapshot(`"0x1111111111111111111111111111111111111111"`)
    expect(caller.chain.id).toMatchInlineSnapshot(`31337`)
  })

  it.for(passed_salt_cases)('%$: matches _guard output for valid salt combinations (Typescript vs contract)', async (input) => {
    if (!caller.account)
      throw new Error('No account found for caller')

    const contractResult = await createx_guard.read._guard([input.salt], {
      account: caller.account,
    })

    expect(_guard(input)).toEqual(contractResult)
  })

  it.for(reverted_salt_cases.filter(v => v.salt.startsWith(SELF_ADDRESS)))('%$: (Typescript) rejects invalid salt', async (input) => {
    if (!caller.account)
      throw new Error('No account found for caller')

    expect(() => _guard(input)).toThrowErrorMatchingInlineSnapshot(`
      [ZodError: [
        {
          "code": "invalid_value",
          "values": [
            "0x1111111111111111111111111111111111111111ffaaaaaaaaaaaaaaaaaaaaaa"
          ],
          "path": [
            "salt"
          ],
          "message": "When the first 20 bytes matches the caller address or is zero address, the cross-chain redeploy protection flag must be explicitly specified as either 0 or 1 at the 21st byte."
        }
      ]]
    `, 'When the first 20 bytes matches the caller address or is zero address, the cross-chain redeploy protection flag must be explicitly specified as either 0 or 1 at the 21st byte.')
  })

  it.for(reverted_salt_cases.filter(v => v.salt.startsWith(SELF_ADDRESS)))('%$: (contract) reverts invalid salt', async (input) => {
    if (!caller.account)
      throw new Error('No account found for caller')

    expect(() =>
      createx_guard.read._guard([input.salt], {
        account: caller.account,
      }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(`
      [ContractFunctionExecutionError: An unknown RPC error occurred.

      Raw Call Arguments:
        from:  0x1111111111111111111111111111111111111111
        to:    0x5FbDB2315678afecb367f032d93F642f64180aa3
        data:  0xbdfd4b141111111111111111111111111111111111111111ffaaaaaaaaaaaaaaaaaaaaaa
       
      Contract Call:
        address:   0x5FbDB2315678afecb367f032d93F642f64180aa3
        function:  _guard(bytes32 salt)
        args:            (0x1111111111111111111111111111111111111111ffaaaaaaaaaaaaaaaaaaaaaa)

      Docs: https://viem.sh/docs/contract/readContract
      Details: VM Exception while processing transaction: reverted with reason string 'invalid salt'
      Version: viem@2.45.1]
    `)
  })

  it.for(reverted_salt_cases.filter(v => v.salt.startsWith(ZERO_ADDRESS)))('%$: (Typescript) rejects invalid salt', async (input) => {
    if (!caller.account)
      throw new Error('No account found for caller')

    expect(() => _guard(input)).toThrowErrorMatchingInlineSnapshot(`
      [ZodError: [
        {
          "code": "invalid_value",
          "values": [
            "0x0000000000000000000000000000000000000000ffbbbbbbbbbbbbbbbbbbbbbb"
          ],
          "path": [
            "salt"
          ],
          "message": "When the first 20 bytes matches the caller address or is zero address, the cross-chain redeploy protection flag must be explicitly specified as either 0 or 1 at the 21st byte."
        }
      ]]
    `, 'When the first 20 bytes matches the caller address or is zero address, the cross-chain redeploy protection flag must be explicitly specified as either 0 or 1 at the 21st byte.')
  })

  it.for(reverted_salt_cases.filter(v => v.salt.startsWith(ZERO_ADDRESS)))('%$: (contract) reverts invalid salt', async (input) => {
    if (!caller.account)
      throw new Error('No account found for caller')

    expect(() =>
      createx_guard.read._guard([input.salt], {
        account: caller.account,
      }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(`
      [ContractFunctionExecutionError: An unknown RPC error occurred.

      Raw Call Arguments:
        from:  0x1111111111111111111111111111111111111111
        to:    0x5FbDB2315678afecb367f032d93F642f64180aa3
        data:  0xbdfd4b140000000000000000000000000000000000000000ffbbbbbbbbbbbbbbbbbbbbbb
       
      Contract Call:
        address:   0x5FbDB2315678afecb367f032d93F642f64180aa3
        function:  _guard(bytes32 salt)
        args:            (0x0000000000000000000000000000000000000000ffbbbbbbbbbbbbbbbbbbbbbb)

      Docs: https://viem.sh/docs/contract/readContract
      Details: VM Exception while processing transaction: reverted with reason string 'invalid salt'
      Version: viem@2.45.1]
    `)
  })
})
