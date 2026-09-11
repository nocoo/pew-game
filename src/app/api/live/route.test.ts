import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Database from "better-sqlite3";
import * as dbModule from "@/lib/db";
import { APP_VERSION } from "@/lib/version";
import { GET } from "./route";

function createMemoryDb(options: { withTable?: boolean; withRow?: boolean } = {}) {
  const { withTable = true, withRow = false } = options;
  const db = new Database(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  if (withTable) {
    db.exec(`
      CREATE TABLE scores (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        name      TEXT    NOT NULL CHECK(length(name) BETWEEN 1 AND 6),
        score     INTEGER NOT NULL CHECK(score >= 0),
        wave      INTEGER NOT NULL CHECK(wave >= 1),
        duration  REAL    NOT NULL CHECK(duration > 0),
        created   TEXT    NOT NULL DEFAULT (datetime('now'))
      )
    `);
    if (withRow) {
      db.prepare(
        "INSERT INTO scores (name, score, wave, duration) VALUES (?, ?, ?, ?)",
      ).run("HERO", 500, 4, 45.2);
    }
  }
  return db;
}

describe("GET /api/live", () => {
  let activeDbs: Database.Database[] = [];

  beforeEach(() => {
    activeDbs = [];
  });

  afterEach(() => {
    vi.restoreAllMocks();
    for (const db of activeDbs) {
      if (db.open) {
        db.close();
      }
    }
  });

  it("returns 200 with status ok when scores table is empty (healthy)", async () => {
    const memDb = createMemoryDb({ withTable: true, withRow: false });
    activeDbs.push(memDb);
    const getDbSpy = vi.spyOn(dbModule, "getDb").mockReturnValue(memDb);

    const res = await GET();

    expect(getDbSpy).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const json = await res.json();
    expect(json).toEqual({
      status: "ok",
      version: APP_VERSION,
      database: {
        connected: true,
      },
    });
  });

  it("returns 200 with status ok when scores table contains rows", async () => {
    const memDb = createMemoryDb({ withTable: true, withRow: true });
    activeDbs.push(memDb);
    const getDbSpy = vi.spyOn(dbModule, "getDb").mockReturnValue(memDb);

    const res = await GET();

    expect(getDbSpy).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const json = await res.json();
    expect(json).toEqual({
      status: "ok",
      version: APP_VERSION,
      database: {
        connected: true,
      },
    });
  });

  it("returns 503 with status error when scores table is missing", async () => {
    const memDb = createMemoryDb({ withTable: false });
    activeDbs.push(memDb);
    const getDbSpy = vi.spyOn(dbModule, "getDb").mockReturnValue(memDb);

    const res = await GET();

    expect(getDbSpy).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(503);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const json = await res.json();
    expect(json).toEqual({
      status: "error",
      version: APP_VERSION,
      database: {
        connected: false,
      },
    });
    // Ensure no internal details leaked
    expect(json).not.toHaveProperty("error");
  });

  it("returns 503 with status error when database connection is closed", async () => {
    const memDb = createMemoryDb({ withTable: true });
    memDb.close(); // Closed connection
    activeDbs.push(memDb);
    const getDbSpy = vi.spyOn(dbModule, "getDb").mockReturnValue(memDb);

    const res = await GET();

    expect(getDbSpy).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(503);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const json = await res.json();
    expect(json).toEqual({
      status: "error",
      version: APP_VERSION,
      database: {
        connected: false,
      },
    });
    expect(json).not.toHaveProperty("error");
  });

  it("returns 503 with status error when getDb throws on open", async () => {
    const getDbSpy = vi.spyOn(dbModule, "getDb").mockImplementation(() => {
      throw new Error("Sqlite disk I/O error or permission denied");
    });

    const res = await GET();

    expect(getDbSpy).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(503);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const json = await res.json();
    expect(json).toEqual({
      status: "error",
      version: APP_VERSION,
      database: {
        connected: false,
      },
    });
    // Verify no error message leaked to caller
    expect(JSON.stringify(json)).not.toContain("permission denied");
    expect(JSON.stringify(json)).not.toContain("disk I/O error");
  });
});
