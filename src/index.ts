import "./wasm_exec.cjs";
import init from "./vanityx.wasm?init";
import type { Result, SearchConfig, VanityxExports } from "./types.ts";

// Buffer sizes and status codes are defined by wasm.go.
const PATTERN_BUFFER_SIZE = 512;
const DEPLOYER_SIZE = 20;
const INITCODE_HASH_SIZE = 32;

const STATUS_FOUND = 0;
const STATUS_NOT_FOUND = 1;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

let runtime: Promise<VanityxExports> | undefined;

// The Go runtime is started once and reused: instantiating the module and
// running the Go scheduler on every call costs far more than a short search.
function getRuntime(): Promise<VanityxExports> {
  runtime ??= (async () => {
    const go = new Go();
    const instance = await init(go.importObject);
    await go.run(instance);
    return instance.exports as VanityxExports;
  })().catch((error: unknown) => {
    runtime = undefined;
    throw error;
  });
  return runtime;
}

function hexNibble(code: number): number {
  if (code >= 0x30 && code <= 0x39) return code - 0x30;
  if (code >= 0x61 && code <= 0x66) return code - 0x61 + 10;
  if (code >= 0x41 && code <= 0x46) return code - 0x41 + 10;
  return -1;
}

// parseHex accepts values with or without a "0x" prefix and rejects anything
// that is not exactly `size` bytes long, so the wasm buffers never get a
// silently truncated or shifted value.
function parseHex(value: unknown, size: number, field: string): Uint8Array {
  if (typeof value !== "string") {
    throw new TypeError(`${field} must be a hex string`);
  }
  const hex = value.startsWith("0x") || value.startsWith("0X") ? value.slice(2) : value;
  if (hex.length !== size * 2) {
    throw new TypeError(
      `${field} must be ${size} bytes (${size * 2} hex characters), got ${hex.length}`,
    );
  }

  const bytes = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    const hi = hexNibble(hex.charCodeAt(i * 2));
    const lo = hexNibble(hex.charCodeAt(i * 2 + 1));
    if (hi < 0 || lo < 0) {
      throw new TypeError(`${field} contains a non-hex character`);
    }
    bytes[i] = (hi << 4) | lo;
  }
  return bytes;
}

function encodePattern(pattern: unknown): Uint8Array {
  if (typeof pattern !== "string") {
    throw new TypeError("pattern must be a string");
  }
  const bytes = encoder.encode(pattern);
  if (bytes.length > PATTERN_BUFFER_SIZE) {
    throw new RangeError(
      `pattern must be at most ${PATTERN_BUFFER_SIZE} UTF-8 bytes, got ${bytes.length}`,
    );
  }
  return bytes;
}

function readString(memory: Uint8Array, ptr: number, len: number): string {
  return decoder.decode(memory.subarray(ptr, ptr + len));
}

function parseResult(ex: VanityxExports, memory: Uint8Array): Result {
  const payload = readString(memory, ex.resultPtr(), ex.resultLen());
  const separator = payload.indexOf("\n");
  const salt = payload.slice(0, separator);
  const address = payload.slice(separator + 1);
  if (separator !== 64 || !/^[0-9a-f]{64}$/.test(salt) || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    throw new Error(`vanityx: malformed result payload ${JSON.stringify(payload)}`);
  }
  return {
    address: address as `0x${string}`,
    salt: `0x${salt}`,
  };
}

function searchFailed(ex: VanityxExports, memory: Uint8Array): Error {
  const detail = readString(memory, ex.errorPtr(), ex.errorLen());
  return new Error(detail ? `vanityx: ${detail}` : "vanityx: search failed");
}

/**
 * Searches for a CREATE2 salt whose address matches `config.pattern`.
 *
 * The Go runtime is initialised on first use and shared by later calls.
 * A single search blocks until it finds a match, so long patterns should be
 * searched from a Web Worker.
 *
 * @returns the matching salt and address, or `null` if the nonce space is
 * exhausted.
 */
export async function search(config: SearchConfig): Promise<Result | null> {
  const pattern = encodePattern(config.pattern);
  const deployer = parseHex(config.deployer, DEPLOYER_SIZE, "deployer");
  const initcodeHash = parseHex(config.initcodeHash, INITCODE_HASH_SIZE, "initcodeHash");

  const ex = await getRuntime();

  let memory = new Uint8Array(ex.memory.buffer);
  memory.set(pattern, ex.patternPtr());
  memory.set(deployer, ex.deployerPtr());
  memory.set(initcodeHash, ex.initcodeHashPtr());

  let status: number;
  try {
    status = ex.search(pattern.length);
  } catch (error) {
    // A trap poisons the Go instance, so let the next call start a fresh one.
    runtime = undefined;
    throw error;
  }
  // The search may grow wasm memory, so the view has to be refreshed.
  memory = new Uint8Array(ex.memory.buffer);

  switch (status) {
    case STATUS_FOUND:
      return parseResult(ex, memory);
    case STATUS_NOT_FOUND:
      return null;
    default:
      throw searchFailed(ex, memory);
  }
}
