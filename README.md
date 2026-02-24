# VanityX

A TypeScript toolkit for hunting Ethereum CREATE2 vanity (and CreateX-guarded) contract addresses.

## Why this exists

- **CREATE2 without footguns** – all inputs are validated upfront through `zod`, so malformed hex, mixed-case deployers, or mismatched chains fail fast.
- **CreateX-aware salts** – native support for the [CreateX Guard factory](packages/createx_guard/README.md), including permissioned and crosschain modifiers.
- **Composable core** – a deterministic generator (`searchVanityIterator`) that you can plug into GUIs, CLIs, workers, or distributed search pools.
- **Pragmatic pattern matching** – leverages Bun's `Glob` so you can describe vanity rules with wildcards instead of hand-rolled regexes.

## Installation

```bash
pnpm add vanityx
# or
npm install vanityx
```

> Runtime target: Node 20+ or Bun 1.1+. The search loop uses `crypto.getRandomValues` and `performance.now`, both available in modern runtimes.

## Quick start

```ts
import { searchVanity } from 'vanityx'

const result = searchVanity({
  pattern: '0x1234*', // hex glob; * and ? are allowed
  deployer: '0xba5ed099633d3b313e4d5f7bdc1305d3c28ba5ed',
  msgSender: '0xabc123abc123abc123abc123abc123abc123abcd',
  initcode: '0x600060005560016000f3',
  createxOpts: {
    permissioned: true,
    crosschain: true,
  },
  chainId: 10,
})

if (result) {
  console.log('Salt:', result.salt)
  console.log('Guarded salt (if CreateX):', result.guardedSalt)
  console.log('Address:', result.address)
}
```

### Streaming progress

```ts
import { searchVanity } from 'vanityx'

const found = searchVanity(
  {
    pattern: '0x*dead',
    deployer: '0x1234...beef',
    msgSender: '0xbeef...cafe',
    initcodeHash: '0x9a54...'
  },
  {
    progressInterval: 5_000,
    onProgress: ({ attemptsPerSec }) => {
      console.log('Speed', attemptsPerSec.toFixed(0), 'addr/s')
      return true // return false to stop early
    },
  },
)
```

## API surface

### `searchVanity(input, options?)`

- Validates `input` with `SearchVanityArgsSchema` and performs the search loop.
- Returns `{ salt, guardedSalt?, address }` or `null` when aborted via `onProgress`.

### `searchVanityIterator(config)`

- Low-level generator when you need full control over scheduling, distribution, or deterministic replay.
- Emits `{ salt, guardedSalt?, address, attempts, timeMs }` for each random salt.

### `SearchVanityArgsSchema`

- Re-exported zod schema if you need compile-time inference or upstream validation.
- Accepts either `initcode` (auto-hashed with `keccak256`) or a precomputed `initcodeHash`.

## Data model & guards

| Field                      | Notes                                                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `pattern`                  | Hex glob (must start with `0x`). Wildcards run through Bun `Glob`, so `?` matches a nibble, `[]` ranges work, etc. |
| `deployer`                 | Normalized to lower-case via `createx_guard`'s `AddressSchema`.                                                    |
| `msgSender`                | Converted to bytes; only needed when you set `permissioned`.                                                       |
| `chainId`                  | Required when `createxOpts.crosschain` is `true` for the CreateX factory.                                          |
| `createxOpts.permissioned` | Prefixes the salt with `msgSender` (20 bytes) so the Guard contract approves it.                                   |
| `createxOpts.crosschain`   | Marks the salt suffix so the Guard contract emits cross-chain proofs; incompatible without `chainId`.              |

### Salt layout

- Vanilla CREATE2 paths leave the 32-byte salt fully random.
- Permissioned salts: bytes `[0..19]` are the sender, the remainder is random.
- Crosschain salts: byte `20` is set to `0x01` to signal the Guard contract.
- Combined mode: both rules apply before `computeGuardedSalt` wraps the final salt passed to CREATE2.

## Performance notes

- Every loop iteration makes exactly one `getContractAddress` call and one `crypto.getRandomValues` invocation.
- Progress stats compute attempts/sec via `attempts / timeMs`. If you need moving averages, wrap `onProgress` and store your own counters.
- Benchmarks live under `bench/*.bench.ts` and run with `pnpm bench` (uses `mitata`).

## Developing locally

```bash
pnpm install
pnpm bench        # micro benchmarks
pnpm build        # emits dist/ via tsdown
pnpm test         # run workspace tests (see packages/*)
```

- Source is plain TypeScript under `src/`.
- Build output is handled by [`tsdown`](https://github.com/egoist/tsdown) so the published package stays ESM-first with type definitions.
- Additional helpers live under `packages/` (`createx_guard`, CLI wrappers, Hardhat testcases).
