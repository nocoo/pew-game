import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { getPlatformProxy, type PlatformProxy } from "wrangler";
import worker from "../../../worker/index";
import type { ScoreSubmission } from "@/lib/anticheat";
import type { ScoreRow } from "@/lib/db";
import { APP_VERSION } from "@/lib/version";

const SECRET = "integration-test-only-secret-never-used-in-production";
let directory: string;
let proxy: PlatformProxy<Cloudflare.TestEnv>;
let emptyProxy: PlatformProxy<Cloudflare.TestEnv>;
let env: Env;

function bindings(): Env {
  return {
    DB: proxy.env.DB,
    ANTICHEAT_SECRET: SECRET,
    ASSETS: {
      fetch: async () => new Response("static asset"),
      connect: () => { throw new Error("No sockets in API tests"); },
    },
  };
}

async function openDatabase() {
  return getPlatformProxy<Cloudflare.TestEnv>({
    configPath: "wrangler.jsonc", environment: "test", envFiles: [],
    remoteBindings: false, persist: { path: directory },
  });
}

async function call(path: string, init?: RequestInit, target = env) {
  const response = await worker.fetch(new Request(`https://game.test${path}`, init), target);
  if (path.startsWith("/api/")) expect(response.headers.get("Cache-Control")).toBe("no-store");
  return response;
}

function post(value: unknown, target = env) {
  return call("/api/scores", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value),
  }, target);
}

async function submission(overrides: Partial<ScoreSubmission> = {}): Promise<ScoreSubmission> {
  // Only the token's issuance clock is shifted; D1 continues using real timers.
  const clock = vi.spyOn(Date, "now").mockReturnValue(Date.now() - 30_000);
  try {
    const response = await call("/api/token");
    expect(response.status).toBe(200);
    return { ...await response.json(), name: "ACE", score: 100, wave: 3, ...overrides };
  } finally {
    clock.mockRestore();
  }
}

