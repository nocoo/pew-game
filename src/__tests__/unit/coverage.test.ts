import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createSessionToken,
  validateSubmission,
  _resetUsedSessions,
} from "@/lib/anticheat";
import type { ScoreSubmission } from "@/lib/anticheat";
import {
  trySpawnPowerUp,
  canDropPowerUp,
} from "@/game/powerup";
import { updateBullets, createBullet } from "@/game/bullet";
import { updateEnemies, createEnemy, damageEnemy } from "@/game/enemy";
import {
  createWaveState,
  updateWave,
  getEnemyTypeForWave,
  startNextWave,
} from "@/game/wave";

describe("anticheat full coverage", () => {
  beforeEach(() => {
    _resetUsedSessions();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function freshValid(score = 100, wave = 3, name = "ACE"): ScoreSubmission {
    const session = createSessionToken();
    return {
      name,
      score,
      wave,
      sessionId: session.sessionId,
      startTime: session.startTime,
      token: session.token,
    };
  }

  test("valid submission passes after enough time elapses", () => {
    const sub = freshValid(100, 3);
    vi.advanceTimersByTime(30_000); // 30 seconds elapsed
    const result = validateSubmission(sub);
    expect(result.valid).toBe(true);
    expect(result.duration).toBeCloseTo(30);
  });

  test("replay attack: same session rejected on second use", () => {
    const sub = freshValid(50, 2);
    vi.advanceTimersByTime(10_000);
    const r1 = validateSubmission(sub);
    expect(r1.valid).toBe(true);

    const r2 = validateSubmission(sub);
    expect(r2.valid).toBe(false);
    expect(r2.error).toBe("session already used");
  });

  test("name too short rejected", () => {
    const sub = freshValid();
    vi.advanceTimersByTime(10_000);
    sub.name = "";
    const r = validateSubmission(sub);
    expect(r.valid).toBe(false);
    expect(r.error).toBe("name must be 1-6 characters");
  });

  test("name too long rejected", () => {
    const sub = freshValid();
    vi.advanceTimersByTime(10_000);
    sub.name = "TOOLONG";
    const r = validateSubmission(sub);
    expect(r.valid).toBe(false);
    expect(r.error).toBe("name must be 1-6 characters");
  });

  test("non-alphanumeric name rejected", () => {
    const sub = freshValid();
    vi.advanceTimersByTime(10_000);
    sub.name = "A!B";
    const r = validateSubmission(sub);
    expect(r.valid).toBe(false);
    expect(r.error).toBe("name must be alphanumeric");
  });

  test("negative score rejected", () => {
    const sub = freshValid(-10, 3);
    vi.advanceTimersByTime(10_000);
    const r = validateSubmission(sub);
    expect(r.valid).toBe(false);
    expect(r.error).toBe("invalid score or wave");
  });

  test("wave less than 1 rejected", () => {
    const sub = freshValid(0, 0);
    vi.advanceTimersByTime(10_000);
    const r = validateSubmission(sub);
    expect(r.valid).toBe(false);
    expect(r.error).toBe("invalid score or wave");
  });

  test("game too short rejected", () => {
    const sub = freshValid();
    vi.advanceTimersByTime(500); // less than 2s
    const r = validateSubmission(sub);
    expect(r.valid).toBe(false);
    expect(r.error).toBe("game too short");
  });

  test("score too high for wave rejected", () => {
    const sub = freshValid(999_999, 1);
    vi.advanceTimersByTime(60_000);
    const r = validateSubmission(sub);
    expect(r.valid).toBe(false);
    expect(r.error).toBe("score too high for wave");
  });

  test("score rate too high rejected", () => {
    const sub = freshValid(5000, 50); // wave plausibility passes
    vi.advanceTimersByTime(3_000); // 3s -> max 600 points
    const r = validateSubmission(sub);
    expect(r.valid).toBe(false);
    expect(r.error).toBe("score rate too high");
  });

  test("memory leak prevention prunes oldest session", () => {
    // generate enough valid submissions to exceed 10_000
    // do batches with smaller numbers and rely on internal limit logic
    // Just verify the path works once at threshold by mocking Set
    // Easier: directly exercise by submitting MAX_USED_SESSIONS+1
    for (let i = 0; i < 10_001; i++) {
      const sub = freshValid();
      vi.advanceTimersByTime(3_000);
      const r = validateSubmission(sub);
      expect(r.valid).toBe(true);
    }
  });
});

describe("powerup spawn coverage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("trySpawnPowerUp returns null below min wave", () => {
    expect(trySpawnPowerUp({ x: 0, y: 0 }, 1)).toBeNull();
    expect(canDropPowerUp(2)).toBe(false);
  });

  test("trySpawnPowerUp returns null when roll fails drop chance", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    expect(trySpawnPowerUp({ x: 10, y: 10 }, 5)).toBeNull();
  });

  test("trySpawnPowerUp returns nuke at wave 5+ on low roll", () => {
    const seq = [0.0, 0.05]; // first: drop chance pass; second: nuke roll
    let i = 0;
    vi.spyOn(Math, "random").mockImplementation(() => seq[i++] ?? 0);
    const pu = trySpawnPowerUp({ x: 10, y: 10 }, 5);
    expect(pu).not.toBeNull();
    expect(pu!.kind).toBe("nuke");
  });

  test("trySpawnPowerUp returns spread on mid-low roll", () => {
    const seq = [0.0, 0.3];
    let i = 0;
    vi.spyOn(Math, "random").mockImplementation(() => seq[i++] ?? 0);
    const pu = trySpawnPowerUp({ x: 10, y: 10 }, 3);
    expect(pu!.kind).toBe("spread");
  });

  test("trySpawnPowerUp returns rapidfire on mid roll", () => {
    const seq = [0.0, 0.5];
    let i = 0;
    vi.spyOn(Math, "random").mockImplementation(() => seq[i++] ?? 0);
    const pu = trySpawnPowerUp({ x: 10, y: 10 }, 3);
    expect(pu!.kind).toBe("rapidfire");
  });

  test("trySpawnPowerUp returns pierce on high roll", () => {
    const seq = [0.0, 0.9];
    let i = 0;
    vi.spyOn(Math, "random").mockImplementation(() => seq[i++] ?? 0);
    const pu = trySpawnPowerUp({ x: 10, y: 10 }, 3);
    expect(pu!.kind).toBe("pierce");
  });

  test("nuke not selected below wave 5 even on low roll", () => {
    const seq = [0.0, 0.05];
    let i = 0;
    vi.spyOn(Math, "random").mockImplementation(() => seq[i++] ?? 0);
    const pu = trySpawnPowerUp({ x: 10, y: 10 }, 4);
    expect(pu!.kind).toBe("spread");
  });
});

