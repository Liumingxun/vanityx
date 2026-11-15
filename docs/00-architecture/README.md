# Architecture

## Tech stack

- TypeScript (ESM, `"type": "module"`), published as `@vanityx/core`.
- Go search engine compiled to WebAssembly with TinyGo (`-target=wasm -scheduler=none --no-debug`).
- Ethereum primitives from `github.com/luxfi/geth/common` and `github.com/luxfi/crypto`; glob matching from `github.com/gobwas/glob`.
- Build, format, lint, test, and pack run through Vite+ (`vp`); the package manager is pnpm.
- Tests: Go tests with `go test ./...`, TypeScript tests with Vitest through `vp test`.

## Module division

| Module | Responsibility | Code location |
|---|---|---|
| TypeScript API | Validates inputs, writes wasm buffers, interprets status codes, caches the runtime | `src/index.ts`, `src/types.ts` |
| wasm entry point | Exports buffer pointers and `search`, translates Go results and errors | `wasm.go` |
| Search engine | Derives CREATE2 addresses, iterates nonces, matches patterns | `pkg/search/search.go` |
| wasm build helper | Copies `wasm_exec.js` from the installed TinyGo into `src/` | `scripts/prepare-go-wasm-helper.ts` |
| Build tasks | Wires `buildWasm`, `test`, and `pack` with dependency ordering and caching | `vite.config.ts` |

## Key constraints

- Go code must compile for both `go test` and the TinyGo wasm target: no cgo, no packages TinyGo cannot build.
- The wasm memory layout is a contract between `wasm.go` and `src/index.ts` (buffer sizes, status codes, payload shape); change both sides together.
- `src/wasm_exec.cjs` and `src/vanityx.wasm` are generated and git-ignored; a clean checkout builds them through `buildWasm`.
- Local TypeScript imports use explicit `.ts` extensions (`allowImportingTsExtensions`).
- A single `search()` call blocks until a match is found or the nonce space is exhausted, so long patterns belong in a Web Worker.
- Commit messages must follow Conventional Commits because release-please derives the version and changelog from them.

## Verification

- `go test ./...` — engine and matcher tests in `pkg/search/search_test.go`.
- `vp run test` — builds the wasm module, then runs `tests/vanityx.test.ts`.
- `vp check` — format, lint, and type-check (including the `vp check --fix` staged hook).
- CI runs all three in `.github/workflows/ci.yml`.

## Key decisions

> Dates below are when a decision was recorded in this knowledge base, not necessarily when it was made.

| Date | Decision | Reason | Alternative |
|---|---|---|---|
| 2026-11-15 | Keep the hot keccak256 loop in Go compiled to wasm | Random sampling performs many hash rounds per second; the compiled loop outperforms a JavaScript one | Pure TypeScript implementation |
| 2026-11-15 | Instantiate the wasm runtime once and reuse it | Go scheduler startup and module instantiation cost more than a short search | Instantiate per call |
| 2026-11-15 | Seed each search with 24 random salt bytes plus a 64-bit nonce | Keeps the hasher allocation-free while avoiding salt reuse across searches | Random 32-byte salt per attempt |
| 2026-11-15 | Build the wasm module from source in the Vite+ task graph | No committed binary, and the task cache fingerprints the Go inputs | Commit a prebuilt wasm file |
| 2026-11-15 | Publish through release-please and npm trusted publishing | Version, changelog, and release stay derived from commits without a stored npm token | Manual version bumps and tokens |

## References

- Public documentation: `README.md`
- Build and release details: [build-and-release.md](./build-and-release.md)
- Knowledge base index: [moc.md](../moc.md)
