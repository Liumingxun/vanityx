# vanityx

English | [中文](./README.zh-cn.md)

---

Search Ethereum `CREATE2` vanity addresses with TypeScript on the [Bun] runtime. `vanityx` also supports [CreateX] salt rules out of the box.

- You provide: `pattern` + `deployer` + `initcode` or `initcodeHash`
- You get: the matching `salt` or `guardedSalt` and the resulting contract address

> Looking for a ready-to-run tool? See [@vanityx/cli].

## Highlights

- **Iterator-first**: exposes iterators so you can plug in your own parallelization, distribution, or stopping logic
- **CreateX support**: handles guarded salt for both permissioned and crosschain modes
- **Simple patterns**: uses Bun `Glob` to match `0x…` address strings
- **Small API**: one `searchVanity()` with an optional progress callback

## Runtime requirements

This package uses Bun `Glob` at runtime for pattern matching, so it needs Bun to run.

If you want a tool with multi-threaded parallel search, download the prebuilt binaries from [releases] or use the CLI docs at [@vanityx/cli].

## Installation

```bash
pnpm add @vanityx/core
# or
bun add @vanityx/core
```

## Quick start

### CreateX for permissioned and crosschain

When `deployer` is the CreateX factory address and protections are enabled, `vanityx` follows CreateX rules and returns `guardedSalt`.

```ts
import { searchVanity } from '@vanityx/core'
import { CREATEX_FACTORY_ADDRESS } from '@vanityx/core/schema'

const result = searchVanity({
  pattern: '0x1234*',
  deployer: CREATEX_FACTORY_ADDRESS,
  initcodeHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
  createxOpts: {
    crosschain: { chainId: 1 },
    permissioned: { msgSender: '0x0000000000000000000000000000000000000000' },
  },
})

console.log(result)
```

### Standard CREATE2 for other deployers

```ts
import { searchVanity } from '@vanityx/core'

const result = searchVanity({
  pattern: '0xcafe*',
  deployer: '0x0000000000000000000000000000000000000000',
  initcodeHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
}, {
  progressInterval: 50_000,
  onProgress: ({ attempts, timeMs }) => {
    console.log(`Tried ${attempts} salts in ${timeMs}ms...`)
  },
})

console.log(result)
```

## Pattern Syntax

`pattern` matches target addresses based on Bun's supported [Glob][bun_glob] syntax. Common patterns:

- `0xcafe*`: Prefix match.
- `0x*beef`: Suffix match.
- `0x*bee?`: `?` matches a single hexadecimal character.
- `0x{aa,bb}*`: Multiple prefix options.
- `0x[0-4][c-e]*`: Character set range match.

> [!CAUTION]
>
> - Validity checks for `pattern` are limited. Ensure you input a correct `glob` pattern.
> - A valid but incorrect `pattern` may fail to match expected addresses (e.g., `0xVVV*VVV`).
> - Remember to append `*` to avoid fixing the address length prematurely (e.g., use `0x1234*` instead of `0x1234`).
> - `**` and `!` have no special meaning in address patterns and are untested.

## API overview

### `searchVanity(input, options?)`

- Input
  - `pattern` must start with `0x`
  - `deployer` is the CREATE2 deployer address used for address derivation
  - `initcode` or `initcodeHash` is required
  - `createxOpts` enables CreateX protections. It only takes effect when `deployer === CREATEX_FACTORY_ADDRESS`
- Output
  - Returns `{ salt, address, guardedSalt? }` when a match is found
  - Returns `null` when `onProgress` returns `false`

### Iterators

If you want full control over the search loop, use iterators directly:

- `standardIterator()` yields standard CREATE2 attempts
- `createXIterator()` yields CreateX attempts and includes `guardedSalt`

## Performance & Expectations

Searching is essentially random sampling: for a fixed $n$ hexadecimal characters, the expected number of attempts is approximately $16^n$.

- Example: For `0x1234*`, the expected attempts are $16^4 = 65,536$.
- For specific performance metrics, refer to the [benchmark report][benchmark] or run the [benchmark script][benchmark_script].

## FAQ

### How should I use `guardedSalt`?

Usually you don't need to use `guardedSalt` directly, it's mainly an informational field.

This concept primarily exists for CreateX internal scenarios and isn't very meaningful for most users. When deploying the contract, you can just use `salt`.

### Why does it not run on Node.js?

It uses Bun `Glob` at runtime, and Node does not provide that API.

- Use the CLI prebuilt binaries from [releases]
- Or consume the iterators and run your own matcher in Node

### Can it guarantee when I will find a match?

No. It is random sampling, and you only get an expected number of attempts. Longer prefixes or suffixes grow exponentially.

## Project layout

- `src/` core library code, including `searchVanity`, iterators, and schema
- `types/` exported TypeScript types
- `packages/cli/` CLI tool built on top of the core library
- `packages/createx_guard/` CreateX guarded salt implementation
- `packages/createx_guard_hh/` hardhat test project for `createx_guard`
- `bench/` benchmark scripts

[createx]: https://github.com/pcaversaccio/createx 'createx factory'
[bun]: https://bun.com/docs/installation 'Bun installation'
[bun_glob]: https://bun.sh/docs/runtime/glob 'Bun Glob documentation'
[releases]: https://github.com/Liumingxun/vanityx/releases 'vanityx releases'
[@vanityx/cli]: https://github.com/Liumingxun/vanityx/blob/main/packages/cli/README.md 'vanityx CLI'
[@vanityx/createx_guard]: https://github.com/Liumingxun/vanityx/blob/main/packages/createx_guard/README.md 'vanityx CreateX Guarded Salt'
[benchmark]: https://github.com/Liumingxun/vanityx/blob/main/BENCHMARK.md 'vanityx benchmark'
[benchmark_script]: https://github.com/Liumingxun/vanityx/blob/main/package.json#L28 'vanityx benchmark script'
