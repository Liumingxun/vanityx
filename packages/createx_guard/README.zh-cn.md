# @vanityx/createx_guard

[English](./README.md) | 中文

---

一个轻量级的 **CreateX** 保护盐计算工具库。

用于处理以下复杂的 CreateX 盐值哈希逻辑：

- **Permissioned deployments**（权限部署）
- **Cross-chain redeployments**（跨链重部署）
- **Standard deployments**（标准部署）

具体保护规则参考 [CreateX 盐值规则][createx_protection]。

## 安装

```bash
pnpm add @vanityx/createx_guard
```

## 使用

### 高级接口：`getGuardedSalt`

校验输入并根据盐的结构**自动推断**保护标志。

- 检查前 20 字节是否匹配 `msg.sender`。
- 检查第 21 字节是否启用跨链保护。
- 在需要时校验 `chainId` 是否提供。

```ts
import { getGuardedSalt } from '@vanityx/createx_guard'

const guardedSalt = getGuardedSalt({
  salt: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee010000000000000000000000',
  msgSender: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  chainId: 1,
})
```

### 低级接口：`computeGuardedSalt`

执行纯计算，**不进行校验**，提供配置视为启用保护。如果你已经解析了标志位或想跳过安全检查，请使用此接口。

> ![WARNING]
>
> 仅当你完全理解 CreateX 盐值规则并已正确设置参数时才使用此接口，否则可能导致非预期地址、部署失败或其他风险。

```ts
import { computeGuardedSalt } from '@vanityx/createx_guard'

const guardedSalt = computeGuardedSalt({
  salt: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee010000000000000000000000',
  permissioned: { msgSender: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' },
  crosschain: { chainId: 1 },
})
```

## 盐值规则参考

简单来说，`permissioned` 将会通过原始盐值的前 20 字节与 `msg.sender` 进行匹配，而 `crosschain` 则通过第 21 字节的标志位来启用。使用 `getGuardedSalt` 计算将会根据上述规则自动校验相应的保护，并处理 revert 情况。使用 `computeGuardedSalt` 则需要你自己确保输入的正确性。根据这些规则，部署可以分为以下几类：

```text
╔═════════════════╦══════╦══════╦════════╗
║ Sender \ XChain ║  on  ║  off ║   na   ║
╠═════════════════╬══════╬══════╬════════╣
║       self      ║ pass ║ pass ║        ║
╠═════════════════╬══════╬══════╣ revert ║
║       zero      ║ pass ║      ║        ║
╠═════════════════╬══════╝ pass ╚════════╣
║       any       ║                      ║
╚═════════════════╩══════════════════════╝
```

[createx_protection]: https://github.com/pcaversaccio/createx?tab=readme-ov-file#permissioned-deploy-protection-and-cross-chain-redeploy-protection
