import { readFileSync } from "node:fs";
import process from "node:process";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const declared = JSON.parse(read("../package.json")).devDependencies.wrangler;
const installed = JSON.parse(read("../node_modules/wrangler/package.json")).version;
const workflow = read("../.github/workflows/release.yml");
const pins = [...workflow.matchAll(
  /^\s+wrangler-version:\s*(?:"([^"]+)"|'([^']+)'|([^\s#]+))\s*(?:#.*)?$/gm,
)].map((match) => match[1] ?? match[2] ?? match[3]);

if (!/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(declared) || pins.length > 1) {
  throw new Error("Declare one exact Wrangler version in package.json and at most one Release pin.");
}
// base-ci v2026.9 derives Wrangler from the lockfile; a Release pin is optional.
const pin = pins[0] ?? "lockfile";
if (installed !== declared || (pin !== "lockfile" && pin !== declared)) {
  throw new Error(
    `Wrangler version mismatch: package.json=${declared}, installed=${installed}, Release=${pin}. Update the dependency and Release pin together.`,
  );
}

process.stdout.write(`Release Wrangler matches the frozen dependency: ${declared}\n`);
