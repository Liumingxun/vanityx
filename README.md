# vanityx

Search Ethereum `CREATE2` vanity addresses from TypeScript. The search engine is written in Go and packaged as a WebAssembly module, so the library runs on Node.js and other runtimes without a Go toolchain.

- You provide: `pattern` + `deployer` + `initcodeHash`
- You get: the matching `salt` and the resulting contract address

## Highlights

- **Fast engine**: the hot loop runs in Go, compiled to wasm.
- **Simple patterns**: match a hex prefix (`"dead"`), a suffix (`"*beef"`), or a glob.
- **Small API**: one `search()` function.
- **Runtime reuse**: the wasm runtime is instantiated once and shared by later calls.

## Installation

```bash
pnpm add @vanityx/core
# or
npm install @vanityx/core
```

## Quick start

```ts
import { search } from "@vanityx/core";

const result = await search({
  pattern: "cafe",
  deployer: "0x1111111111111111111111111111111111111111",
  initcodeHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
});

console.log(result?.salt, result?.address);
```

## Pattern syntax

`pattern` is matched against the lowercase hex address without its `0x` prefix. An optional `0x` prefix is accepted and ignored.

- `"cafe"`: prefix match.
- `"*beef"`: suffix match.
- `""` or `"*"`: match any address.
- `"[0-4]cafe"`: character ranges, braces, and `?` use glob syntax.

Searching is random sampling: for a fixed $n$ hexadecimal characters the expected number of attempts is about $16^n$, so longer patterns take exponentially longer.

## API

### `search(config)`

Searches for a CREATE2 salt whose address matches `config.pattern`.

- `config.pattern` is a string matched against the address, with the syntax above.
- `config.deployer` is the CREATE2 deployer address, as a 20-byte hex string.
- `config.initcodeHash` is `keccak256` of the initcode, as a 32-byte hex string.

Returns `{ salt, address }` when a match is found, or `null` if the nonce space is exhausted. A single search blocks until it finds a match, so long patterns should be searched from a Web Worker.

## Requirements

- Node.js 22.10 or newer, or any runtime that supports WebAssembly.

## Project layout

```
wasm.go           the Go entry point exported to wasm
pkg/search/       the Go search engine and its tests
src/              TypeScript bindings around the wasm module
tests/            TypeScript tests
scripts/          helper that copies the tinygo wasm_exec.js glue
```

## Development

```bash
vp install
vp check      # format, lint, and type-check
vp run test   # build the wasm module, then run the TypeScript tests
go test ./... # run the Go tests
vp run pack   # build the publishable bundle into dist/
```

The wasm module is built with [TinyGo]; `vp run pack` and `vp run test` build it automatically when the Go sources change.

## Releases

Commits follow the [Conventional Commits] specification. Merging a release PR from [release-please] bumps the version, updates this changelog, and tags the release; publishing the GitHub release then publishes the package to npm.

[tinygo]: https://tinygo.org/ "TinyGo"
[conventional commits]: https://www.conventionalcommits.org/ "Conventional Commits"
[release-please]: https://github.com/googleapis/release-please "release-please"
