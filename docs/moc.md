---
kb_language: English
created: 2026-11-15
numbering: 00-architecture, 01-work-log, 02-search-engine, 03-wasm-bridge
vcs: project-repository
---

# vanityx knowledge base index

> This page is the only entry point of the knowledge base. Read it first, then open the specific directory; do not scan the whole knowledge base.

## Directory structure

| Directory | Topic | Description | When to read |
|---|---|---|---|
| [00-architecture](./00-architecture/) | Architecture | Tech stack, module boundaries, constraints, build and release model | Before changing cross-module behavior or the build pipeline |
| [01-work-log](./01-work-log/) | Work log | Short topic-based records of changes, decisions, and pitfalls | When tracing recent changes |
| [02-search-engine](./02-search-engine/) | Search engine | CREATE2 address derivation, nonce loop, pattern matching | Before changing the Go search loop or matcher |
| [03-wasm-bridge](./03-wasm-bridge/) | wasm bridge | Go/TypeScript memory contract, exports, public API | Before touching `wasm.go` or `src/index.ts` |

## Module quick reference

| Module | Keywords | Code location | Doc entry |
|---|---|---|---|
| TypeScript API | `search`, hex validation, runtime reuse, status codes | `src/index.ts`, `src/types.ts` | [03-wasm-bridge/README.md](./03-wasm-bridge/README.md) |
| wasm entry point | exported pointers, pattern buffer, `salt\naddress` payload | `wasm.go` | [03-wasm-bridge/README.md](./03-wasm-bridge/README.md) |
| Search engine | CREATE2, keccak256, nonce loop, prefix/suffix/glob matcher | `pkg/search/search.go` | [02-search-engine/README.md](./02-search-engine/README.md) |
| Build and release | `buildWasm`, TinyGo, Vite+ tasks, release-please, npm publish | `vite.config.ts`, `scripts/prepare-go-wasm-helper.ts`, `.github/workflows/` | [00-architecture/build-and-release.md](./00-architecture/build-and-release.md) |
| Tests | Go tests, Vitest tests, `vp run test` | `pkg/search/search_test.go`, `tests/vanityx.test.ts` | [00-architecture/README.md](./00-architecture/README.md#verification) |

## Retrieval path

1. Locate the module or topic in the tables above.
2. Open the corresponding document.
3. Follow the code locations listed in that document to the real files.
4. Cross-check against the code before relying on a conclusion.

## Maintenance

- At most 10 numbered directories (`00`–`09`); adding or removing one requires updating this page.
- Language is fixed to `English`; new content must not mix in other languages (code, commands, paths, and third-party names stay verbatim).
- Work log files are named `01-work-log/<short-topic>.md`, where the topic is a short lowercase kebab-case slug (for example `kb-init.md`).
- Freshness: the base is tracked by the project repository, so `git status --short` shows uncommitted changes.
- Last updated: 2026-11-15
