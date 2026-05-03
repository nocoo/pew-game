import { describe, test, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";

describe("database", () => {
  let db: Database.Database;

  beforeEach(() => {
    // use in-memory DB for test isolation — no file cleanup needed
    db = new Database(":memory:");
    db.exec("PRAGMA foreign_keys = ON");
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
    db.exec("CREATE INDEX idx_scores_score ON scores(score DESC)");
  });

  afterEach(() => {
    db.close();
  });

  test("can insert and retrieve a score", () => {
    const stmt = db.prepare(
      "INSERT INTO scores (name, score, wave, duration) VALUES (?, ?, ?, ?)",
    );
    stmt.run("ACE", 100, 3, 30.5);

    const rows = db.prepare("SELECT * FROM scores ORDER BY score DESC").all() as {
      name: string;
      score: number;
      wave: number;
    }[];
    expect(rows.length).toBe(1);
    expect(rows[0].name).toBe("ACE");
    expect(rows[0].score).toBe(100);
    expect(rows[0].wave).toBe(3);
  });

  test("scores are ordered by score descending", () => {
    const stmt = db.prepare(
      "INSERT INTO scores (name, score, wave, duration) VALUES (?, ?, ?, ?)",
    );
    stmt.run("LOW", 50, 2, 20);
    stmt.run("HIGH", 200, 5, 60);
    stmt.run("MID", 100, 3, 40);

    const rows = db
      .prepare("SELECT name, score FROM scores ORDER BY score DESC LIMIT 10")
      .all() as { name: string; score: number }[];
    expect(rows[0].name).toBe("HIGH");
    expect(rows[1].name).toBe("MID");
    expect(rows[2].name).toBe("LOW");
  });

  test("name must be 1-6 characters", () => {
    const stmt = db.prepare(
      "INSERT INTO scores (name, score, wave, duration) VALUES (?, ?, ?, ?)",
    );

    expect(() => stmt.run("", 100, 1, 10)).toThrow();
    expect(() => stmt.run("ABCDEFG", 100, 1, 10)).toThrow();
    expect(() => stmt.run("A", 100, 1, 10)).not.toThrow();
    expect(() => stmt.run("ABCDEF", 100, 1, 10)).not.toThrow();
  });

  test("score must be non-negative", () => {
    const stmt = db.prepare(
      "INSERT INTO scores (name, score, wave, duration) VALUES (?, ?, ?, ?)",
    );
    expect(() => stmt.run("ACE", -1, 1, 10)).toThrow();
  });

  test("wave must be at least 1", () => {
    const stmt = db.prepare(
      "INSERT INTO scores (name, score, wave, duration) VALUES (?, ?, ?, ?)",
    );
    expect(() => stmt.run("ACE", 100, 0, 10)).toThrow();
  });

  test("duration must be positive", () => {
    const stmt = db.prepare(
      "INSERT INTO scores (name, score, wave, duration) VALUES (?, ?, ?, ?)",
    );
    expect(() => stmt.run("ACE", 100, 1, 0)).toThrow();
    expect(() => stmt.run("ACE", 100, 1, -5)).toThrow();
  });

  test("top 10 limit works correctly", () => {
    const stmt = db.prepare(
      "INSERT INTO scores (name, score, wave, duration) VALUES (?, ?, ?, ?)",
    );
    for (let i = 0; i < 15; i++) {
      stmt.run("PLR", i * 10, 1, 10);
    }

    const rows = db
      .prepare("SELECT * FROM scores ORDER BY score DESC LIMIT 10")
      .all() as { score: number }[];
    expect(rows.length).toBe(10);
    expect(rows[0].score).toBe(140); // highest
    expect(rows[9].score).toBe(50); // 10th highest
  });
});
