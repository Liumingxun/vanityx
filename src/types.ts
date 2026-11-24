export interface SearchConfig {
  /**
   * Address pattern: a hex prefix (`"dead"`), a suffix (`"*beef"`), or a glob,
   * with an optional `0x` prefix. An empty pattern matches any address.
   */
  pattern: string;
  /** keccak256 hash of the initcode, as a 32-byte hex string. */
  initcodeHash: `0x${string}`;
  /** CREATE2 deployer address, as a 20-byte hex string. */
  deployer: `0x${string}`;
}

export interface Result {
  /** 32-byte salt as a hex string. */
  salt: `0x${string}`;
  /** EIP-55 checksummed CREATE2 address. */
  address: `0x${string}`;
  guardedSalt?: `0x${string}` | undefined;
}

export type VanityxExports = {
  readonly memory: WebAssembly.Memory;
  patternPtr: () => number;
  deployerPtr: () => number;
  initcodeHashPtr: () => number;
  search: (patternLen: number) => 0 | 1 | 2;
  resultPtr: () => number;
  resultLen: () => number;
  errorPtr: () => number;
  errorLen: () => number;
};
