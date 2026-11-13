import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { configVariable, defineConfig, overrideTask } from "hardhat/config";
import { spawn } from "node:child_process";

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin],
  paths: {
    tests: "./tests",
  },
  tasks: [
    overrideTask(["test", "nodejs"])
      .setInlineAction(async () => {
        spawn("vp test", {
          stdio: "inherit",
          shell: true,
        });
      })
      .build(),
  ],
  solidity: {
    profiles: {
      default: {
        version: "0.8.34",
      },
      production: {
        version: "0.8.34",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
  },
});
