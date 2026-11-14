import { concat, getAddress, keccak256, toBytes } from "viem";
import { describe, expect, test } from "vite-plus/test";
import { search } from "../src/index.ts";
import type { Result } from "../src/types.ts";

const deployer = "0x1111111111111111111111111111111111111111";
const initcodeHash = `0x${"22".repeat(32)}` as `0x${string}`;

function deriveAddress({ salt }: Result): `0x${string}` {
  const digest = keccak256(
    concat([toBytes("0xff"), toBytes(deployer), toBytes(salt), toBytes(initcodeHash)]),
  );
  return getAddress(`0x${digest.slice(26)}`);
}

describe("search", () => {
  test("returns a salt and the address derived from it", async () => {
    const result = await search({ pattern: "", deployer, initcodeHash });

    expect(result).not.toBeNull();
    if (result === null) return;
    expect(result.salt).toMatch(/^0x[0-9a-f]{64}$/);
    expect(result.address).toBe(deriveAddress(result));
  });

  test("accepts a 0x-prefixed pattern and matches it", async () => {
    const result = await search({ pattern: "0x1", deployer, initcodeHash });

    expect(result).not.toBeNull();
    if (result === null) return;
    expect(result.address.toLowerCase()).toMatch(/^0x1/);
    expect(result.address).toBe(deriveAddress(result));
  });

  test("reuses the runtime for consecutive searches", async () => {
    const first = await search({ pattern: "", deployer, initcodeHash });
    const second = await search({ pattern: "", deployer, initcodeHash });

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    if (first === null || second === null) return;
    expect(second.address).toBe(deriveAddress(second));
  });

  test("rejects malformed input", async () => {
    await expect(search({ pattern: "", deployer: "0x11", initcodeHash })).rejects.toThrow(
      /deployer/,
    );
    await expect(search({ pattern: "", deployer, initcodeHash: "0x22" })).rejects.toThrow(
      /initcodeHash/,
    );
    await expect(
      search({ pattern: "", deployer: "0xzz11111111111111111111111111111111111111", initcodeHash }),
    ).rejects.toThrow(/deployer/);
    await expect(search({ pattern: "a".repeat(513), deployer, initcodeHash })).rejects.toThrow(
      /pattern/,
    );
  });

  test("surfaces wasm errors as exceptions", async () => {
    await expect(search({ pattern: "not-hex", deployer, initcodeHash })).rejects.toThrow(
      /invalid pattern/,
    );
  });
});
