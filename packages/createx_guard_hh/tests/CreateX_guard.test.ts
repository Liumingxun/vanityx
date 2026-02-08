import type { Hex } from 'viem'
import { computeGuardedSalt as _guard } from 'createx_guard'
import { network } from 'hardhat'
import { isAddress, ethAddress as SELF_ADDRESS, zeroAddress as ZERO_ADDRESS } from 'viem'
import { describe, expect, it } from 'vitest'
import GuardModule from '../ignition/modules/CreateX_guard'

const ANY_ADDRESS = '0x1111111111111111111111111111111111111111' as const
const EIP55_SELF_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as const

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

const invalid_salt_cases = [
  // row 1: Self, NA
  { salt: SELF_XC_NA_SALT, msgSender: SELF_ADDRESS, chainId: 31337 },
  { salt: SELF_XC_NA_SALT, msgSender: SELF_ADDRESS },
  // row 2: Zero, NA
  { salt: ZERO_XC_NA_SALT, msgSender: SELF_ADDRESS, chainId: 31337 },
  { salt: ZERO_XC_NA_SALT, msgSender: SELF_ADDRESS },
] as const

const { viem: hviem, ignition } = await network.connect()
const caller = await hviem.getTestClient({
  account: SELF_ADDRESS,
})
const eip55_caller = await hviem.getTestClient({
  account: EIP55_SELF_ADDRESS,
})
const { guard: createx_guard } = await ignition.deploy(GuardModule)

describe('guard module', async () => {
  it('eip55 is valid address', async () => {
    expect(isAddress(EIP55_SELF_ADDRESS)).toBe(true)
  })

  it.skipIf(createx_guard.address === '0x5FbDB2315678afecb367f032d93F642f64180aa3')('sanity check: test environment is set up correctly', async () => {
    expect(createx_guard).toBeDefined()
    expect(createx_guard.read._guard).toBeDefined()
    expect(createx_guard.address).toMatchInlineSnapshot(`"0x5FbDB2315678afecb367f032d93F642f64180aa3"`)
    expect(eip55_caller.account?.address).toMatchInlineSnapshot(`"0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"`)
    expect(caller.account?.address).toMatchInlineSnapshot(`"0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"`)
    expect(caller.chain.id).toMatchInlineSnapshot(`31337`)
  })

  it.for(passed_salt_cases)('%$: matches _guard output for valid salt combinations (Typescript vs contract)', async (input) => {
    if (!caller.account)
      throw new Error('No account found for caller')
    if (!eip55_caller.account)
      throw new Error('No account found for eip55_caller')

    const contractResult = await createx_guard.read._guard([input.salt], {
      account: caller.account,
    })
    const eip55_contractResult = await createx_guard.read._guard([input.salt], {
      account: eip55_caller.account,
    })
    const typescriptResult = _guard(input)
    const eip55_typescriptResult = _guard({ ...input, msgSender: EIP55_SELF_ADDRESS })

    expect(eip55_contractResult).toEqual(contractResult)
    expect(typescriptResult).toEqual(contractResult)
    expect(eip55_typescriptResult).toEqual(contractResult)
  })

  it.for(invalid_salt_cases.filter(v => v.salt.startsWith(ANY_ADDRESS)))('%$: (Typescript) rejects invalid salt', async (input) => {
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

  it.for(invalid_salt_cases.filter(v => v.salt.startsWith(ANY_ADDRESS)))('%$: (contract) reverts invalid salt', async (input) => {
    if (!caller.account)
      throw new Error('No account found for caller')

    await expect(() =>
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

  it.for(invalid_salt_cases.filter(v => v.salt.startsWith(ZERO_ADDRESS)))('%$: (Typescript) rejects invalid salt', async (input) => {
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

  it.for(invalid_salt_cases.filter(v => v.salt.startsWith(ZERO_ADDRESS)))('%$: (contract) reverts invalid salt', async (input) => {
    if (!caller.account)
      throw new Error('No account found for caller')

    await expect(() =>
      createx_guard.read._guard([input.salt], {
        account: caller.account,
      }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(`
      [ContractFunctionExecutionError: An unknown RPC error occurred.

      Raw Call Arguments:
        from:  0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee
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
