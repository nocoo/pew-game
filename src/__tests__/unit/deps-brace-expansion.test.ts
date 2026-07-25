import { describe, expect, test } from "vitest";
import { createRequire } from "node:module";
import { minimatch as minimatch10 } from "minimatch";

const require = createRequire(import.meta.url);

// Regression: this repo overrides every reachable brace-expansion instance to
// the patched >=5.0.8 line (GHSA-mh99-v99m-4gvg). brace-expansion@5 exports
// `{ expand }`, not a callable, so the minimatch@3 fork (bundled with the
// dev-only eslint-plugin-* packages) — which does `require('brace-expansion')`
// expecting a function — is patched via patches/minimatch@3.1.5.patch to
// unwrap the new shape. If either the override or the patch drift, evaluating
// any brace glob against minimatch@3 blows up at runtime the first time ESLint
// touches a pattern like `*.{js,ts}`.
describe("brace-expansion overrides — runtime shape check", () => {
  test("minimatch@3 (bundled with eslint-plugin-import, patched) evaluates brace globs", () => {
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
