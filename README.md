# Hardhat + Vite+ Template

A starter template for EVM smart contract projects built on [Hardhat 3](https://hardhat.org/) with viem, Hardhat Ignition, and [Vite+](https://viteplus.dev/guide/) (`vp`) for dependency management, formatting, linting, type checking, and TypeScript tests with Vitest.

## Requirements

- Node.js 22.10 or newer.
- pnpm 12 (declared in `devEngines`; Vite+ installs it automatically when needed).
- The Vite+ CLI (`vp`).

## Getting started

```bash
vp install
```

## Project layout

```
contracts/        Solidity contracts and Solidity tests (*.t.sol)
tests/            TypeScript integration tests (*.test.ts)
ignition/         Hardhat Ignition deployment modules
scripts/          Standalone scripts run with `vpx hardhat run` / `vpr run`
shared/           Shared TypeScript helpers
hardhat.config.ts
vite.config.ts
```

## Commands

| Command                                  | Description                                          |
| ---------------------------------------- | ---------------------------------------------------- |
| `vp install`                             | Install dependencies.                                |
| `vpr check`                              | Format, lint, and type-check the project.            |
| `vpr check --fix`                        | Auto-fix formatting and lint issues.                 |
| `vpr test`                               | Run all tests with `hardhat test`.                   |
| `vpr test:solidity`                      | Run only the Solidity tests.                         |
| `vpr test:node`                          | Run only the TypeScript tests through Hardhat.       |
| `vpr build`                              | Compile contracts and generate TypeScript artifacts. |
| `vpr run scripts/query-acct.ts`          | Run a standalone script.                             |
| `vpr deploy ignition/modules/Counter.ts` | Deploy with Ignition.                                |

`vp test` is Vite+'s built-in Vitest command, while `vpr test` runs the `test` package script (`vpx hardhat test`). Use `vpr <script>` for package scripts, for example `vpr build`.
