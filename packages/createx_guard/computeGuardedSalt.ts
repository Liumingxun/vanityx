import { isHex } from 'viem'
import { z } from 'zod'

const ComputeGuardedSaltInputSchema = z.object({
  salt: z.string()
    .refine(v => isHex(v), 'Salt must be a valid hex string')
    .refine(v => (v.length - 2) / 2 === 32, 'Salt must be 32 bytes long'),
})
void ComputeGuardedSaltInputSchema
type ComputeGuardedSaltInput = z.infer<typeof ComputeGuardedSaltInputSchema>
