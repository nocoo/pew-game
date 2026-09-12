import { createHmac } from "node:crypto";
import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { createSessionToken, validateSubmission } from "@/lib/anticheat";
import type { ScoreSubmission } from "@/lib/anticheat";

const SECRET = "unit-test-only-secret-never-used-in-production";
const START = Date.UTC(2026, 8, 1);

async function submission(overrides: Partial<ScoreSubmission> = {}): Promise<ScoreSubmission> {
  vi.mocked(Date.now).mockReturnValue(START);
  const session = await createSessionToken(SECRET);
  vi.mocked(Date.now).mockReturnValue(START + 30_000);
  return { ...session, name: "ACE", score: 100, wave: 3, ...overrides };
}

describe("stateless score validation", () => {
  beforeEach(() => { vi.spyOn(Date, "now").mockReturnValue(START); });
  afterEach(() => { vi.restoreAllMocks(); });

  test("creates independent random sessions with interoperable HMAC-SHA256 signatures", async () => {
    const a = await createSessionToken(SECRET);
    const b = await createSessionToken(SECRET);
    expect(a.sessionId).toMatch(/^[a-f0-9]{32}$/);
    expect(a.sessionId).not.toBe(b.sessionId);
    expect(a.startTime).toBe(START);
    expect(a.token).toBe(createHmac("sha256", SECRET).update(`${a.sessionId}:${START}`).digest("hex"));
  });

  test("normalizes names and does not consume sessions before D1 saves a score", async () => {
    const sub = await submission({ name: "  aCe9  " });
    const expected = { valid: true, duration: 30, submission: { ...sub, name: "ACE9" } };
    expect(await validateSubmission(sub, SECRET)).toEqual(expected);
    expect(await validateSubmission(sub, SECRET)).toEqual(expected);
  });

  test.each(["", "short"])("refuses an absent or weak signing secret: %j", async (secret) => {
    await expect(createSessionToken(secret)).rejects.toThrow("ANTICHEAT_SECRET");
  });

  test("rejects token, timestamp, session-id, and signing-key tampering", async () => {
    const sub = await submission();
    for (const changed of [
      { ...sub, token: sub.token[0] === "0" ? `1${sub.token.slice(1)}` : `0${sub.token.slice(1)}` },
      { ...sub, startTime: sub.startTime - 1000 },
      { ...sub, sessionId: "a".repeat(32) },
    ]) {
      expect(await validateSubmission(changed, SECRET)).toEqual({ valid: false, error: "invalid token" });
    }
    expect(await validateSubmission(sub, `${SECRET}-different`)).toEqual({ valid: false, error: "invalid token" });
  });

  test.each([null, undefined, [], "hello", 1, false])("rejects non-object JSON %j", async (value) => {
    expect(await validateSubmission(value, SECRET)).toEqual({ valid: false, error: "invalid submission" });
  });

  test("rejects invalid name types and ASCII name boundaries", async () => {
    const sub = await submission();
    for (const name of [null, undefined, 42, {}, []]) {
      expect(await validateSubmission({ ...sub, name }, SECRET)).toEqual({ valid: false, error: "invalid name" });
    }
    for (const name of ["", " ", "ABCDEFG"]) {
      expect(await validateSubmission({ ...sub, name }, SECRET)).toEqual({ valid: false, error: "name must be 1-6 characters" });
    }
    for (const name of ["A!B", "<img>", "ß", "中文", "A B"]) {
      expect(await validateSubmission({ ...sub, name }, SECRET)).toEqual({ valid: false, error: "name must be alphanumeric" });
    }
    for (const name of ["A", "ABC123"]) {
      expect((await validateSubmission({ ...sub, name }, SECRET)).valid).toBe(true);
    }
  });

  test("requires safe non-negative integer scores and positive integer waves", async () => {
    const sub = await submission();
    for (const field of ["score", "wave"] as const) {
      for (const value of [null, undefined, "3", true, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
        expect(await validateSubmission({ ...sub, [field]: value }, SECRET)).toEqual({ valid: false, error: "invalid score or wave" });
      }
    }
    expect(await validateSubmission({ ...sub, wave: 0 }, SECRET)).toEqual({ valid: false, error: "invalid score or wave" });
    expect((await validateSubmission({ ...sub, score: 0 }, SECRET)).valid).toBe(true);
  });

  test("requires exact token encoding and a safe signed timestamp", async () => {
    const sub = await submission();
    for (const [field, value] of [
      ["sessionId", null], ["sessionId", "short"], ["sessionId", "g".repeat(32)],
      ["token", 42], ["token", ""], ["token", "g".repeat(64)],
      ["startTime", null], ["startTime", "123"], ["startTime", -1],
      ["startTime", 1.5], ["startTime", NaN], ["startTime", Infinity],
    ]) {
      expect(await validateSubmission({ ...sub, [String(field)]: value }, SECRET)).toEqual({ valid: false, error: "invalid token" });
    }
  });

  test("rejects games shorter than two seconds and future start times", async () => {
    const sub = await submission();
    for (const elapsed of [-1000, 0, 1999]) {
      vi.mocked(Date.now).mockReturnValue(START + elapsed);
      expect(await validateSubmission(sub, SECRET)).toEqual({ valid: false, error: "game too short" });
    }
    vi.mocked(Date.now).mockReturnValue(START + 2000);
    expect((await validateSubmission(sub, SECRET)).valid).toBe(true);
  });

  test.each([[1, 360], [2, 855], [3, 1485], [5, 3150]])("preserves the score ceiling at wave %i", async (wave, maximum) => {
    const sub = await submission({ wave, score: maximum });
    expect((await validateSubmission(sub, SECRET)).valid).toBe(true);
    expect(await validateSubmission({ ...sub, score: maximum + 1 }, SECRET)).toEqual({ valid: false, error: "score too high for wave" });
  });

  test("enforces the rate ceiling and handles enormous wave numbers in constant time", async () => {
    const sub = await submission({ wave: Number.MAX_SAFE_INTEGER, score: 6000 });
    expect((await validateSubmission(sub, SECRET)).valid).toBe(true);
    expect(await validateSubmission({ ...sub, score: 6001 }, SECRET)).toEqual({ valid: false, error: "score rate too high" });
  });
});