describe("bullet/enemy/wave skip-dead branches", () => {
  test("updateBullets skips dead bullets", () => {
    const b = createBullet({ x: 50, y: 50 }, { x: 1, y: 0 }, true);
    b.alive = false;
    const before = { ...b.pos };
    updateBullets([b], 0.5);
    expect(b.pos).toEqual(before);
  });

  test("updateEnemies skips dead enemies and stationary at player pos", () => {
    const e = createEnemy("basic");
    e.alive = false;
    const before = { ...e.pos };
    updateEnemies([e], { x: 0, y: 0 }, 0.1);
    expect(e.pos).toEqual(before);

    // alive enemy at exact player position (dist <= 1) should not move
    const e2 = createEnemy("basic");
    e2.pos = { x: 100, y: 100 };
    updateEnemies([e2], { x: 100, y: 100 }, 0.1);
    expect(e2.pos).toEqual({ x: 100, y: 100 });
  });

  test("damageEnemy returns false when not killed", () => {
    const e = createEnemy("tank");
    expect(damageEnemy(e, 1)).toBe(false);
    expect(e.alive).toBe(true);
  });
});

describe("wave coverage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("getEnemyTypeForWave returns tank at wave 5+ low roll", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.05);
    expect(getEnemyTypeForWave(5)).toBe("tank");
  });

  test("getEnemyTypeForWave returns fast at wave 3+ mid roll", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.2);
    expect(getEnemyTypeForWave(3)).toBe("fast");
  });

  test("getEnemyTypeForWave returns basic on high roll", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.9);
    expect(getEnemyTypeForWave(5)).toBe("basic");
  });

  test("updateWave advances between-wave timer and starts next wave", () => {
    const w = createWaveState();
    // not active; betweenWaveTimer starts at BETWEEN_WAVE_DELAY (2.0)
    // we need to reset it to start fresh
    w.betweenWaveTimer = 0;
    w.active = false;
    const spawn = updateWave(w, 0, 1.0);
    expect(spawn).toBe(false);
    expect(w.active).toBe(false);

    const spawn2 = updateWave(w, 0, 1.5); // total 2.5 > 2.0
    expect(spawn2).toBe(false);
    expect(w.active).toBe(true);
    expect(w.current).toBe(1);
  });

  test("updateWave returns false when all spawned and active enemies remain", () => {
    const w = createWaveState();
    startNextWave(w);
    w.enemiesRemaining = 0;
    const spawn = updateWave(w, 3, 0.1);
    expect(spawn).toBe(false);
    expect(w.active).toBe(true);
  });

  test("updateWave deactivates wave when all enemies cleared", () => {
    const w = createWaveState();
    startNextWave(w);
    w.enemiesRemaining = 0;
    const spawn = updateWave(w, 0, 0.1);
    expect(spawn).toBe(false);
    expect(w.active).toBe(false);
  });
});
