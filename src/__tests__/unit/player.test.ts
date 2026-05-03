import { describe, test, expect } from "vitest";
import { createPlayer, updatePlayer, hitPlayer, getEffectiveFireRate } from "@/game/player";
import { InputManager } from "@/game/input";
import { GAME_WIDTH, GAME_HEIGHT, TILE_SIZE } from "@/game/types";

// mock input that returns a fixed direction
function createMockInput(dir: { x: number; y: number }): InputManager {
  const input = new InputManager();
  // override getDirection
  input.getDirection = () => dir;
  return input;
}

describe("player", () => {
  test("createPlayer returns player at center with default values", () => {
    const p = createPlayer();
    expect(p.pos.x).toBe((GAME_WIDTH - TILE_SIZE) / 2);
    expect(p.pos.y).toBe((GAME_HEIGHT - TILE_SIZE) / 2);
    expect(p.lives).toBe(3);
    expect(p.alive).toBe(true);
    expect(p.fireCooldown).toBe(0);
    expect(p.invincibleTimer).toBe(0);
    expect(p.activePowerUps).toEqual([]);
  });

  test("updatePlayer moves player and returns fire direction when moving", () => {
    const p = createPlayer();
    const input = createMockInput({ x: 1, y: 0 });

    const fireDir = updatePlayer(p, input, 0.1);

    // should have moved right
    expect(p.pos.x).toBeGreaterThan((GAME_WIDTH - TILE_SIZE) / 2);
    // should fire on first move (cooldown was 0)
    expect(fireDir).not.toBeNull();
    expect(fireDir!.x).toBe(1);
    expect(fireDir!.y).toBe(0);
  });

  test("updatePlayer fires even when standing still", () => {
    const p = createPlayer();
    const input = createMockInput({ x: 0, y: 0 });

    // first call should fire (cooldown is 0)
    const fireDir = updatePlayer(p, input, 0.1);
    expect(fireDir).not.toBeNull();
    // should fire in default direction (down)
    expect(fireDir!.x).toBe(0);
    expect(fireDir!.y).toBe(1);
  });

  test("updatePlayer does not fire when on cooldown", () => {
    const p = createPlayer();
    p.fireCooldown = 1; // 1 second remaining
    const input = createMockInput({ x: 0, y: 1 });

    const fireDir = updatePlayer(p, input, 0.05);
    expect(fireDir).toBeNull();
  });

  test("updatePlayer returns null for dead player", () => {
    const p = createPlayer();
    p.alive = false;
    const input = createMockInput({ x: 1, y: 0 });

    const fireDir = updatePlayer(p, input, 0.1);
    expect(fireDir).toBeNull();
  });

  test("updatePlayer clamps player to game bounds", () => {
    const p = createPlayer();
    p.pos.x = GAME_WIDTH + 100;
    const input = createMockInput({ x: 1, y: 0 });

    updatePlayer(p, input, 0.01);
    expect(p.pos.x).toBeLessThanOrEqual(GAME_WIDTH - p.size);
  });

  test("getEffectiveFireRate applies moving bonus", () => {
    const p = createPlayer();
    const standingRate = getEffectiveFireRate(p, false);
    const movingRate = getEffectiveFireRate(p, true);
    expect(movingRate).toBeCloseTo(standingRate * 1.1);
  });

  test("getEffectiveFireRate applies rapidfire multiplier", () => {
    const p = createPlayer();
    p.activePowerUps = [{ kind: "rapidfire", remaining: 5 }];
    const baseRate = getEffectiveFireRate(p, false);
    expect(baseRate).toBe(p.fireRate * 2);
  });

  test("getEffectiveFireRate stacks moving + rapidfire", () => {
    const p = createPlayer();
    p.activePowerUps = [{ kind: "rapidfire", remaining: 5 }];
    const rate = getEffectiveFireRate(p, true);
    expect(rate).toBeCloseTo(p.fireRate * 1.1 * 2);
  });

  test("hitPlayer reduces lives and sets invincibility", () => {
    const p = createPlayer();
    expect(p.lives).toBe(3);

    const wasHit = hitPlayer(p);
    expect(wasHit).toBe(true);
    expect(p.lives).toBe(2);
    expect(p.alive).toBe(true);
    expect(p.invincibleTimer).toBeGreaterThan(0);
  });

  test("hitPlayer returns false when invincible", () => {
    const p = createPlayer();
    p.invincibleTimer = 1;

    const wasHit = hitPlayer(p);
    expect(wasHit).toBe(false);
    expect(p.lives).toBe(3);
  });

  test("hitPlayer kills player at 1 life", () => {
    const p = createPlayer();
    p.lives = 1;

    hitPlayer(p);
    expect(p.lives).toBe(0);
    expect(p.alive).toBe(false);
  });
});
