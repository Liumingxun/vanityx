/**
 * A utility module for computing guarded salts based on specific input parameters, following the rules defined in the CreateX contract. This module provides a function to compute the guarded salt and includes schema validation to ensure correct input formats.
 * @example
 * ```ts
 * import type { ComputeGuardedSaltInput } from 'createx_guard'
 * import { computeGuardedSalt } from 'createx_guard'
 *
 * const exampleInput: ComputeGuardedSaltInput = {
 *   salt: '0x0000000000000000000000000000000000000000000000000000000000000000',
 *   msgSender: '0x1111111111111111111111111111111111111111',
 *   chainId: 1,
 * }
 * computeGuardedSalt(exampleInput)
 * ```
 * @module
 */
export * from '@/compute.ts'
