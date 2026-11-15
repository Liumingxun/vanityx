# Build and release

## Build pipeline

1. `scripts/prepare-go-wasm-helper.ts` copies `wasm_exec.js` from the installed TinyGo into `src/wasm_exec.cjs`.
2. `tinygo build -target=wasm -o=./src/vanityx.wasm -scheduler=none --no-debug .` compiles `wasm.go` and `pkg/search` into `src/vanityx.wasm`.
3. `src/index.ts` imports `./vanityx.wasm?init` and `./wasm_exec.cjs`; `rolldown-plugin-wasm` with `targetEnv: "node"` bundles both into `dist/`.

Both generated files are git-ignored, so a clean checkout builds them on demand.

## Vite+ tasks

| Task | Command | Depends on | Cache |
|---|---|---|---|
| `buildWasm` | `vpx ./scripts/prepare-go-wasm-helper.ts` then `tinygo build ...` | — | Inputs: `wasm.go`, `pkg/**/*.go`, `go.mod`, `go.sum`, `scripts/prepare-go-wasm-helper.ts`; outputs: `src/wasm_exec.cjs`, `src/vanityx.wasm` |
| `test` | `vp test` | `buildWasm` | Disabled |
| `pack` | `vp pack` | `clean`, `buildWasm` | Disabled |

`clean` is a `package.json` script (`rm -rf dist`), not a task.

Command entry points:

- `vp run test` builds the wasm module first; `vp test` is the built-in Vitest command and only works when `src/vanityx.wasm` already exists.
- `vp run pack` builds the publishable bundle; `vp pack` runs the packer without building the wasm module.
- `vpr <script>` runs `package.json` scripts; scripts cannot override built-in Vite+ commands.

## Cache caveat

The TinyGo version is not part of the `buildWasm` fingerprint. Pass `--no-cache` after upgrading TinyGo, otherwise a stale wasm binary and `wasm_exec.cjs` pair is reused and the bindings may break.

## Release automation

| File | Role |
|---|---|
| `release-please-config.json`, `.release-please-manifest.json` | Declare the single root package and its last released version |
| `.github/workflows/release-please.yml` | Opens and updates the release PR on every push to `main` |
| `.github/workflows/publish.yml` | Builds the wasm module from source and publishes to npm through trusted publishing when a GitHub release is published |
| `.github/workflows/ci.yml` | Runs `go test ./...`, `vp check`, and `vp run test` |

The version bump and changelog are derived from Conventional Commits, so commit message prefixes are functional, not cosmetic.

## Known pitfalls

- `package.json` ships only `dist`, so the wasm module must be bundled during `vp pack`; publishing without the built module produces a broken package.
- `test` and `pack` disable the Vite+ cache, so their `buildWasm` dependency is re-evaluated on every run.
- A stale `src/wasm_exec.cjs` after a TinyGo upgrade breaks the Go runtime glue; refresh it with `vpx ./scripts/prepare-go-wasm-helper.ts`.

## References

- [Architecture overview](./README.md)
- [moc.md](../moc.md)
