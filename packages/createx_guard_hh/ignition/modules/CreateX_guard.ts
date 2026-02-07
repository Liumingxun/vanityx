import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

export default buildModule('CreateXGuardModule', (m) => {
  const guard = m.contract('CreateX_guard')

  return { guard }
})
