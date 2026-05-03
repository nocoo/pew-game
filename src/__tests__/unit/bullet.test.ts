import { describe, test, expect } from "vitest";
import { createBullet, updateBullets, pruneDeadBullets } from "@/game/bullet";
import { GAME_WIDTH } from "@/game/types";

describe("bullet", () => {
  test("createBullet creates bullet at entity center", () => {
    const b = createBullet({ x: 100, y: 100 }, { x: 1, y: 0 }, true);
    expect(b.alive).toBe(true);
    expect(b.fromPlayer).toBe(true);
    expect(b.pierce).toBe(false);
    expect(b.velocity.x).toBeGreaterThan(0);
    expect(b.velocity.y).toBe(0);
  });

  test("createBullet with pierce flag", () => {
    const b = createBullet({ x: 100, y: 100 }, { x: 1, y: 0 }, true, true);
    expect(b.pierce).toBe(true);
  });

  test("updateBullets moves bullets by velocity", () => {
    const b = createBullet({ x: 100, y: 100 }, { x: 1, y: 0 }, true);
    const startX = b.pos.x;

    updateBullets([b], 0.1);
    expect(b.pos.x).toBeGreaterThan(startX);
  });

  test("updateBullets marks out-of-bounds bullets as dead", () => {
    const b = createBullet({ x: 100, y: 100 }, { x: 1, y: 0 }, true);
    b.pos.x = GAME_WIDTH + 100;

    updateBullets([b], 0.1);
    expect(b.alive).toBe(false);
  });

  test("pruneDeadBullets removes dead bullets", () => {
    const b1 = createBullet({ x: 0, y: 0 }, { x: 1, y: 0 }, true);
    const b2 = createBullet({ x: 0, y: 0 }, { x: 0, y: 1 }, true);
    b1.alive = false;

    const result = pruneDeadBullets([b1, b2]);
    expect(result.length).toBe(1);
    expect(result[0]).toBe(b2);
  });
});
