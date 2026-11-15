# Changelog

## 2.0.0

Initial release of the `next` line. `@vanityx/core` now derives addresses in Go and ships that engine as a WebAssembly module, instead of relying on a Bun runtime.

### Breaking changes

- Requires no Bun runtime: the package runs on any Node.js 22.10+ or edge runtime with WebAssembly support.
- The single entry point is `search(config)` returning a promise, replacing the iterator-first `searchVanity()` API.

### Features

- `search()` finds a CREATE2 salt whose address matches a hex prefix, a suffix, or a glob pattern.
- The Go runtime is created once and reused across calls, so repeated searches skip the instantiation cost.
- Inputs are validated before they reach wasm memory, and malformed results surface as exceptions.