describe("Worker APIs with real local Wrangler SQLite D1", () => {
  beforeAll(async () => {
    const config = JSON.parse(await readFile("wrangler.jsonc", "utf8"));
    expect(config.d1_databases[0].database_name).toBe("pew-game");
    for (const name of ["local", "test"]) {
      expect(config.env[name].routes).toEqual([]);
      expect(config.env[name].d1_databases[0].database_id).toMatch(/^00000000-/);
      expect(config.env[name].d1_databases[0].remote).not.toBe(true);
    }
    directory = await mkdtemp(join(tmpdir(), "pew-game-d1-test-"));
    proxy = await openDatabase();
    const migration = await readFile("migrations/0001_scores.sql", "utf8");
    await proxy.env.DB.batch(migration.split(";").filter((sql) => sql.trim()).map((sql) => proxy.env.DB.prepare(sql)));
    emptyProxy = await getPlatformProxy<Cloudflare.TestEnv>({
      configPath: "wrangler.jsonc", environment: "test", envFiles: [],
      remoteBindings: false, persist: false,
    });
  }, 30_000);

  afterAll(async () => {
    await proxy?.dispose();
    await emptyProxy?.dispose();
    if (directory) await rm(directory, { recursive: true, force: true });
  });

  beforeEach(async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await proxy.env.DB.prepare("DELETE FROM scores").run();
    env = bindings();
  });
  afterEach(() => { vi.restoreAllMocks(); });

  test("reports actual schema health, including a healthy empty leaderboard", async () => {
    const healthy = await call("/api/live");
    expect(healthy.status).toBe(200);
    expect(await healthy.json()).toEqual({ status: "ok", version: APP_VERSION, database: { connected: true } });
    expect(await (await call("/api/scores")).json()).toEqual([]);

    const missingSchema = { ...env, DB: emptyProxy.env.DB };
    const unhealthy = await call("/api/live", undefined, missingSchema);
    expect(unhealthy.status).toBe(503);
    expect(await unhealthy.json()).toEqual({ status: "error", version: APP_VERSION, database: { connected: false } });
    const scores = await call("/api/scores", undefined, missingSchema);
    expect(scores.status).toBe(503);
    expect(await scores.json()).toEqual({ error: "service unavailable" });
  });

  test("saves a validated score and only returns public leaderboard columns", async () => {
    const sub = await submission({ name: " aCe9 " });
    const response = await post(sub);
    expect(response.status).toBe(201);
    const data = await response.json() as { inserted: ScoreRow; scores: ScoreRow[] };
    expect(data.inserted).toMatchObject({ name: "ACE9", score: 100, wave: 3 });
    expect(data.inserted.duration).toBeGreaterThanOrEqual(30);
    expect(data.scores).toEqual([data.inserted]);
    expect(Object.keys(data.inserted).sort()).toEqual(["created", "duration", "id", "name", "score", "wave"]);
    expect(JSON.stringify(data)).not.toContain(sub.sessionId);
    expect(await env.DB.prepare("SELECT session_id FROM scores").first("session_id")).toBe(sub.sessionId);
    expect((await call("/api/live")).status).toBe(200);
  });

  test("ranks by score, then oldest submission, and returns only the top ten", async () => {
    const insert = env.DB.prepare("INSERT INTO scores (name, score, wave, duration, session_id, created) VALUES (?, ?, 3, 30, ?, ?)");
    await env.DB.batch([
      ...Array.from({ length: 12 }, (_, i) => insert.bind(`P${i}`, i * 10, `fixture-${i}`, "2026-08-01 00:00:00")),
      insert.bind("NEW", 200, "fixture-new", "2026-08-03 00:00:00"),
      insert.bind("OLD", 200, "fixture-old", "2026-08-02 00:00:00"),
    ]);
    const data = await (await call("/api/scores")).json() as ScoreRow[];
    expect(data).toHaveLength(10);
    expect(data.slice(0, 3).map((row) => row.name)).toEqual(["OLD", "NEW", "P11"]);
    expect(data[9].score).toBe(40);
    expect(data.some((row) => "session_id" in row)).toBe(false);
  });

  test("returns the original score when the saved response is lost and retried later", async () => {
    const sub = await submission();
    // The database commits, but the client never reads the first response.
    await post(sub);
    const [original] = await (await call("/api/scores")).json() as ScoreRow[];
    expect(original).toMatchObject({ name: "ACE", score: 100, wave: 3 });
    const clock = vi.spyOn(Date, "now").mockReturnValue(Date.now() + 15_000);
    try {
      const retry = await post(sub);
      expect(retry.status).toBe(201);
      expect(await retry.json()).toEqual({ inserted: original, scores: [original] });
    } finally {
      clock.mockRestore();
    }
    expect(await env.DB.prepare("SELECT count(*) AS total FROM scores").first("total")).toBe(1);
  });

  test("accepts identical concurrent submissions while saving exactly one score", async () => {
    const sub = await submission();
    const results = await Promise.all(Array.from({ length: 6 }, () => post(sub)));
    const [original] = await (await call("/api/scores")).json() as ScoreRow[];
    for (const response of results) {
      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({ inserted: original, scores: [original] });
    }
    expect(await env.DB.prepare("SELECT count(*) AS total FROM scores").first("total")).toBe(1);
  });

  test("rejects conflicting session reuse alongside identical retries", async () => {
    const sub = await submission();
    const original = await (await post(sub)).json() as { inserted: ScoreRow; scores: ScoreRow[] };
    const [retry, ...conflicts] = await Promise.all([
      post({ ...sub, name: " aCe " }),
      post({ ...sub, name: "ACE2" }),
      post({ ...sub, score: 110 }),
      post({ ...sub, wave: 4 }),
    ]);
    expect(retry.status).toBe(201);
    expect(await retry.json()).toEqual(original);
    for (const response of conflicts) {
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: "session already used" });
    }
    expect(await (await call("/api/scores")).json()).toEqual(original.scores);
    expect(await env.DB.prepare("SELECT count(*) AS total FROM scores").first("total")).toBe(1);
  });

  test("keeps rankings and idempotent saves across Worker/database-runtime restarts", async () => {
    const sub = await submission();
    const original = await (await post(sub)).json() as { inserted: ScoreRow; scores: ScoreRow[] };
    await proxy.dispose();
    proxy = await openDatabase();
    env = bindings();
    const replay = await post(sub);
    expect(replay.status).toBe(201);
    expect(await replay.json()).toEqual(original);
    expect((await post({ ...sub, score: 110 })).status).toBe(403);
    expect(await env.DB.prepare("SELECT count(*) AS total FROM scores").first("total")).toBe(1);
  }, 30_000);

  test("does not consume a session on invalid input or a rolled-back database write", async () => {
    const sub = await submission();
    expect((await post({ ...sub, name: "<script>" })).status).toBe(403);
    await env.DB.prepare("CREATE TRIGGER reject_test_write AFTER INSERT ON scores BEGIN SELECT RAISE(ABORT, 'private database details'); END").run();
    try {
      const failed = await post(sub);
      expect(failed.status).toBe(503);
      expect(await failed.json()).toEqual({ error: "service unavailable" });
      expect(await env.DB.prepare("SELECT count(*) AS total FROM scores").first("total")).toBe(0);
    } finally {
      await env.DB.prepare("DROP TRIGGER reject_test_write").run();
    }
    expect((await post(sub)).status).toBe(201);
  });

  test("enforces the original SQL data constraints with a strict table", async () => {
    for (const values of [
      ["", 100, 1, 10], ["ABCDEFG", 100, 1, 10], ["ACE", -1, 1, 10],
      ["ACE", 1.5, 1, 10], ["ACE", 100, 0, 10], ["ACE", 100, 1.5, 10],
      ["ACE", 100, 1, 0], ["ACE", 100, 1, -5],
    ]) {
      await expect(env.DB.prepare("INSERT INTO scores (name, score, wave, duration, session_id) VALUES (?, ?, ?, ?, ?)")
        .bind(...values, crypto.randomUUID()).run()).rejects.toThrow();
    }
    expect(await env.DB.prepare("SELECT count(*) AS total FROM scores").first("total")).toBe(0);
  });

  test("fails safely if the signing secret is missing, including health status", async () => {
    const target = { ...env };
    Reflect.deleteProperty(target, "ANTICHEAT_SECRET");
    const response = await call("/api/live", undefined, target);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "error", version: APP_VERSION, database: { connected: true } });
    for (const path of ["/api/token", "/api/scores"]) {
      const response = await call(path, path === "/api/scores" ? { method: "POST", body: "{}" } : undefined, target);
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ error: "service unavailable" });
    }
  });

  test("rejects malformed JSON, absent bodies, and unexpected JSON types", async () => {
    for (const body of [undefined, "{", new Uint8Array([0xff])]) {
      const response = await call("/api/scores", { method: "POST", body });
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "invalid JSON" });
    }
    expect((await post(null)).status).toBe(403);
    expect((await post({ name: false })).status).toBe(403);
  });

  test("bounds both declared and streamed request bodies", async () => {
    const declared = await call("/api/scores", { method: "POST", headers: { "Content-Length": "4097" }, body: "{}" });
    expect(declared.status).toBe(413);
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"name":"'));
        controller.enqueue(new Uint8Array(4096).fill(65));
        controller.close();
      },
    });
    const request = { method: "POST", body, duplex: "half" as const };
    const streamed = await call("/api/scores", request);
    expect(streamed.status).toBe(413);
    expect(await streamed.json()).toEqual({ error: "request too large" });
  });

  test("routes static requests separately and rejects unknown APIs and methods", async () => {
    expect(await (await call("/index.html")).text()).toBe("static asset");
    expect((await call("/api/missing")).status).toBe(404);
    for (const [path, allow] of [["/api/live", "GET"], ["/api/token", "GET"], ["/api/scores", "GET, POST"]]) {
      const response = await call(path, { method: "DELETE" });
      expect(response.status).toBe(405);
      expect(response.headers.get("Allow")).toBe(allow);
    }
  });
});
