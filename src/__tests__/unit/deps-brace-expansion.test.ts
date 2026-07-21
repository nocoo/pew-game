import { describe, expect, test } from "vitest";
import { createRequire } from "node:module";
import { minimatch as minimatch10 } from "minimatch";

const require = createRequire(import.meta.url);

// Regression: `overrides.brace-expansion` must keep every reachable
// minimatch working. minimatch@3 imports brace-expansion as a bare
// function; brace-expansion@5 only exports `{ expand }`, so applying
// the v5 pin to the v1 line silently blows up the first time anyone
// evaluates a brace glob at runtime (GHSA-3jxr-9vmj-r5cp fix regression).
describe("brace-expansion overrides — runtime shape check", () => {
  test("minimatch@3 (bundled with eslint-plugin-import) evaluates brace globs", () => {
    const minimatch3 = require(
      "eslint-plugin-import/node_modules/minimatch/minimatch.js",
    ) as (path: string, pattern: string) => boolean;
    expect(minimatch3("foo.js", "*.{js,ts}")).toBe(true);
    expect(minimatch3("foo.ts", "*.{js,ts}")).toBe(true);
    expect(minimatch3("foo.md", "*.{js,ts}")).toBe(false);
  });

  test("minimatch@10 (top-level) evaluates brace globs", () => {
    expect(minimatch10("foo.js", "*.{js,ts}")).toBe(true);
    expect(minimatch10("foo.md", "*.{js,ts}")).toBe(false);
  });
});
