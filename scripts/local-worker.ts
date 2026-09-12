import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFile, writeFile, rm } from "node:fs/promises";

const profile = process.argv[2] ?? "dev";
if (!["dev", "test"].includes(profile)) throw new Error("Expected dev or test");
const environment = profile === "dev" ? "local" : "test";
const directory = profile === "dev" ? ".wrangler/dev" : ".wrangler/browser";
const port = profile === "dev" ? 7050 : 27050;
const config = JSON.parse(await readFile("wrangler.jsonc", "utf8"));
const local = config.env[environment];
if (local.routes.length || local.d1_databases.some((db: { remote?: boolean; database_id: string }) =>
  db.remote || !/^00000000-0000-0000-0000-00000000000[12]$/.test(db.database_id),
)) throw new Error("Local development requires isolated fake D1 bindings");

// Local-only keys are generated once and never printed or stored in config.
try {
  await writeFile(`.dev.vars.${environment}`, `ANTICHEAT_SECRET=${randomBytes(32).toString("hex")}\n`, {
    flag: "wx", mode: 0o600,
  });
} catch (error) {
  if (!(error instanceof Error && "code" in error && error.code === "EEXIST")) throw error;
}
if (profile === "test") await rm(directory, { recursive: true, force: true });

const wrangler = ["node_modules/wrangler/bin/wrangler.js"];
const childEnv = { ...process.env, WRANGLER_SEND_METRICS: "false" };
const migration = spawnSync("node", [...wrangler, "d1", "migrations", "apply",
  local.d1_databases[0].database_name, "--env", environment, "--local", "--persist-to", directory,
], { stdio: "inherit", env: { ...childEnv, CI: "true" } });
if (migration.error) throw migration.error;
if (migration.status !== 0) process.exit(migration.status ?? 1);

console.info(`Local SQLite D1: ${directory}; no production rankings are read or changed.`);
const child = spawn("node", [...wrangler, "dev", "--env", environment,
  "--local", "--ip", "127.0.0.1", "--port", String(port),
  "--inspector-port", String(port + 1000), "--persist-to", directory,
], { stdio: "inherit", env: childEnv });
for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => child.kill(signal));
child.on("error", (error) => { console.error(error); process.exit(1); });
child.on("exit", (code) => process.exit(code ?? 0));
