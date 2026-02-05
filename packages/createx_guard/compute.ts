import type { ComputeGuardedSaltInput } from './schema'
import { ComputeGuardedSaltArgsSchema } from './schema'

function computeGuardedSalt(input: ComputeGuardedSaltInput): string {
  const { success, data, error } = ComputeGuardedSaltArgsSchema.safeParse(input)
  if (!success) {
    throw new Error(error.message, { cause: error.cause })
  }
  const { salt, msgSender, chainId } = data
  return ''
}

if (import.meta.main) {
  computeGuardedSalt({
    salt: '0xff010203040506070809ff01020304050607080900ff010203040506070809ff',
    protection: {
      permissionedDeploy: {
        msgSender: '0x1234567890123456789012345678901234567890',
      },
      crossChainRedeploy: {
        chainId: 1,
      },
    },
  })
}

export default computeGuardedSalt
