# vanityx CLI

一个用于搜索以太坊 **CREATE2** 合约地址的命令行工具。

- 支持 [CreateX] 盐值规则。
- 支持通过多线程并行搜索。
- 支持使用通配符描述。

> 这是 `vanityx` 主库的 CLI 封装；核心搜索逻辑在 workspace 根包 `vanityx` 中。

## 安装

```bash
bunx vanityx --help
# Or
bunx -p @vanityx/cli vanityx --help
```

如果你不希望本地[安装/使用 `Bun`][bun]，可以在本仓库 [releases] 下载预编译的二进制文件。

## 快速开始

### 子命令

- `search`：多线程搜索满足 pattern 的 CREATE2 地址。
- `completions`：生成 shell 自动补全脚本。

> ![TIP]
> 运行 `vanityx <command> --help` 查看每个子命令的详细用法和参数说明。

### 示例

#### 使用 CreateX 工厂

如果你使用的是 [CreateX] 工厂，并且不启用任何保护，直接运行：

```bash
vanityx search -i "$INITCODE_HASH" -s "$SENDER" -p '0xab*'
```

#### 使用其他 CREATE2 部署器

如果你使用的是其他 factory / deployer，请显式指定：

```bash
vanityx search -i "$INITCODE_HASH" -s "$SENDER" -p '0xab*' -d "$DEPLOYER"
```

#### CreateX：permissioned / crosschain

启用 **crosschain**，需要提供 `chainId`：

```bash
vanityx search -i "$INITCODE_HASH" -s "$SENDER" -p '0x1234*' -x -c 1
```

启用 **permissioned**：

```bash
vanityx search -i "$INITCODE_HASH" -s "$SENDER" -p '0x1234*' -y
```

两者同时启用：

```bash
vanityx search -i "$INITCODE_HASH" -s "$SENDER" -p '0x1234*' -xy -c 1
```

## 参数说明（search）

```bash
vanityx search \
    --initcode-hash "<hash>" \
    --sender "<address>" \
    --pattern "<glob>" \
    [--deployer "<address>"] \
    [--permissioned] \
    [--crosschain --chain-id "<id>"]
    [--threads "<n>"] \
```

- `-i, --initcode-hash "<hash>"`：必填，`initcode` 的 `keccak256` 哈希值。
- `-s, --sender "<address>"`：必填，部署交易的 `msg.sender`。当启用 `--permissioned` 时，它会参与 Guard salt 前缀。
- `-p, --pattern "<glob>"`：必填，地址匹配规则（必须以 `0x` 开头）。
- `-d, --deployer "<address>"`：可选，CREATE2 factory / deployer 地址。
  - 默认值为 CreateX 工厂地址（CLI 会显示为 `CREATEX factory`）。
- `-t, --threads "<n>"`：可选，worker 线程数，默认 `navigator.hardwareConcurrency`（即 CPU 逻辑核心数）。
- `-y, --permissioned`：可选，CreateX Guard permissioned 模式。
- `-x, --crosschain`：可选，CreateX Guard crosschain 模式（依赖 `--chain-id`）。
- `-c, --chain-id "<id>"`：可选，EVM chain id。启用 `--crosschain` 时必须提供。

## Pattern 语法

`--pattern` 使用 Bun `Glob` 语法（匹配对象是形如 `0x...` 的地址字符串）。常用写法：

- `0xcafe*`：前缀匹配。
- `0x*beef`：后缀匹配。
- `0x*bee?`：`?` 匹配单个字符（单个 hex nibble）。
- `0x{aa,bb}*`：多前缀可选（brace expansion）。
- `0x[0-9a-f]*`：字符集范围匹配。

更多语法见：https://bun.sh/docs/runtime/glob

## 输出说明

运行时会在同一行刷新进度：

- `Attempts`：累计尝试次数（跨所有 worker 汇总）。
- `Speed`：当前平均速度（尝试次数 / 用时，单位 attempts/s）。

当找到结果后，会打印一个表格，包含：

- `salt`：随机盐（32 字节 hex）。
- `address`：匹配到的 CREATE2 地址。
- `guardedSalt`：仅当使用 CreateX 时（最终部署时请**务必**使用 salt，而不是 guardedSalt）。

## 速度与期望耗时

搜索本质是随机采样：固定 $n$ 个十六进制字符（nibbles）的前缀/后缀，大致期望尝试次数约为 $16^n$。

- 例：想要 `0x1234*`（固定 4 个 hex 字符），期望尝试次数约 $16^4 = 65536$。
- 实际耗时取决于 `threads`、CPU 频率等。
- 具体性能表现可以运行主包中[基准测试脚本][benchmark_script]。

## Thanks

- [@cliffy/command](https://jsr.io/@cliffy/command) for the excellent CLI framework.

[bun]: https://bun.com/docs/installation 'Bun installation'
[createx]: /pcaversaccio/createx 'createx factory'
[releases]: /Liumingxun/vanityx/releases 'vanityx releases'
[benchmark]: /Liumingxun/vanityx/blob/main/bench 'vanityx benchmark'
[benchmark_script]: /Liumingxun/vanityx/blob/main/package.json#L28 'vanityx benchmark script'
