#!/usr/bin/env vpx

import { exec } from "node:child_process";
import { readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const { stdout } = await promisify(exec)("tinygo env TINYGOROOT");
const TINYGOROOT = stdout.trim();

const source = `${TINYGOROOT}/targets/wasm_exec.js`;
const dest = fileURLToPath(import.meta.resolve("../src/wasm_exec.cjs", import.meta.dirname));

await rm(dest, { force: true });
await writeFile(dest, await readFile(source));
