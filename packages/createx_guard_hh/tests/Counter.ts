import { network } from 'hardhat'
import { describe, expect, it } from 'vitest'

describe('Counter', async () => {
  const { viem } = await network.connect()
  const publicClient = await viem.getPublicClient()

  it('Should emit the Increment event when calling the inc() function', async () => {
    const counter = await viem.deployContract('Counter')

    await viem.assertions.emitWithArgs(
      counter.write.inc(),
      counter,
      'Increment',
      [1n],
    )
  })

  it('The sum of the Increment events should match the current value', async () => {
    const counter = await viem.deployContract('Counter')
    const deploymentBlockNumber = await publicClient.getBlockNumber()

    // run a series of increments
    for (let i = 1n; i <= 10n; i++) {
      await counter.write.incBy([i])
    }

    const events = await publicClient.getContractEvents({
      address: counter.address,
      abi: counter.abi,
      eventName: 'Increment',
      fromBlock: deploymentBlockNumber,
      strict: true,
    })

    // check that the aggregated events match the current value
    let total = 0n
    for (const event of events) {
      total += event.args.by
    }

    expect(total).toBe(await counter.read.x())
  })
})
