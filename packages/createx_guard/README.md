# @vanityx/createx_guard

English | [中文](./README.zh-cn.md)

---

A lightweight utility for calculating **CreateX** factory guard salts.

Handles the complex salt hashing logic for:

- **Permissioned deployments**
- **Cross-chain redeployments**
- **Standard deployments**

See [CreateX Salt Rules][createx_protection] for details.

## Installation

```bash
pnpm add @vanityx/createx_guard
```

## Usage

### High-level: `getGuardedSalt`

Validates input and **automatically infers** protection flags based on the salt structure.

- Checks if bytes 0-19 match `msg.sender`.
- Checks if byte 20 flag enables cross-chain protection.
- Validates that `chainId` is provided when required.

```ts
import { getGuardedSalt } from '@vanityx/createx_guard'

const guardedSalt = getGuardedSalt({
  salt: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee010000000000000000000000',
  msgSender: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  chainId: 1,
})
```

### Low-level: `computeGuardedSalt`

Performs raw computation **without validation**, treating provided configuration as enabling protection. Use this if you have already parsed the flags or want to bypass safety checks.

> [!WARNING]
>
> Only use this if you fully understand CreateX salt rules. Incorrect parameters may lead to unintended addresses, failed deployments, or other risks.

```ts
import { computeGuardedSalt } from '@vanityx/createx_guard'

const guardedSalt = computeGuardedSalt({
  salt: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee010000000000000000000000',
  permissioned: { msgSender: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' },
  crosschain: { chainId: 1 },
})
```

## Salt Rules Reference

Simply put, `permissioned` matches the first 20 bytes of the raw salt against `msg.sender`, and `crosschain` is enabled via the 21st byte flag. `getGuardedSalt` automatically validates these protections and handles reverts, while `computeGuardedSalt` assumes you know what you are doing.

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

[createx_protection]: https://github.comhttps://github.com/pcaversaccio/createx?tab=readme-ov-file#permissioned-deploy-protection-and-cross-chain-redeploy-protection
