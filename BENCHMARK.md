clk: ~4.39 GHz
cpu: Intel(R) Core(TM) i5-14400
runtime: bun 1.3.9 (x64-linux)

| benchmark          | avg              | min         | p75         | p99         | max         |
| ------------------ | ---------------- | ----------- | ----------- | ----------- | ----------- |
| computeGuardedSalt | `  9.65 µs/iter` | `  7.03 µs` | `  9.31 µs` | ` 32.61 µs` | `  2.80 ms` |
| getGuardedSalt     | ` 12.72 µs/iter` | `  9.66 µs` | ` 12.49 µs` | ` 31.68 µs` | `  2.54 ms` |

clk: ~4.39 GHz
cpu: Intel(R) Core(TM) i5-14400
runtime: bun 1.3.9 (x64-linux)

| benchmark               | avg              | min         | p75         | p99         | max         |
| ----------------------- | ---------------- | ----------- | ----------- | ----------- | ----------- |
| createx iteration x 1   | ` 40.44 µs/iter` | ` 22.20 µs` | ` 39.30 µs` | `105.75 µs` | `  4.53 ms` |
| createx iteration x 16  | `594.54 µs/iter` | `582.68 µs` | `602.10 µs` | `606.76 µs` | `614.71 µs` |
| standard iteration x 1  | ` 25.94 µs/iter` | ` 24.26 µs` | ` 26.84 µs` | ` 27.82 µs` | ` 27.90 µs` |
| standard iteration x 16 | `415.17 µs/iter` | `402.29 µs` | `422.06 µs` | `426.65 µs` | `430.33 µs` |

clk: ~4.26 GHz
cpu: Intel(R) Core(TM) i5-14400
runtime: bun 1.3.9 (x64-linux)

| benchmark                  | avg              | min         | p75         | p99         | max         |
| -------------------------- | ---------------- | ----------- | ----------- | ----------- | ----------- |
| iter & match 100_000 times | `   3.61 s/iter` | `   3.46 s` | `   3.63 s` | `   3.84 s` | `   4.06 s` |
