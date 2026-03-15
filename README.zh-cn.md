# vanityx

[English](./README.md) | 中文

---

用 TypeScript 在 [Bun] 运行时搜索以太坊 `CREATE2` 的 vanity 地址；并且原生支持 [CreateX] 的盐值规则。

- 你给出：`pattern` + `deployer` + `initcode`/`initcodeHash`
- 它输出：命中的 `salt` / `guardedSalt` + 目标合约地址

> CLI 工具在这里：[@vanityx/cli]

## 亮点

- **Iterator 优先**：暴露迭代器，方便你接入并行/分布式/自定义终止条件
- **CreateX 支持**：自动处理守卫盐，覆盖 permissioned / crosschain 两种模式
- **Pattern 直观**：用 Bun 的 `Glob` 匹配 `0x…` 地址字符串
- **API 简洁**：一个 `searchVanity()`，可选进度回调

## 环境要求

这个包在运行时使用了 Bun 的 `Glob` 用于 pattern 匹配，因此 **运行环境需要 Bun**。

如果你想要开箱即用、带多线程并行的工具，可以直接在 [releases] 下载预编译的二进制文件。

## 安装

```bash
pnpm add @vanityx/core
# or
bun add @vanityx/core
```

## 快速开始

### CreateX，适用于 permissioned / crosschain

当 `deployer` 是 CreateX 工厂地址并且启用了保护模式时，`vanityx` 会自动走 CreateX 规则并返回 `guardedSalt`。

```ts
import { searchVanity } from '@vanityx/core'
import { CREATEX_FACTORY_ADDRESS } from '@vanityx/core/schema'

const result = searchVanity({
  pattern: '0x1234*',
  deployer: CREATEX_FACTORY_ADDRESS,
  initcodeHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
  createxOpts: {
    crosschain: { chainId: 1 },
    permissioned: { msgSender: '0x0000000000000000000000000000000000000000' },
  },
})

console.log(result)
```

### 标准 CREATE2，适用于其他 deployer

```ts
import { searchVanity } from '@vanityx/core'

const result = searchVanity({
  pattern: '0xcafe*',
  deployer: '0x0000000000000000000000000000000000000000',
  initcodeHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
}, {
  progressInterval: 50_000,
  onProgress: ({ attempts, timeMs }) => {
    console.log(`Tried ${attempts} salts in ${timeMs}ms...`)
  },
})

console.log(result)
```

## Pattern 语法

`pattern` 基于 Bun 的 [`Glob`][bun_glob] 语法匹配地址。常用写法：

- `0xcafe*`：前缀匹配
- `0x*beef`：后缀匹配
- `0x*bee?`：`?` 匹配单个十六进制字符
- `0x{aa,bb}*`：多前缀可选
- `0x[0-4][c-e]*`：字符集范围匹配

> [!CAUTION]
>
> - `pattern` 合法性检查有限，请确保输入正确的 `glob` 模式
> - 有效但错误的 `pattern` 可能导致无法匹配预期的地址，例如 `0xVVV*VVV`
> - 注意添加 `*` 以避免过早固定地址长度，例如 `0x1234*` 而不是 `0x1234`
> - `**` 和 `!` 在地址模式里没有特殊含义，不建议使用

## API 概览

### `searchVanity(input, options?)`

- 输入：
  - `pattern`: 必须以 `0x` 开头
  - `deployer`: 合约部署器地址，用于 `CREATE2` 地址推导
  - `initcode` 或 `initcodeHash`: 二选一
  - `createxOpts?`: CreateX 保护选项。只有当 `deployer === CREATEX_FACTORY_ADDRESS` 且启用保护时才会生效
- 输出：
  - 命中则返回 `{ salt, address, guardedSalt? }`
  - 若在 `onProgress` 回调里返回 `false` 则提前停止并返回 `null`

### 迭代器

如果你更想自己控制搜索流程，可以直接用迭代器：

- `standardIterator()`：标准 `CREATE2` 尝试生成器
- `createXIterator()`：CreateX 尝试生成器，会生成 `guardedSalt`

## 性能预期

搜索本质是随机采样：每固定 $n$ 个十六进制字符，期望尝试次数约 $16^n$。

- 例如：`0x1234*` 期望尝试约 $16^4 = 65,536$ 次。
- 具体性能参考[基准测试报告][benchmark]或运行[基准测试脚本][benchmark_script]。

## FAQ

### 我应该如何使用 `guardedSalt`？

通常情况下，你并不需要直接使用 `guardedSalt`，它仅作为信息展示项。这个概念主要用于 CreateX 的内部场景，对大多数用户来说意义不大。在部署合约时，你只需直接使用 `salt` 即可。

### 为什么我在 Node.js 里跑不起来？

因为运行时使用了 Bun 的 `Glob`，它不是 Node 标准库的一部分。如果你在使用 Bun 运行时遇到了问题，可以：

- 用 CLI 的预编译二进制。文档在 [@vanityx/cli]
- 或者把匹配部分替换成你自己的 matcher。你可以直接消费迭代器输出，然后自己做 match

### 这能“保证”多久找到吗？

不能。它是随机采样；只有“期望尝试次数”。你固定得越多，例如更长的前缀或后缀，搜索时间会指数级上升。

## 项目结构

- `src/`：核心库代码，包含 `searchVanity`、迭代器和 schema。
- `types/`：对外导出的 TypeScript 类型。
- `packages/cli/`：命令行工具，基于核心库构建，并支持并行。
- `packages/createx_guard/`：CreateX 守卫盐计算库。
- `packages/createx_guard_hh/`：`createx_guard` 的 hardhat 测试项目。
- `bench/`：基准测试脚本。

[createx]: https://github.com/pcaversaccio/createx 'createx factory'
[bun]: https://bun.com/docs/installation 'Bun installation'
[bun_glob]: https://bun.sh/docs/runtime/glob 'Bun Glob documentation'
[releases]: https://github.com/Liumingxun/vanityx/releases 'vanityx releases'
[@vanityx/cli]: https://github.com/Liumingxun/vanityx/blob/main/packages/cli/README.zh-cn.md 'vanityx CLI'
[@vanityx/createx_guard]: https://github.com/Liumingxun/vanityx/blob/main/packages/createx_guard/README.zh-cn.md 'vanityx CreateX Guarded Salt'
[benchmark]: https://github.com/Liumingxun/vanityx/blob/main/BENCHMARK.md 'vanityx benchmark'
[benchmark_script]: https://github.com/Liumingxun/vanityx/blob/main/package.json#L28 'vanityx benchmark script'
