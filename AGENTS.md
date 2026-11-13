# Hardhat + vite-plus project

## Project layout

```
contracts/        Solidity contracts (*.sol) and Solidity tests (*.t.sol)
tests/            TypeScript integration tests (*.test.ts)
ignition/         Hardhat Ignition deployment modules
scripts/          Standalone scripts run with `vpx hardhat run`
shared/           Shared TypeScript helpers used by tests and scripts
hardhat.config.ts
vite.config.ts    Vite+ formatting, linting, and staged-file configuration
```

## Commands

- `vp install` — install dependencies.
- `vp check` — format, lint, and type-check the project (`vp check --fix` auto-fixes).
- `vpr test` — run the TypeScript tests with Vitest only.
- `vpx hardhat test` — run all Solidity and TypeScript tests through Hardhat.
- `vpx hardhat test solidity` / `vpx hardhat test nodejs` — run a single test suite.
- `vpx hardhat build` — compile contracts and generate TypeScript artifacts.
- `vpx hardhat run scripts/query-acct.ts` — run a standalone script.
- `vpx hardhat ignition deploy ignition/modules/Counter.ts` — deploy with Ignition.

`vp test` is Vite+'s built-in Vitest command, while `vpr test` runs the `test` package script (`vpx hardhat test`). Scripts cannot override built-in commands, so use `vpr <script>` for package scripts, for example `vpr build`.

## Working in this project

When writing or modifying tests, configuring `hardhat.config.ts`, or interacting with the network from TypeScript, invoke the **`hardhat`** skill. It covers Solidity and TypeScript testing, how to choose between them, `forge-std` cheatcodes, the `network.create()` API, `networkHelpers`, and the compile-then-typecheck workflow. The skill itself points to the matching `hardhat-toolbox-*` skill for toolbox-specific guidance (clients, contract interaction, assertions).

Conventions:

- TypeScript is ESM (`"type": "module"`); import local files with explicit `.ts` extensions (`allowImportingTsExtensions`).
- TypeScript tests import `describe`/`it`/`expect`/`assert` from `vite-plus/test` and create a network with `network.create()`, using the viem clients and assertions returned by the toolbox.
- Solidity tests live next to the contract and import `forge-std/Test.sol`.
- After changing contracts, run `vpx hardhat build` before type-checking so generated artifacts and types are up to date.

## Docs

- Hardhat 3 — https://hardhat.org/llms.txt
- viem — https://viem.sh/llms.txt
- Vite+ — https://viteplus.dev/guide/ (local docs in `node_modules/vite-plus/docs`)

<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Built-in Commands vs Scripts

`vp <name>` runs a built-in command. `vpr <name>` runs a `package.json` script or a `vite.config.ts` task. Scripts cannot overwrite built-ins, so `vp dev` and `vpr dev` may do different things. Check `package.json` and `vite.config.ts` first, and run `vpr <name>` when the project defines a script or task with that name.

## Running Scripts

Run TypeScript and JavaScript files with `vpx <file>`, for example `vpx ./scripts/seed.ts --dry-run`. It handles enums, decorators, JSX, and tsconfig `paths`, so do not add `tsx` or `ts-node` to run scripts. `vpx --watch <file>` reruns the file when a file it uses changes, in place of `tsx watch`. `vp node <file>` runs plain Node.js.

## Tool Versions

Run `vp toolchain` to show versions and relationships in the active Vite+
release. Add a tool name to select part of the graph. For example, run
`vp toolchain vite`. Use `--global` to ignore the local `vite-plus` package. Use
`vp why <package>` to show the package-manager dependency graph.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vpr <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->
