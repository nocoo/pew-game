import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, test } from "vitest";

const biome = resolve("node_modules/.bin/biome");
const lint = (input: string) => {
  const cwd = mkdtempSync(join(tmpdir(), "pew-lint-"));
  try {
    copyFileSync("biome.json", join(cwd, "biome.json"));
    mkdirSync(join(cwd, "src"));
    writeFileSync(join(cwd, "src", "lint-probe.tsx"), input);
    return execFileSync(biome, ["lint", "--vcs-enabled=false", "--error-on-warnings", "src"], {
      cwd, stdio: ["ignore", "pipe", "pipe"],
    });
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
};

describe("Biome quality gate", () => {
  test("accepts refresh triggers without dropping effect dependencies", () => {
    expect(() => lint('import { useEffect } from "react"; export function useRefresh(key: number) { useEffect(() => { document.title = "ready"; }, [key]); }')).not.toThrow();
  });

  test.each([
    'export function unused() { const value = 1; return 0; }',
    'import { useEffect } from "react"; export function useTitle(title: string) { useEffect(() => { document.title = title; }, []); }',
    'import { test } from "vitest"; test.only("focused", () => {});',
    'import { test } from "vitest"; test.skip("skipped", () => {});',
  ])("rejects invalid source: %s", (input) => {
    expect(() => lint(input)).toThrow();
  });
});
