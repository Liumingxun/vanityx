# @vanityx/cli

[English](./README.md) | 中文

---

一个用于搜索以太坊 CREATE2 vanity 地址的命令行工具。API 库请查看 [vanityx]。

- 支持 [CreateX] 盐值规则。
- 支持多线程并行搜索。
- 支持 Glob 通配符模式。

## 安装

```bash
bunx vanityx --help
# Or
bunx -p @vanityx/cli vanityx --help
```

如果你不想在本地[安装/使用 `Bun`][bun]，可以直接在 [releases] 下载预编译的二进制文件。

## 快速开始

### 子命令

- `search`：多线程搜索符合 pattern 的 CREATE2 地址。
- `completions`：生成 shell 自动补全脚本。

> [!TIP]
>
> 运行 `vanityx <command> --help` 查看每个子命令的详细参数。

### 示例

#### 使用 CreateX 工厂

如果使用 [CreateX] 工厂且未启用保护，直接运行：

```bash
vanityx search -i "$INITCODE_HASH" -p "$PATTERN"
```

#### 使用其他部署器

如果使用其他 factory / deployer，请显式指定：

```bash
vanityx search -i "$INITCODE_HASH" -p "$PATTERN" -d "$DEPLOYER"
```

#### CreateX：跨链 / 许可模式

启用 **crosschain**（需提供 `chainId`）：

```bash
vanityx search -i "$INITCODE_HASH" -p "$PATTERN" -x -c "$CHAIN_ID"
```

启用 **permissioned**（需提供 `msg.sender`）：

```bash
vanityx search -i "$INITCODE_HASH" -p "$PATTERN" -y -s "$SENDER"
```

同时启用：

```bash
vanityx search -i "$INITCODE_HASH" -p "$PATTERN" -xy -c "$CHAIN_ID" -s "$SENDER"
```

## Pattern 语法

`--pattern` 基于 Bun 的 [`Glob`][bun_glob] 语法匹配地址。常用写法：

- `0xcafe*`：前缀匹配。
- `0x*beef`：后缀匹配。
- `0x*bee?`：`?` 匹配单个十六进制字符。
- `0x{aa,bb}*`：多前缀可选。
- `0x[0-4][c-e]*`：字符集范围匹配。

> [!CAUTION]
>
> - `pattern` 合法性检查有限，请确保输入正确的 `glob` 模式。
> - 有效但错误的 `pattern` 可能导致无法匹配预期的地址，例如 `0xVVV*VVV`。
> - 注意添加 `*` 以避免过早固定地址长度，例如 `0x1234*` 而不是 `0x1234`。
> - `**` 和 `!` 在地址模式里没有特殊含义，不建议使用。

## 性能预期

搜索本质是随机采样：每固定 $n$ 个十六进制字符，期望尝试次数约 $16^n$。

- 例如：`0x1234*` 期望尝试约 $16^4 = 65,536$ 次。
- 具体性能参考[基准测试报告][benchmark]或运行[基准测试脚本][benchmark_script]。
- 实际耗时取决于 `threads` 和 CPU 主频等。

## Thanks

- [@cliffy/command](https://jsr.io/@cliffy/command) 提供优秀的 CLI 框架支持。

[bun]: https://bun.com/docs/installation 'Bun installation'
[bun_glob]: https://bun.sh/docs/runtime/glob 'Bun Glob documentation'
[createx]: /pcaversaccio/createx 'createx factory'
[vanityx]: /Liumingxun/vanityx/blob/main/README.md 'vanityx main package'
[releases]: /Liumingxun/vanityx/releases 'vanityx releases'
[benchmark]: /Liumingxun/vanityx/blob/main/BENCHMARK.md 'vanityx benchmark'
[benchmark_script]: /Liumingxun/vanityx/blob/main/package.json#L28 'vanityx benchmark script'
