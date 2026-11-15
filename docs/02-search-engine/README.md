# Search engine

## Responsibility

Find a 32-byte salt such that `CREATE2(deployer, salt, initcodeHash)` produces an address matching the requested pattern, or report that the nonce space is exhausted.

## Code location

| Layer | Path | Note |
|---|---|---|
| Public entry | `pkg/search/search.go` | `SearchVanity`, `Config`, `Pair` |
| Address derivation | `pkg/search/search.go` | `addressHasher`, `newAddressHasher`, `address`, `salt` |
| Pattern matching | `pkg/search/search.go` | `newMatcher`, `newPrefixMatcher`, `newSuffixMatcher`, `parseNibbles`, `hasGlobMeta` |
| Tests | `pkg/search/search_test.go` | Engine and matcher tests |

## Key flow

1. `newMatcher` trims and lowercases the pattern, strips an optional `0x` prefix, and picks a matcher: empty or `*` matches everything, a plain hex string is a prefix, a single trailing `*` is a prefix, a single leading `*` is a suffix, and anything else goes through `gobwas/glob` against the lowercase hex address.
2. `SearchVanity` fills a 24-byte random salt prefix with `crypto/rand`; the nonce starts at `0`.
3. Each iteration writes the 8-byte big-endian nonce into the 85-byte keccak input buffer (`0xff ++ deployer ++ saltPrefix ++ nonce ++ initcodeHash`), hashes it, and takes the last 20 bytes as the address.
4. On a match, the salt is `saltPrefix ++ nonce` (32 bytes) encoded as hex, and the address is returned in EIP-55 checksummed form.
5. The context is checked every 1024 iterations; `nil, nil` means the 64-bit nonce space is exhausted.

## Interfaces

| Interface | Entry | Note |
|---|---|---|
| Search | `SearchVanity(ctx context.Context, config *Config) (*Pair, error)` | `nil` pair with `nil` error means exhausted |
| Config | `pkg/search/search.go` | `Pattern`, `Deployer`, `InitcodeHash` |
| Result | `Pair.Salt()`, `Pair.Address()` | Salt is hex without `0x`; address is checksummed |

## Data and state

- `addressHasher.buf` is 85 bytes: one `0xff` flag byte, 20 deployer bytes, 32 salt bytes, 32 initcode hash bytes.
- The nonce occupies `buf[45:53]` big-endian, which is also salt bytes 24–31.
- The `crypto.KeccakState` is reused via `Reset()`, so the loop allocates nothing per attempt.
- `Pair` fields are unexported; the wasm layer serializes them into the result payload.

## Known pitfalls

- Patterns longer than 40 hex characters are rejected by `parseNibbles`.
- Odd-length prefixes and suffixes compare at nibble level (`address[full]>>4`, `address[e.AddressLength-full-1]&0x0f`); changing the byte-level comparison breaks them.
- Matching is case-insensitive only because both the pattern and the hex string are lowercased; do not switch to checksummed hex.
- The expected number of attempts for `n` hex characters is about `16^n`, and a single call blocks until it succeeds or exhausts the nonce space.
- `SearchVanity` returns `nil, nil` instead of an error on exhaustion; the wasm layer maps that to status `1`.

## Change log

| Date | Change | Reference |
|---|---|---|
| 2026-11-15 | Baseline documented from source | `pkg/search/search.go` |

## References

- [wasm bridge](../03-wasm-bridge/README.md)
- [moc.md](../moc.md)
