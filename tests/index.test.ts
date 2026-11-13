import { expect, test } from "vite-plus/test";
import { fn } from "../shared/index.ts";

test("fn", () => {
  expect(fn()).toBe("Hello, Vite+!");
});
