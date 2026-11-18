# vanityx

A TypeScript library for searching Ethereum CREATE2 vanity addresses. The search engine is written in Go and shipped as a WebAssembly module.

## Project layout

```
wasm.go            Go entry point that exports the search functions to wasm
pkg/search/        the Go search engine (search.go) and its tests (*_test.go)
cmd/vanityx/       multi-goroutine CLI wrapper around the engine
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
- `go run ./cmd/vanityx -pattern cafe -deployer 0x4e59b44847b379578588920ca78fbf26c0b4956c -initcode-hash 0x0000000000000000000000000000000000000000000000000000000000000000 -workers 8` — run the CLI with multiple search goroutines; `-pattern`, `-deployer`, and `-initcode-hash` are required.
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
- Multi-goroutine orchestration lives in `cmd/vanityx`; `pkg/search` stays single-threaded so the wasm target still builds with TinyGo's `-scheduler=none`.
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

## Knowledge base

- Path: `docs/` — tracked by this repository, committed together with the code.
- Entry: `docs/moc.md`
- Language: English
- Retrieval order: project code → this file → `AGENTS.local.md` → `docs/moc.md` → module documents

## Memory loop

- Before coding: read `docs/moc.md` to locate the module, read 1–3 related documents, then read 1–3 implementation files; stop once the target files are identified.
- After coding: record architecture decisions in this file or `docs/00-architecture/`; append changes and pitfalls to `docs/01-work-log/<short-topic>.md`, using a short kebab-case topic such as `kb-init.md`; extract a reusable pattern into a skill once it appears twice or more.
- Distill weekly or every 30 tasks: promote conclusions that repeat three times or more into this file or `docs/00-architecture/`, and mark superseded entries instead of deleting them silently.
- Conflicts: code wins; fix the stale document in the same change.
