# wasm bridge

## Responsibility

Expose the Go search engine to JavaScript and keep the memory contract between `wasm.go` and the TypeScript bindings in sync.

## Code location

| Layer | Path | Note |
|---|---|---|
| wasm exports | `wasm.go` | Buffer pointers, `search`, result and error accessors |
| TypeScript bindings | `src/index.ts` | Input validation, buffer writes, status handling, runtime cache |
| Types | `src/types.ts` | `SearchConfig`, `Result`, `VanityxExports` |

## Memory contract

| Item | Size or value | Defined in |
|---|---|---|
| Pattern buffer | 512 bytes, UTF-8 | `patternBuf` / `PATTERN_BUFFER_SIZE` |
| Deployer buffer | 20 bytes | `deployerBuf` / `DEPLOYER_SIZE` |
| Initcode hash buffer | 32 bytes | `initcodeHashBuf` / `INITCODE_HASH_SIZE` |
| Status found | `0` | `statusFound` / `STATUS_FOUND` |
| Status not found | `1` | `statusNotFound` / `STATUS_NOT_FOUND` |
| Status error | `2` | `statusError` |
| Result payload | 64 hex chars of salt, `\n`, then `0x` plus 40 hex chars of address | `wasm.go` `search`, `parseResult` |
| Error payload | UTF-8 message | `errMsg` / `errorPtr` / `errorLen` |

Every row is duplicated on both sides; changing one side without the other breaks the contract silently.

## Key flow

1. `search(config)` validates `pattern` (string, at most 512 UTF-8 bytes), `deployer` (exactly 20 bytes), and `initcodeHash` (exactly 32 bytes). `parseHex` accepts an optional `0x` or `0X` prefix and rejects wrong lengths instead of padding.
2. `getRuntime()` instantiates the wasm module, starts the Go scheduler once, and caches the promise so later calls reuse it.
3. The bindings write the three inputs through `patternPtr`, `deployerPtr`, and `initcodeHashPtr`, then call `search(patternLen)`.
4. The memory view is recreated after the call because a search may grow wasm memory.
5. Status `0` is parsed by `parseResult`, which requires the newline at index 64 and validates both halves as hex; status `1` returns `null`; any other status throws an `Error` carrying the Go message.
6. A trap thrown by the wasm call clears the cached runtime, so the next call starts a fresh instance.

## Public API

| API | Entry | Note |
|---|---|---|
| `search(config)` | `src/index.ts` | Resolves to `{ salt, address }` or `null` when the nonce space is exhausted |
| `SearchConfig` | `src/types.ts` | `pattern`, `deployer`, `initcodeHash` |
| `Result` | `src/types.ts` | `salt` (`0x` plus 64 hex chars), `address` (EIP-55 checksummed) |
| `VanityxExports` | `src/types.ts` | Typed surface of the wasm instance exports |

## Known pitfalls

- `PATTERN_BUFFER_SIZE` in `src/index.ts` must match `patternBuf [512]byte` in `wasm.go`; a larger JS limit writes past the buffer.
- The Go side re-checks `patternLen` and returns status `2` with `pattern is too long`, so the JS and Go limits must stay aligned.
- `parseResult` assumes the separator is at index 64; changing the salt format in `wasm.go` requires updating the validator.
- `Result` declares an optional `guardedSalt`, but `parseResult` never populates it today; do not rely on the field.
- `src/wasm_exec.cjs` is generated from the installed TinyGo version; a mismatch with `src/vanityx.wasm` breaks runtime startup.
- `search()` blocks: browser callers should use a Web Worker, as the README states.

## Change log

| Date | Change | Reference |
|---|---|---|
| 2026-11-15 | Baseline documented from source | `wasm.go`, `src/index.ts`, `src/types.ts` |

## References

- [Search engine](../02-search-engine/README.md)
- [Build and release](../00-architecture/build-and-release.md)
- [moc.md](../moc.md)
