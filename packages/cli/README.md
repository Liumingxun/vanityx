# @vanityx/cli

English | [中文](./README.zh-cn.md)

---

A command-line tool for searching Ethereum **CREATE2** contract addresses.

- Supports [CreateX] salt rules.
- Supports multi-threaded parallel search.
- Supports wildcard descriptions via glob patterns.

## Installation

```bash
bunx vanityx --help
# Or
bunx -p @vanityx/cli vanityx --help
```

If you prefer not to [install/use `Bun`][bun] locally, you can download pre-compiled binaries from the repository [releases].

## Quick Start

### Subcommands

- `search`: Multi-threaded search for CREATE2 addresses matching a pattern.
- `completions`: Generate shell auto-completion scripts.

> [!TIP]
> Run `vanityx <command> --help` to view detailed usage and parameter descriptions for each subcommand.

### Examples

#### Using CreateX Factory

If you are using the [CreateX] factory without enabling any protections, simply run:

```bash
vanityx search -i "$INITCODE_HASH" -p "$PATTERN"
```

#### Using Other CREATE2 Deployers

If you use a different factory / deployer, specify it explicitly:

```bash
vanityx search -i "$INITCODE_HASH" -p "$PATTERN" -d "$DEPLOYER"
```

#### CreateX: Permissioned / Crosschain

To enable **crosschain**, provide the `chainId`:

```bash
vanityx search -i "$INITCODE_HASH" -p "$PATTERN" -x -c "$CHAIN_ID"
```

To enable **permissioned**, provide the `msg.sender`:

```bash
vanityx search -i "$INITCODE_HASH" -p "$PATTERN" -y -s "$SENDER"
```

To enable both:

```bash
vanityx search -i "$INITCODE_HASH" -p "$PATTERN" -xy -c "$CHAIN_ID" -s "$SENDER"
```

## Pattern Syntax

`--pattern` matches target addresses based on Bun's supported [Glob][bun_glob] syntax. Common patterns:

- `0xcafe*`: Prefix match.
- `0x*beef`: Suffix match.
- `0x*bee?`: `?` matches a single hexadecimal character.
- `0x{aa,bb}*`: Multiple prefix options.
- `0x[0-4][c-e]*`: Character set range match.

> [!CAUTION]
>
> - Validity checks for `pattern` are limited. Ensure you input a correct `glob` pattern.
> - A valid but incorrect `pattern` may fail to match expected addresses (e.g., `0xVVV*VVV`).
> - Remember to append `*` to avoid fixing the address length prematurely (e.g., use `0x1234*` instead of `0x1234`).
> - `**` and `!` have no special meaning in address patterns and are untested.

## Performance & Expectations

Searching is essentially random sampling: for a fixed $n$ hexadecimal characters (prefix/suffix), the expected number of attempts is approximately $16^n$.

- Example: For `0x1234*`, the expected attempts are $16^4 = 65,536$.
- For specific performance metrics, refer to the [benchmark report][benchmark] or run the [benchmark script][benchmark_script] included in the main package.
- Actual time depends on `threads`, CPU frequency, etc.

## Thanks

- [@cliffy/command](https://jsr.io/@cliffy/command) for the excellent CLI framework.

[bun]: https://bun.com/docs/installation 'Bun installation'
[bun_glob]: https://bun.sh/docs/runtime/glob 'Bun Glob documentation'
[createx]: https://github.com/pcaversaccio/createx 'createx factory'
[releases]: https://github.com/Liumingxun/vanityx/releases 'vanityx releases'
[benchmark]: https://github.com/Liumingxun/vanityx/blob/main/BENCHMARK.md 'vanityx benchmark'
[benchmark_script]: https://github.com/Liumingxun/vanityx/blob/main/package.json#L28 'vanityx benchmark script'
