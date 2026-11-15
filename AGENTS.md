# vanityx

A TypeScript library for searching Ethereum CREATE2 vanity addresses. The search engine is written in Go and shipped as a WebAssembly module.

## Project layout

```
wasm.go            Go entry point that exports the search functions to wasm
pkg/search/        the Go search engine (search.go) and its tests (*_test.go)
src/               TypeScript bindings: index.ts, types.ts
tests/             TypeScript tests (*.test.ts)
scripts/           prepare-go-wasm-helper.ts copies tinygo's wasm_exec.js into src/
vite.config.ts     Vite+ formatting, linting, packaging, and build tasks
```

## Commands

- `vp install` — install dependencies.
- `vp check` — format, lint, and type-check the project (`vp check --fix` auto-fixes).
- `vp run test` — build the wasm module, then run the TypeScript tests.
- `vp test` — run the TypeScript tests only; this requires `src/vanityx.wasm` to exist.
- `go test ./...` — run the Go tests.
- `vp run pack` — build the publishable bundle into `dist/`.
- `vp pack` — run the packer directly, without building the wasm module first.
- `vpx ./scripts/prepare-go-wasm-helper.ts` — refresh `src/wasm_exec.cjs` after upgrading TinyGo.

`vp test` is Vite+'s built-in Vitest command, while `vpr <script>` runs `package.json` scripts. Scripts cannot override built-in commands. `vp run <task>` runs a task defined under `run.tasks` in `vite.config.ts`, with dependency ordering and the task cache.

## Build model

`src/index.ts` imports `./vanityx.wasm?init` and `./wasm_exec.cjs`; both are generated and git-ignored. The `buildWasm` task in `vite.config.ts` regenerates them:

1. `scripts/prepare-go-wasm-helper.ts` copies `wasm_exec.js` from the installed TinyGo.
2. `tinygo build -target=wasm` compiles `wasm.go` and `pkg/search` into `src/vanityx.wasm`.

Both `pack` and `test` depend on `buildWasm`, so a clean checkout builds the module automatically. The task cache fingerprints the Go sources, `go.mod`, `go.sum`, and the helper script; pass `--no-cache` after upgrading TinyGo itself, which is not part of the fingerprint.

## Conventions

- TypeScript is ESM (`"type": "module"`); import local files with explicit `.ts` extensions (`allowImportingTsExtensions`).
- Tests import `describe`/`it`/`expect` from `vite-plus/test`.
- The public API is exported from `src/index.ts`; types live in `src/types.ts`.
- Go code must stay compilable for both `go test` and the TinyGo wasm target, so avoid packages TinyGo cannot build.
- The wasm memory layout is a contract between `wasm.go` (buffer sizes, status codes) and `src/index.ts`; change both together.

## Releases

Release automation follows [release-please] with a single package at the repository root:

- `release-please-config.json` and `.release-please-manifest.json` declare the package and its last released version.
- `.github/workflows/release-please.yml` opens and updates the release PR on every push to `main`.
- `.github/workflows/publish.yml` builds the wasm module from source and publishes to npm through trusted publishing when a GitHub release is published.
- `.github/workflows/ci.yml` runs the Go tests, `vp check`, and `vp run test`.

Commit messages must follow [Conventional Commits], because release-please derives the version bump and the changelog from them.

[release-please]: https://github.com/googleapis/release-please "release-please"
[conventional commits]: https://www.conventionalcommits.org/ "Conventional Commits"
