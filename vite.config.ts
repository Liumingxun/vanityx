import { defineConfig } from "vite-plus";
import { wasm } from "rolldown-plugin-wasm";

// The Go sources and the helper script are the only inputs of the wasm build.
// The tinygo toolchain itself is not fingerprinted: pass `--no-cache` after
// upgrading it.
const wasmInputs = [
  "wasm.go",
  "pkg/**/*.go",
  "go.mod",
  "go.sum",
  "scripts/prepare-go-wasm-helper.ts",
];

export default defineConfig({
  staged: {
    "*": "vp run check --fix",
  },
  pack: [
    {
      entry: "src/index.ts",
      plugins: [
        wasm({
          targetEnv: "node",
        }),
      ],
    },
  ],
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {
    ignorePatterns: ["docs", ".release-please-manifest.json", "CHANGELOG.md"],
  },
  run: {
    tasks: {
      buildWasm: {
        command: [
          "vpx ./scripts/prepare-go-wasm-helper.ts",
          "tinygo build -target=wasm -o=./src/vanityx.wasm -scheduler=none --no-debug .",
        ],
        cache: {
          input: wasmInputs,
          output: ["src/wasm_exec.cjs", "src/vanityx.wasm"],
        },
      },
      pack: {
        command: "vp pack",
        dependsOn: ["clean", "buildWasm"],
        cache: false,
      },
      check: {
        command: "vp check",
        dependsOn: ["buildWasm"],
        cache: false,
      },
      test: {
        command: "vp test",
        dependsOn: ["buildWasm"],
        cache: false,
      },
    },
  },
});
